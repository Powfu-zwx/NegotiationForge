"""
分析服务。
负责调度异步分析任务，将 AnalysisAgent 的输出持久化到数据库。
由 negotiation.py 的 BackgroundTasks 调用，不阻塞主请求。
"""
import json
import logging
import re
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import AsyncSessionLocal
from app.llm.base import LLMProviderError
from app.models.scenario import Scenario
from app.models.session import (
    AnalysisResult,
    AnalysisResultORM,
    SummaryContent,
    SummaryORM,
    SessionState,
    TurningPointSummary,
)
from app.services.analysis_agent import run_round_analysis, run_summary
from app.services.scenario_loader import load_scenario
from app.services.session_manager import get_session


logger = logging.getLogger(__name__)
_CJK_PATTERN = re.compile(r"[\u3400-\u9FFF]")


# ---------------------------------------------------------------------------
# 后台任务：轮次分析
# ---------------------------------------------------------------------------

async def background_analyze_round(
    session_id: str,
    round_num: int,
) -> None:
    """
    后台任务入口，由 BackgroundTasks 调用。
    独立创建数据库会话，不与主请求共享连接。
    """
    async with AsyncSessionLocal() as db:
        try:
            session = await get_session(db, session_id)
            if session is None:
                return

            scenario = load_scenario(session.scenario_id)

            result = await run_round_analysis(session, scenario, round_num)

            await _save_analysis_result(db, result)
        except Exception:
            # 后台任务失败不影响主流程，静默处理
            pass


async def _save_analysis_result(
    db: AsyncSession,
    result: AnalysisResult,
) -> None:
    orm = AnalysisResultORM(
        id=str(uuid.uuid4()),
        session_id=result.session_id,
        round=result.round,
        is_turning_point=result.is_turning_point,
        turning_reason=result.turning_reason,
        leverage=result.scores.leverage,
        info_advantage=result.scores.info_advantage,
        relationship=result.scores.relationship,
        agreement_prob=result.scores.agreement_prob,
        satisfaction=result.scores.satisfaction,
    )
    db.add(orm)
    await db.commit()


# ---------------------------------------------------------------------------
# 前台调用：复盘生成（由前端主动触发，非后台任务）
# ---------------------------------------------------------------------------

async def generate_and_save_summary(
    db: AsyncSession,
    session: SessionState,
    scenario: Scenario,
) -> SummaryContent:
    """
    生成复盘并持久化。
    若该会话已有复盘记录，先删除旧记录再写入新记录。
    """
    # 检查是否已有复盘
    existing = await db.execute(
        select(SummaryORM).where(SummaryORM.session_id == session.session_id)
    )
    existing_orm = existing.scalar_one_or_none()
    if existing_orm is not None:
        await db.delete(existing_orm)
        await db.flush()

    try:
        summary = await run_summary(session, scenario)
    except LLMProviderError:
        logger.warning(
            "LLM summary generation failed for session %s; using fallback summary.",
            session.session_id,
            exc_info=True,
        )
        summary = await _build_fallback_summary(db, session, scenario)
    except Exception:
        logger.warning(
            "Unexpected summary generation failure for session %s; using fallback summary.",
            session.session_id,
            exc_info=True,
        )
        summary = await _build_fallback_summary(db, session, scenario)

    orm = SummaryORM(
        id=str(uuid.uuid4()),
        session_id=session.session_id,
        content_json=json.dumps(summary.model_dump(), ensure_ascii=False),
    )
    db.add(orm)
    await db.commit()

    return summary


