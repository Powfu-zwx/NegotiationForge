"""
会话管理器。
负责创建会话、持久化状态、管理多轮上下文。
"""
import json
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.fork_tree import ForkTree
from app.models.scenario import Scenario
from app.models.session import (
    Concession,
    Message,
    NegotiationPhase,
    NegotiationStrategy,
    OpponentState,
    SessionORM,
    SessionState,
    SessionStatus,
)


# ---------------------------------------------------------------------------
# 常量
# ---------------------------------------------------------------------------

# 每轮对话后 patience 的基础衰减量
_PATIENCE_BASE_DECAY = 4

# 上下文窗口保留的最大消息条数（防止 token 超限）
_MAX_HISTORY_IN_CONTEXT = 20


# ---------------------------------------------------------------------------
# 创建会话
# ---------------------------------------------------------------------------

async def create_session(
    db: AsyncSession,
    scenario: Scenario,
) -> SessionState:
    """
    根据场景初始化一个新会话，持久化到数据库，返回 SessionState。
    """
    init = scenario.opponent.initial_state

    opponent_state = OpponentState(
        satisfaction=init.satisfaction,
        patience=init.patience,
        rapport=50,
        current_strategy=NegotiationStrategy(init.current_strategy.value),
        strategy_locked=False,
        disclosed_info=list(init.disclosed_info),
        detected_player_cards=[],
        concession_history=[],
        last_concession_round=0,
        current_phase=NegotiationPhase.opening,
        round_count=0,
    )

    session_state = SessionState(
        session_id=str(uuid.uuid4()),
        scenario_id=scenario.scenario_id,
        opponent_state=opponent_state,
        history=[],
        status=SessionStatus.active,
    )

    orm = SessionORM(
        id=session_state.session_id,
        scenario_id=session_state.scenario_id,
        state_json=opponent_state.model_dump_json(),
        history_json="[]",
        status=session_state.status.value,
        fork_tree_status=session_state.fork_tree_status,
        fork_tree_data=session_state.fork_tree_data,
        fork_tree_created_at=session_state.fork_tree_created_at,
        fork_tree_updated_at=session_state.fork_tree_updated_at,
    )
    db.add(orm)
    await db.commit()

    return session_state


# ---------------------------------------------------------------------------
# 读取会话
# ---------------------------------------------------------------------------

async def get_session(
    db: AsyncSession,
    session_id: str,
) -> SessionState | None:
    """
    从数据库读取会话，反序列化为 SessionState。
    若不存在返回 None。
    """
    result = await db.execute(
        select(SessionORM).where(SessionORM.id == session_id)
    )
    orm = result.scalar_one_or_none()

    if orm is None:
        return None

    opponent_state = OpponentState.model_validate_json(orm.state_json)
    history_raw = json.loads(orm.history_json)
    history = [Message.model_validate(m) for m in history_raw]

    return SessionState(
        session_id=orm.id,
        scenario_id=orm.scenario_id,
        opponent_state=opponent_state,
        history=history,
        status=SessionStatus(orm.status),
        fork_tree_status=orm.fork_tree_status or "pending",
        fork_tree_data=orm.fork_tree_data,
        fork_tree_created_at=orm.fork_tree_created_at,
        fork_tree_updated_at=orm.fork_tree_updated_at,
    )


# ---------------------------------------------------------------------------
# 添加消息
# ---------------------------------------------------------------------------

def append_message(
    session: SessionState,
    role: str,
    content: str,
) -> Message:
    """
    向会话历史追加一条消息，返回该消息对象。
    role 取值：player | opponent
    """
    msg = Message(
        round=session.opponent_state.round_count,
        role=role,
        content=content,
        timestamp=datetime.now(timezone.utc),
    )
    session.history.append(msg)
    return msg


# ---------------------------------------------------------------------------
# 状态更新
# ---------------------------------------------------------------------------

def apply_state_delta(
    session: SessionState,
    delta: dict,
) -> None:
    """
    将状态更新 Agent 输出的 delta JSON 应用到当前状态。
    代码层处理：patience 基础衰减、round_count 递增、phase 推进。
    LLM 层处理：satisfaction/rapport/strategy 等语义变化。
    """
    state = session.opponent_state

    # --- 代码层：固定逻辑 ---
    state.round_count += 1
    state.patience = max(0, state.patience - _PATIENCE_BASE_DECAY)
    state.strategy_locked = False  # 每轮结束后默认解锁，除非 delta 重新锁定

    # --- LLM 层：应用 delta ---
    if "satisfaction_delta" in delta:
        state.satisfaction = _clamp(
            state.satisfaction + delta["satisfaction_delta"], 0, 100
        )

    if "patience_delta" in delta:
        state.patience = _clamp(
            state.patience + delta["patience_delta"], 0, 100
        )

    if "rapport_delta" in delta:
        state.rapport = _clamp(
            state.rapport + delta["rapport_delta"], 0, 100
        )

    if "strategy" in delta and delta["strategy"]:
        try:
            state.current_strategy = NegotiationStrategy(delta["strategy"])
        except ValueError:
            pass  # 非法策略名时保持原策略

    if "strategy_locked" in delta:
        state.strategy_locked = bool(delta["strategy_locked"])

    if "new_disclosed_info" in delta:
        for info in delta["new_disclosed_info"]:
            if info not in state.disclosed_info:
                state.disclosed_info.append(info)

    if "detected_player_cards" in delta:
        for card in delta["detected_player_cards"]:
            if card not in state.detected_player_cards:
                state.detected_player_cards.append(card)

    if "concession" in delta and delta["concession"]:
        c = delta["concession"]
        state.concession_history.append(
            Concession(
                round=state.round_count,
                from_value=c["from_value"],
                to_value=c["to_value"],
                trigger=c.get("trigger", "pressure"),
            )
        )
        state.last_concession_round = state.round_count

    # --- 阶段推进 ---
    state.current_phase = _infer_phase(state.round_count)


