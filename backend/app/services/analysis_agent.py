"""
分析 Agent。
负责对每轮对话进行态势评分、识别关键转折点，以及在谈判结束后生成结构化复盘。
与对手 Agent 完全解耦，使用独立的 LLM 调用链。
"""
import json
import re

from app.llm.base import Message as LLMMessage
from app.llm.factory import get_llm_provider
from app.models.scenario import Scenario
from app.models.session import (
    AnalysisResult,
    SituationScores,
    SummaryContent,
    TurningPointSummary,
    SessionState,
)


# ---------------------------------------------------------------------------
# 主入口
# ---------------------------------------------------------------------------

async def run_round_analysis(
    session: SessionState,
    scenario: Scenario,
    round_num: int,
) -> AnalysisResult:
    """
    对指定轮次进行分析：
    1. 识别该轮是否为关键转折点
    2. 输出五维态势评分
    返回 AnalysisResult，由调用方负责持久化。
    """
    raw = await _call_analysis_llm(session, scenario, round_num)
    return _parse_analysis_result(raw, session.session_id, round_num)


async def run_summary(
    session: SessionState,
    scenario: Scenario,
) -> SummaryContent:
    """
    谈判结束后生成结构化复盘。
    返回 SummaryContent，由调用方负责持久化。
    """
    raw = await _call_summary_llm(session, scenario)
    return _parse_summary(raw)


# ---------------------------------------------------------------------------
# 轮次分析：LLM 调用
# ---------------------------------------------------------------------------

async def _call_analysis_llm(
    session: SessionState,
    scenario: Scenario,
    round_num: int,
) -> str:
    system_prompt = _build_analysis_system_prompt()
    user_prompt = _build_analysis_user_prompt(session, scenario, round_num)

    llm_messages = [
        LLMMessage(role="system", content=system_prompt),
        LLMMessage(role="user", content=user_prompt),
    ]

    client = get_llm_provider()
    response = await client.chat(messages=llm_messages, temperature=0.2)
    return response.content


def _build_analysis_system_prompt() -> str:
    return (
        "你是一位专业的谈判态势分析师。"
        "你的任务是分析谈判对话，识别关键转折点，并给出客观的多维度评分。"
        "你必须严格按照 JSON 格式输出，不得包含任何额外文字或 Markdown 标记。"
    )


def _build_analysis_user_prompt(
    session: SessionState,
    scenario: Scenario,
    round_num: int,
) -> str:
    relevant_history = [m for m in session.history if m.round <= round_num]
    history_text = "\n".join(
        f"[第{m.round}轮 {'用户' if m.role == 'player' else '对手'}] {m.content}"
        for m in relevant_history
    )

    current_round_msgs = [m for m in session.history if m.round == round_num]
    current_round_text = "\n".join(
        f"{'用户' if m.role == 'player' else '对手'}：{m.content}"
        for m in current_round_msgs
    )

    opponent_state = session.opponent_state

    return f"""
## 谈判场景
- 场景名称：{scenario.metadata.title}
- 用户目标：{scenario.player.objective}
- 对手角色：{scenario.opponent.name}，{scenario.opponent.role}

## 当前对手内部状态
- 满意度：{opponent_state.satisfaction}/100
- 耐心值：{opponent_state.patience}/100
- 当前策略：{opponent_state.current_strategy}
- 谈判阶段：{opponent_state.current_phase}

## 完整对话历史
{history_text}

## 本轮对话（第 {round_num} 轮）
{current_round_text}

## 分析任务
请基于以上信息完成分析，输出以下 JSON 结构，不得有任何额外内容：

{{
  "is_turning_point": true 或 false,
  "turning_reason": "若为关键转折点，用一句话说明原因；否则为 null",
  "scores": {{
    "leverage": 0.0到10.0之间的浮点数（用户的当前议价力，10为完全主导），
    "info_advantage": 0.0到10.0之间的浮点数（用户的信息优势，10为信息完全不对称且有利于用户），
    "relationship": 0.0到10.0之间的浮点数（双方关系温度，10为高度信任友好），
    "agreement_prob": 0.0到10.0之间的浮点数（达成协议的当前概率，10为必然达成），
    "satisfaction": 0.0到10.0之间的浮点数（双方满意度均值，10为双赢）
  }}
}}

关键转折点判定标准（满足任意一条即为 true）：
- 任一方做出重大让步（超出之前区间的 20% 以上）
- 策略发生明显切换（如从施压转为示弱）
- 情绪出现突变（如明显表现出愤怒、妥协或热情）
- 引入新的谈判筹码或信息
- 发出最后通牒或明确的截止条件
""".strip()


# ---------------------------------------------------------------------------
# 复盘摘要：LLM 调用
# ---------------------------------------------------------------------------