async def _build_fallback_summary(
    db: AsyncSession,
    session: SessionState,
    scenario: Scenario,
) -> SummaryContent:
    analysis_results = await get_analysis_results(db, session.session_id)
    language = _detect_summary_language(session, scenario)
    round_messages = _collect_round_messages(session)
    turning_points = _build_fallback_turning_points(
        session,
        analysis_results,
        round_messages,
        language,
    )

    total_rounds = session.opponent_state.round_count
    concession_count = len(session.opponent_state.concession_history)
    latest_analysis = analysis_results[-1] if analysis_results else None
    latest_agreement = latest_analysis.scores.agreement_prob if latest_analysis else None

    if language == "en":
        status_label = "an agreement" if session.status.value == "agreement" else "a breakdown"
        strategy_analysis = (
            "A rule-based recap was used because the upstream model was temporarily unavailable. "
            f"This negotiation ran for {total_rounds} rounds and ended in {status_label}. "
            f"You created {len(turning_points)} key swing moments"
            + (
                f" and pushed the counterpart into {concession_count} recorded concessions."
                if concession_count > 0
                else "."
            )
            + (
                f" The latest agreement outlook was about {latest_agreement:.1f}/10."
                if latest_agreement is not None
                else ""
            )
        )
        improvement_suggestions = [
            "Lock down budget range, decision timing, and exchange conditions in the first two rounds.",
            "Treat every concession as a trade: ask for a concrete return before moving your position.",
            (
                "When rapport or patience drops, switch from pressure to probing or face-saving language before pushing numbers again."
                if session.status.value == "breakdown"
                else "As the deal nears closure, restate agreed points and next steps to prevent a last-round reversal."
            ),
        ]
        final_verdict = (
            "Solid outcome: you preserved momentum at the key rounds and converted it into an agreement."
            if session.status.value == "agreement"
            else "Weak outcome: the gap was not narrowed at the key rounds, and the negotiation broke down under accumulated pressure."
        )
    else:
        status_label = "达成协议" if session.status.value == "agreement" else "谈判破裂"
        strategy_analysis = (
            "由于上游模型服务暂时不可用，本次复盘采用规则化兜底生成。"
            f"本次谈判共进行了 {total_rounds} 轮，最终结果为{status_label}。"
            f"你在过程中形成了 {len(turning_points)} 个关键转折"
            + (
                f"，并推动对手出现了 {concession_count} 次记录在案的让步。"
                if concession_count > 0
                else "。"
            )
            + (
                f" 末轮达成概率约为 {latest_agreement:.1f}/10。"
                if latest_agreement is not None
                else ""
            )
        )
        improvement_suggestions = [
            "在前 2 轮尽早确认预算区间、决策时点和可交换条件，避免后程被动。",
            "每次让步都要求等价交换，并明确让对方给出可兑现的回报条件。",
            (
                "当关系温度或耐心明显下滑时，先用试探或留面策略止损，再推进核心诉求。"
                if session.status.value == "breakdown"
                else "接近收尾时主动复述双方已达成的一致项，减少最后一轮反复。"
            ),
        ]
        final_verdict = (
            "结果较好：你在关键轮次稳住了推进节奏，并最终把谈判收束到协议。"
            if session.status.value == "agreement"
            else "结果偏弱：关键轮次未能有效压缩分歧，谈判最终在压力累积后破裂。"
        )

    return SummaryContent(
        turning_points=turning_points,
        strategy_analysis=strategy_analysis,
        improvement_suggestions=improvement_suggestions,
        final_verdict=final_verdict,
    )


def _build_fallback_turning_points(
    session: SessionState,
    analysis_results: list[AnalysisResult],
    round_messages: dict[int, dict[str, str]],
    language: str,
) -> list[TurningPointSummary]:
    if not round_messages:
        return []

    result_by_round = {result.round: result for result in analysis_results}
    concession_by_round = {
        concession.round: concession for concession in session.opponent_state.concession_history
    }
    candidate_rounds = [
        result.round
        for result in analysis_results
        if result.is_turning_point and result.round in round_messages
    ]

    for round_num in concession_by_round:
        if round_num in round_messages and round_num not in candidate_rounds:
            candidate_rounds.append(round_num)

    available_rounds = sorted(round_messages.keys())
    first_round = available_rounds[0]
    last_round = available_rounds[-1]

    if last_round not in candidate_rounds:
        candidate_rounds.append(last_round)

    if len(candidate_rounds) < 2 and first_round not in candidate_rounds:
        candidate_rounds.insert(0, first_round)

    selected_rounds = _limit_turning_point_rounds(sorted(set(candidate_rounds)), limit=3)
    summaries: list[TurningPointSummary] = []

    for round_num in selected_rounds:
        messages = round_messages.get(round_num, {})
        player_move = messages.get("player", "")
        opponent_reaction = messages.get("opponent", "")
        analysis = result_by_round.get(round_num)
        concession = concession_by_round.get(round_num)

        if analysis and analysis.turning_reason:
            reason = analysis.turning_reason
        elif concession is not None:
            if language == "en":
                reason = (
                    f"The counterpart moved from {concession.from_value} to {concession.to_value}, "
                    "which reset the bargaining range."
                )
            else:
                reason = (
                    f"该轮出现实质让步，对手从 {concession.from_value} 调整到 {concession.to_value}，"
                    "重新定义了谈判区间。"
                )
        elif round_num == last_round:
            if language == "en":
                reason = (
                    "The final round determined whether the discussion could close cleanly."
                    if session.status.value == "agreement"
                    else "The final round failed to close the remaining gap and locked in the breakdown."
                )
            else:
                reason = (
                    "最后一轮完成了收束，双方在这一轮接受了同一结果框架。"
                    if session.status.value == "agreement"
                    else "最后一轮未能缩小剩余分歧，谈判在这一轮后正式破裂。"
                )
        elif analysis and analysis.scores.agreement_prob >= 7:
            reason = (
                "This round materially improved the odds of agreement and moved the negotiation into a closing window."
                if language == "en"
                else "该轮显著提升了达成概率，把谈判推进到了可收束区间。"
            )
        elif analysis and analysis.scores.relationship <= 4:
            reason = (
                "This round cooled the relationship and increased resistance in the later exchange."
                if language == "en"
                else "该轮让关系温度明显下滑，后续推进阻力随之增大。"
            )
        else:
            reason = (
                "This round changed the negotiation rhythm and the expectations on both sides."
                if language == "en"
                else "该轮改变了谈判节奏和双方预期，是后续走向的分水岭。"
            )

        summaries.append(
            TurningPointSummary(
                round=round_num,
                reason=reason,
                player_move=_condense_message(player_move, language),
                opponent_reaction=_condense_message(opponent_reaction, language),
            )
        )

    return summaries


