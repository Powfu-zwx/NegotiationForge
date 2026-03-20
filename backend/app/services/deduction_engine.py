from __future__ import annotations

import logging

from app.llm.base import Message as LLMMessage
from app.models.fork_tree import ForkNode
from app.models.scenario import Scenario
from app.models.session import (
    Message,
    NegotiationPhase,
    NegotiationStrategy,
    OpponentState,
    SessionState,
    SessionStatus,
)
from app.services.analysis_agent import run_round_analysis
from app.services.prompt_builder import build_opponent_system_prompt


logger = logging.getLogger(__name__)


class DeductionEngine:
    def __init__(self, llm_client):
        self.llm = llm_client

    async def deduce(
        self,
        scenario: Scenario,
        mainline_history_before_fork: list[dict],
        alternative_user_message: str,
        strategy_label: str,
        max_layers: int = 2,
    ) -> list[ForkNode]:
        if max_layers < 1:
            return []

        fork_turn = self._infer_next_turn(mainline_history_before_fork)
        history_after_alt = list(mainline_history_before_fork) + [
            {"round": fork_turn, "role": "player", "content": alternative_user_message}
        ]

        try:
            opponent_layer1 = await self._generate_opponent_reply(
                scenario=scenario,
                history=history_after_alt,
            )
            if not opponent_layer1:
                return []

            history_after_layer1 = history_after_alt + [
                {"round": fork_turn, "role": "opponent", "content": opponent_layer1}
            ]
            opponent_layer1_node = ForkNode(
                node_id="pending_layer1",
                turn=fork_turn,
                speaker="opponent",
                content=opponent_layer1,
                strategy_label="对手回应",
                is_mainline=False,
                analysis_snapshot=await self.build_analysis_snapshot(
                    scenario,
                    history_after_layer1,
                ),
                children=[],
            )

            if max_layers < 2:
                return [opponent_layer1_node]

            user_layer2 = await self._generate_user_followup(
                scenario=scenario,
                history=history_after_layer1,
                strategy_label=strategy_label,
            )
            if not user_layer2:
                return []

            follow_up_turn = fork_turn + 1
            history_after_user_layer2 = history_after_layer1 + [
                {"round": follow_up_turn, "role": "player", "content": user_layer2}
            ]
            user_layer2_node = ForkNode(
                node_id="pending_layer2_user",
                turn=follow_up_turn,
                speaker="user",
                content=user_layer2,
                strategy_label=strategy_label,
                is_mainline=False,
                analysis_snapshot=await self.build_analysis_snapshot(
                    scenario,
                    history_after_user_layer2,
                ),
                children=[],
            )

            opponent_layer2 = await self._generate_opponent_reply(
                scenario=scenario,
                history=history_after_user_layer2,
            )
            if not opponent_layer2:
                return []

            history_after_layer2 = history_after_user_layer2 + [
                {"round": follow_up_turn, "role": "opponent", "content": opponent_layer2}
            ]
            opponent_layer2_node = ForkNode(
                node_id="pending_layer2_opponent",
                turn=follow_up_turn,
                speaker="opponent",
                content=opponent_layer2,
                strategy_label="对手收束",
                is_mainline=False,
                analysis_snapshot=await self.build_analysis_snapshot(
                    scenario,
                    history_after_layer2,
                ),
                children=[],
            )

            opponent_layer1_node.children = [user_layer2_node]
            user_layer2_node.children = [opponent_layer2_node]

            return [
                opponent_layer1_node,
                user_layer2_node,
                opponent_layer2_node,
            ]
        except Exception:
            logger.exception("Failed to deduce branch chain for strategy %s", strategy_label)
            return []

    async def build_analysis_snapshot(
        self,
        scenario: Scenario,
        history: list[dict],
    ) -> dict | None:
        if not history:
            return None

        try:
            round_num = max(int(item.get("round", 0)) for item in history)
            simulated_session = self._build_simulated_session(scenario, history)
            result = await run_round_analysis(simulated_session, scenario, round_num)
        except Exception:
            logger.exception("Failed to build analysis snapshot for fork branch")
            return None

        return {
            "scores": result.scores.model_dump(),
            "is_turning_point": result.is_turning_point,
            "turning_reason": result.turning_reason,
        }

    async def _generate_opponent_reply(
        self,
        scenario: Scenario,
        history: list[dict],
    ) -> str:
        system_prompt = (
            f"{build_opponent_system_prompt(scenario, self._build_simulated_state(scenario, history))}\n\n"
            "---\n\n"
            "当前任务：这是一条替代路径的推演。你必须基于以下对话历史自然回应，"
            "保持与主线设定一致的角色、底线和谈判风格，不要提及这是模拟或分叉。"
        )

        messages = [LLMMessage(role="system", content=system_prompt)]
        for item in history:
            role = str(item.get("role", "player"))
            content = str(item.get("content", "")).strip()
            llm_role = "user" if role in {"player", "user"} else "assistant"
            messages.append(LLMMessage(role=llm_role, content=content))

        try:
            response = await self.llm.chat(
                messages=messages,
                temperature=0.7,
                max_tokens=400,
            )
            return response.content.strip()
        except Exception:
            logger.exception("Failed to generate opponent reply in deduction engine")
            return ""

    async def _generate_user_followup(
        self,
        scenario: Scenario,
        history: list[dict],
        strategy_label: str,
    ) -> str:
        history_text = self._format_history(history)
        prompt = f"""
你现在扮演谈判中的用户一方，需要基于既有对话继续推进这一条替代路径。

场景：{scenario.metadata.title}
用户目标：{scenario.player.objective}
对手目标：{scenario.opponent.objective}
当前替代策略标签：{strategy_label}

对话历史：
{history_text}

请基于对手刚才的回应，生成一条合理、自然、具有代表性的跟进回复。
要求：
- 1~3 句话
- 输出语言与对话历史保持一致
- 直接输出回复正文，不要解释策略
""".strip()

        try:
            response = await self.llm.chat(
                messages=[
                    LLMMessage(
                        role="system",
                        content="你是谈判用户侧的发言生成器，只输出下一句自然回复。",
                    ),
                    LLMMessage(role="user", content=prompt),
                ],
                temperature=0.6,
                max_tokens=300,
            )
            return response.content.strip()
        except Exception:
            logger.exception("Failed to generate user follow-up in deduction engine")
            return ""

    def _build_simulated_session(
        self,
        scenario: Scenario,
        history: list[dict],
    ) -> SessionState:
        return SessionState(
            session_id="fork-deduction",
            scenario_id=scenario.scenario_id,
            opponent_state=self._build_simulated_state(scenario, history),
            history=self._convert_history(history),
            status=SessionStatus.active,
        )

    def _build_simulated_state(
        self,
        scenario: Scenario,
        history: list[dict],
    ) -> OpponentState:
        initial = scenario.opponent.initial_state
        round_count = self._infer_round_count(history)

        return OpponentState(
            satisfaction=initial.satisfaction,
            patience=max(0, initial.patience - round_count * 4),
            rapport=50,
            current_strategy=NegotiationStrategy(initial.current_strategy.value),
            strategy_locked=False,
            disclosed_info=list(initial.disclosed_info),
            detected_player_cards=[],
            concession_history=[],
            last_concession_round=0,
            current_phase=self._infer_phase(round_count),
            round_count=round_count,
        )

    def _convert_history(self, history: list[dict]) -> list[Message]:
        messages: list[Message] = []
        for item in history:
            role = str(item.get("role", "player"))
            normalized_role = "player" if role in {"player", "user"} else "opponent"
            messages.append(
                Message(
                    round=int(item.get("round", 0)),
                    role=normalized_role,
                    content=str(item.get("content", "")),
                )
            )
        return messages

    def _infer_round_count(self, history: list[dict]) -> int:
        if not history:
            return 0
        return max(int(item.get("round", 0)) for item in history) + 1

    def _infer_next_turn(self, history: list[dict]) -> int:
        if not history:
            return 0
        return max(int(item.get("round", 0)) for item in history) + 1

    def _infer_phase(self, round_count: int) -> NegotiationPhase:
        if round_count <= 2:
            return NegotiationPhase.opening
        if round_count <= 5:
            return NegotiationPhase.probing
        if round_count <= 9:
            return NegotiationPhase.bargaining
        return NegotiationPhase.closing

    def _format_history(self, history: list[dict]) -> str:
        if not history:
            return "无历史对话。"

        lines: list[str] = []
        for item in history:
            role = str(item.get("role", "player"))
            speaker = "用户" if role in {"player", "user"} else "对手"
            lines.append(
                f"[第{item.get('round', 0)}轮 {speaker}] {str(item.get('content', '')).strip()}"
            )
        return "\n".join(lines)