async def _call_summary_llm(
    session: SessionState,
    scenario: Scenario,
) -> str:
    system_prompt = _build_summary_system_prompt()
    user_prompt = _build_summary_user_prompt(session, scenario)

    llm_messages = [
        LLMMessage(role="system", content=system_prompt),
        LLMMessage(role="user", content=user_prompt),
    ]

    client = get_llm_provider()
    response = await client.chat(
        messages=llm_messages,
        temperature=0.4,
        max_tokens=2000,
    )
    return response.content


def _build_summary_system_prompt() -> str:
    return (
        "你是一位经验丰富的谈判教练，擅长复盘分析和提供改进建议。"
        "你的分析客观、犀利、具有可操作性。"
        "你必须严格按照 JSON 格式输出，不得包含任何额外文字或 Markdown 标记。"
    )


def _build_summary_user_prompt(
    session: SessionState,
    scenario: Scenario,
) -> str:
    history_text = "\n".join(
        f"[第{m.round}轮 {'用户' if m.role == 'player' else '对手'}] {m.content}"
        for m in session.history
    )

    final_status = session.status.value
    total_rounds = session.opponent_state.round_count
    concessions = session.opponent_state.concession_history

    concession_text = (
        "\n".join(
            f"- 第{c.round}轮：{c.from_value} → {c.to_value}（触发原因：{c.trigger}）"
            for c in concessions
        )
        if concessions
        else "无记录让步"
    )

    return f"""
## 谈判场景
- 场景名称：{scenario.metadata.title}
- 用户目标：{scenario.player.objective}
- 对手：{scenario.opponent.name}，{scenario.opponent.role}

## 谈判结果
- 最终状态：{final_status}（agreement = 达成协议 / breakdown = 谈判破裂）
- 总轮次：{total_rounds}
- 对手让步记录：
{concession_text}

## 完整对话记录
{history_text}

## 复盘任务
请基于以上信息生成结构化复盘，输出以下 JSON，不得有任何额外内容：

{{
  "turning_points": [
    {{
      "round": 关键转折点所在轮次（整数）,
      "reason": "该轮为何是转折点（一句话）",
      "player_move": "该轮用户说了什么（简洁概括）",
      "opponent_reaction": "对手如何反应（简洁概括）"
    }}
  ],
  "strategy_analysis": "对用户整体策略得失的分析，200字以内，指出哪些做法有效、哪些失误",
  "improvement_suggestions": [
    "第一条具体改进建议",
    "第二条具体改进建议",
    "第三条具体改进建议"
  ],
  "final_verdict": "一句话评价此次谈判表现，需点明结果好坏和核心原因"
}}

turning_points 数组应包含 2~4 个最关键的转折点，并按轮次升序排列。
improvement_suggestions 需具体可操作，不得是泛泛而谈的建议。
""".strip()


# ---------------------------------------------------------------------------
# JSON 解析
# ---------------------------------------------------------------------------

def _parse_json(raw: str) -> dict:
    """
    解析 LLM 输出的 JSON，容错处理 Markdown 代码块标记。
    与 opponent_agent 中 _parse_delta 采用相同策略。
    """
    text = raw.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {}


def _parse_analysis_result(
    raw: str,
    session_id: str,
    round_num: int,
) -> AnalysisResult:
    data = _parse_json(raw)

    if not data:
        return AnalysisResult(
            session_id=session_id,
            round=round_num,
            is_turning_point=False,
            turning_reason=None,
            scores=SituationScores(
                leverage=5.0,
                info_advantage=5.0,
                relationship=5.0,
                agreement_prob=5.0,
                satisfaction=5.0,
            ),
        )

    scores_data = data.get("scores", {})
    scores = SituationScores(
        leverage=float(scores_data.get("leverage", 5.0)),
        info_advantage=float(scores_data.get("info_advantage", 5.0)),
        relationship=float(scores_data.get("relationship", 5.0)),
        agreement_prob=float(scores_data.get("agreement_prob", 5.0)),
        satisfaction=float(scores_data.get("satisfaction", 5.0)),
    )

    return AnalysisResult(
        session_id=session_id,
        round=round_num,
        is_turning_point=bool(data.get("is_turning_point", False)),
        turning_reason=data.get("turning_reason"),
        scores=scores,
    )


def _parse_summary(raw: str) -> SummaryContent:
    data = _parse_json(raw)

    if not data:
        return SummaryContent(
            turning_points=[],
            strategy_analysis="复盘生成失败，请重试。",
            improvement_suggestions=["请重新触发复盘生成。"],
            final_verdict="数据解析异常。",
        )

    turning_points = [
        TurningPointSummary(
            round=tp.get("round", 0),
            reason=tp.get("reason", ""),
            player_move=tp.get("player_move", ""),
            opponent_reaction=tp.get("opponent_reaction", ""),
        )
        for tp in data.get("turning_points", [])
    ]

    return SummaryContent(
        turning_points=turning_points,
        strategy_analysis=data.get("strategy_analysis", ""),
        improvement_suggestions=data.get("improvement_suggestions", []),
        final_verdict=data.get("final_verdict", ""),
    )