def _collect_round_messages(session: SessionState) -> dict[int, dict[str, str]]:
    round_messages: dict[int, dict[str, str]] = {}

    for message in session.history:
        if message.role not in {"player", "opponent"}:
            continue

        bucket = round_messages.setdefault(message.round, {"player": "", "opponent": ""})
        if not bucket[message.role]:
            bucket[message.role] = " ".join(message.content.split())

    return round_messages


def _limit_turning_point_rounds(rounds: list[int], limit: int) -> list[int]:
    if len(rounds) <= limit:
        return rounds

    if limit <= 1:
        return [rounds[-1]]

    if limit == 2:
        return [rounds[0], rounds[-1]]

    middle_index = len(rounds) // 2
    return [rounds[0], rounds[middle_index], rounds[-1]]


def _detect_summary_language(session: SessionState, scenario: Scenario) -> str:
    samples = [
        getattr(scenario.metadata, "title", ""),
        getattr(scenario.player, "objective", ""),
        *(message.content for message in session.history[:6]),
    ]
    joined = " ".join(part for part in samples if part)
    return "zh" if _CJK_PATTERN.search(joined) else "en"


def _condense_message(message: str, language: str, max_length: int = 90) -> str:
    cleaned = " ".join(message.split())
    if not cleaned:
        return (
            "No message was recorded for this round."
            if language == "en"
            else "该轮未记录到对应发言。"
        )

    if len(cleaned) <= max_length:
        return cleaned

    return f"{cleaned[:max_length].rstrip()}..."


# ---------------------------------------------------------------------------
# 读取：供 GET 端点使用
# ---------------------------------------------------------------------------

async def get_analysis_results(
    db: AsyncSession,
    session_id: str,
) -> list[AnalysisResult]:
    """
    读取某会话所有轮次的分析结果，按轮次升序排列。
    """
    result = await db.execute(
        select(AnalysisResultORM)
        .where(AnalysisResultORM.session_id == session_id)
        .order_by(AnalysisResultORM.round)
    )
    rows = result.scalars().all()

    from app.models.session import SituationScores
    return [
        AnalysisResult(
            session_id=row.session_id,
            round=row.round,
            is_turning_point=row.is_turning_point,
            turning_reason=row.turning_reason,
            scores=SituationScores(
                leverage=row.leverage,
                info_advantage=row.info_advantage,
                relationship=row.relationship,
                agreement_prob=row.agreement_prob,
                satisfaction=row.satisfaction,
            ),
        )
        for row in rows
    ]


async def get_summary(
    db: AsyncSession,
    session_id: str,
) -> SummaryContent | None:
    """
    读取某会话的复盘内容，不存在时返回 None。
    """
    result = await db.execute(
        select(SummaryORM).where(SummaryORM.session_id == session_id)
    )
    orm = result.scalar_one_or_none()

    if orm is None:
        return None

    from app.models.session import SummaryContent, TurningPointSummary
    data = json.loads(orm.content_json)

    return SummaryContent(
        turning_points=[
            TurningPointSummary(**tp) for tp in data.get("turning_points", [])
        ],
        strategy_analysis=data.get("strategy_analysis", ""),
        improvement_suggestions=data.get("improvement_suggestions", []),
        final_verdict=data.get("final_verdict", ""),
    )