def get_context_messages(session: SessionState) -> list[dict]:
    """
    返回用于 LLM 调用的对话上下文，限制最大条数防止 token 超限。
    格式：[{"role": "user"|"assistant", "content": "..."}]
    """
    recent = session.history[-_MAX_HISTORY_IN_CONTEXT:]
    result = []
    for msg in recent:
        llm_role = "user" if msg.role == "player" else "assistant"
        result.append({"role": llm_role, "content": msg.content})
    return result


# ---------------------------------------------------------------------------
# 持久化
# ---------------------------------------------------------------------------

async def save_session(
    db: AsyncSession,
    session: SessionState,
) -> None:
    """
    将当前 SessionState 持久化回数据库。
    """
    result = await db.execute(
        select(SessionORM).where(SessionORM.id == session.session_id)
    )
    orm = result.scalar_one_or_none()

    if orm is None:
        raise ValueError(f"会话不存在：{session.session_id}")

    orm.state_json = session.opponent_state.model_dump_json()
    orm.history_json = json.dumps(
        [m.model_dump(mode="json") for m in session.history],
        ensure_ascii=False,
    )
    orm.status = session.status.value

    await db.commit()


async def get_fork_tree(
    db: AsyncSession,
    session_id: str,
) -> ForkTree | None:
    """
    从数据库读取并反序列化 fork_tree_data，返回 ForkTree 对象。
    """
    result = await db.execute(
        select(SessionORM).where(SessionORM.id == session_id)
    )
    orm = result.scalar_one_or_none()

    if orm is None or not orm.fork_tree_data:
        return None

    try:
        return ForkTree.model_validate_json(orm.fork_tree_data)
    except Exception:
        return None


async def save_fork_tree(
    db: AsyncSession,
    session_id: str,
    fork_tree: ForkTree,
) -> None:
    """
    将 ForkTree 序列化为 JSON 字符串存入数据库，同时更新 fork_tree_status 和时间戳。
    """
    result = await db.execute(
        select(SessionORM).where(SessionORM.id == session_id)
    )
    orm = result.scalar_one_or_none()

    if orm is None:
        raise ValueError(f"会话不存在：{session_id}")

    now = datetime.now(timezone.utc)
    created_at = orm.fork_tree_created_at or fork_tree.created_at or now

    fork_tree.session_id = session_id
    fork_tree.status = "done"
    fork_tree.error_message = None
    fork_tree.created_at = created_at
    fork_tree.updated_at = now

    orm.fork_tree_status = fork_tree.status
    orm.fork_tree_data = fork_tree.model_dump_json()
    orm.fork_tree_created_at = created_at
    orm.fork_tree_updated_at = now

    await db.commit()


async def update_fork_tree_status(
    db: AsyncSession,
    session_id: str,
    status: str,
    error_message: str | None = None,
) -> None:
    """
    更新 fork tree 生成状态，并在 fork_tree_data 中保留轻量状态信息。
    """
    result = await db.execute(
        select(SessionORM).where(SessionORM.id == session_id)
    )
    orm = result.scalar_one_or_none()

    if orm is None:
        raise ValueError(f"会话不存在：{session_id}")

    now = datetime.now(timezone.utc)
    created_at = orm.fork_tree_created_at or now

    fork_tree: ForkTree
    if orm.fork_tree_data:
        try:
            fork_tree = ForkTree.model_validate_json(orm.fork_tree_data)
        except Exception:
            fork_tree = ForkTree(session_id=session_id)
    else:
        fork_tree = ForkTree(session_id=session_id)

    fork_tree.session_id = session_id
    fork_tree.status = status
    fork_tree.error_message = error_message
    fork_tree.created_at = created_at
    fork_tree.updated_at = now

    if status != "done":
        fork_tree.root = None
        fork_tree.fork_count = 0
        fork_tree.total_nodes = 0

    orm.fork_tree_status = status
    orm.fork_tree_data = fork_tree.model_dump_json()
    orm.fork_tree_created_at = created_at
    orm.fork_tree_updated_at = now

    await db.commit()


# ---------------------------------------------------------------------------
# 终止判定
# ---------------------------------------------------------------------------

def check_termination(
    session: SessionState,
    scenario: Scenario,
) -> SessionStatus:
    """
    判断谈判是否应终止，返回当前应有的 status。
    调用方根据返回值决定是否更新 session.status。
    """
    state = session.opponent_state
    max_rounds = scenario.negotiation_structure.termination_conditions.max_rounds

    if state.patience <= 0:
        return SessionStatus.breakdown

    if state.round_count >= max_rounds:
        return SessionStatus.breakdown

    return SessionStatus.active


# ---------------------------------------------------------------------------
# 内部工具
# ---------------------------------------------------------------------------

def _clamp(value: int, min_val: int, max_val: int) -> int:
    return max(min_val, min(max_val, value))


def _infer_phase(round_count: int) -> NegotiationPhase:
    """根据轮次推断当前谈判阶段。"""
    if round_count <= 2:
        return NegotiationPhase.opening
    if round_count <= 5:
        return NegotiationPhase.probing
    if round_count <= 9:
        return NegotiationPhase.bargaining
    return NegotiationPhase.closing
