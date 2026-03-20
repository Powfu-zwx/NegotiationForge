"""
对手 Agent。
负责调用 LLM 生成对手回复，以及调用状态更新 Agent 解析状态变化。
"""
import json
import re

from app.llm.base import Message as LLMMessage
from app.llm.factory import get_llm_provider
from app.models.scenario import Scenario
from app.models.session import SessionState
from app.services.prompt_builder import (
    build_opponent_system_prompt,
    build_state_update_prompt,
)
from app.services.session_manager import (
    append_message,
    apply_state_delta,
    get_context_messages,
)


# ---------------------------------------------------------------------------
# 主入口
# ---------------------------------------------------------------------------

async def run_opponent_turn(
    session: SessionState,
    scenario: Scenario,
    player_message: str,
) -> str:
    """
    处理一轮完整的对手回合：
    1. 记录用户消息
    2. 调用对手 Agent 生成回复
    3. 记录对手回复
    4. 调用状态更新 Agent 解析状态变化
    5. 应用状态变化
    返回对手本轮回复内容。
    """
    append_message(session, "player", player_message)

    opponent_reply = await _generate_opponent_reply(session, scenario)

    append_message(session, "opponent", opponent_reply)

    delta = await _generate_state_delta(session, player_message, opponent_reply)

    apply_state_delta(session, delta)

    return opponent_reply


# ---------------------------------------------------------------------------
# 对手回复生成
# ---------------------------------------------------------------------------

async def _generate_opponent_reply(
    session: SessionState,
    scenario: Scenario,
) -> str:
    system_prompt = build_opponent_system_prompt(scenario, session.opponent_state)
    context_messages = get_context_messages(session)

    llm_messages = [LLMMessage(role="system", content=system_prompt)]
    for m in context_messages:
        llm_messages.append(LLMMessage(role=m["role"], content=m["content"]))

    client = get_llm_provider()
    response = await client.chat(messages=llm_messages)
    return response.content.strip()


# ---------------------------------------------------------------------------
# 状态更新
# ---------------------------------------------------------------------------

async def _generate_state_delta(
    session: SessionState,
    player_message: str,
    opponent_message: str,
) -> dict:
    prompt = build_state_update_prompt(
        session.opponent_state,
        player_message,
        opponent_message,
    )

    llm_messages = [
        LLMMessage(
            role="system",
            content="你是一个严格按照 JSON 格式输出的状态分析器。",
        ),
        LLMMessage(role="user", content=prompt),
    ]

    client = get_llm_provider()
    # 状态更新任务确定性强，temperature 调低
    response = await client.chat(messages=llm_messages, temperature=0.3)
    return _parse_delta(response.content)


def _parse_delta(raw: str) -> dict:
    """
    解析状态更新 Agent 的输出。
    容错处理：去除可能残留的 Markdown 代码块标记。
    """
    text = raw.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {}