from __future__ import annotations

import json
import logging
import re

from app.llm.base import Message as LLMMessage
from app.models.scenario import Scenario


logger = logging.getLogger(__name__)


class ForkGenerator:
    def __init__(self, llm_client):
        self.llm = llm_client

    async def generate_alternatives(
        self,
        scenario: Scenario,
        mainline_history: list[dict],
        critical_turn: int,
        original_user_message: str,
        n_alternatives: int = 2,
    ) -> list[dict]:
        system_prompt = (
            "你是谈判策略推演助手。"
            "你的任务是在谈判关键节点上生成本质不同的替代策略，"
            "必须让不同策略在谈判意图上明显分化，例如更强硬、示弱、拖延、转移议题或换取条件，"
            "不能只是改写原句措辞。"
            "输出必须是严格 JSON，顶层包含 alternatives 数组，不得输出 Markdown 或解释文字。"
        )
        user_prompt = self._build_user_prompt(
            scenario=scenario,
            mainline_history=mainline_history,
            critical_turn=critical_turn,
            original_user_message=original_user_message,
            n_alternatives=n_alternatives,
        )

        try:
            response = await self.llm.chat(
                messages=[
                    LLMMessage(role="system", content=system_prompt),
                    LLMMessage(role="user", content=user_prompt),
                ],
                temperature=0.5,
                max_tokens=1200,
            )
        except Exception:
            logger.exception(
                "Failed to generate fork alternatives for turn %s",
                critical_turn,
            )
            return []

        data = self._parse_json(response.content)
        alternatives = data.get("alternatives", [])
        if not isinstance(alternatives, list):
            logger.warning(
                "Fork alternatives payload is invalid for turn %s: %s",
                critical_turn,
                response.content,
            )
            return []

        normalized: list[dict] = []
        for item in alternatives:
            if not isinstance(item, dict):
                continue
            strategy_label = str(item.get("strategy_label", "")).strip()
            content = str(item.get("content", "")).strip()
            intent = str(item.get("intent", "")).strip()
            if not strategy_label or not content:
                continue
            normalized.append(
                {
                    "strategy_label": strategy_label,
                    "content": content,
                    "intent": intent,
                }
            )

        return normalized[:n_alternatives]

    def _build_user_prompt(
        self,
        scenario: Scenario,
        mainline_history: list[dict],
        critical_turn: int,
        original_user_message: str,
        n_alternatives: int,
    ) -> str:
        history_text = self._format_history(mainline_history)
        return f"""
## 场景上下文
- 场景名称：{scenario.metadata.title}
- 用户角色：{scenario.player.role}（{scenario.player.identity}）
- 用户目标：{scenario.player.objective}
- 用户底线：{scenario.player.private_info.reservation_point}
- 对手角色：{scenario.opponent.name}（{scenario.opponent.role}）
- 对手目标：{scenario.opponent.objective}
- 对手底线：{scenario.opponent.reservation_point}

## 截止关键节点的主线历史
{history_text}

## 当前关键节点
- 关键轮次：{critical_turn}
- 原始用户发言：{original_user_message}

## 生成要求
- 生成 {n_alternatives} 条替代策略
- 每条策略必须和原始发言存在明显策略差异，不要只是换说法
- 允许使用的策略标签示例：施压、示弱、转移焦点、拖延、引入新议题、妥协、坚守底线
- 输出语言必须与原始对话保持一致
- intent 需要用 1~2 句话解释这条策略为什么不同、想达到什么目的

## 输出格式
仅输出以下 JSON：
{{
  "alternatives": [
    {{
      "strategy_label": "策略标签",
      "content": "替代发言内容",
      "intent": "策略意图说明"
    }}
  ]
}}
""".strip()

    def _format_history(self, history: list[dict]) -> str:
        if not history:
            return "无历史对话。"

        lines: list[str] = []
        for item in history:
            role = str(item.get("role", ""))
            speaker = "用户" if role in {"player", "user"} else "对手"
            turn = item.get("round", item.get("turn", "?"))
            content = str(item.get("content", "")).strip()
            lines.append(f"[第{turn}轮 {speaker}] {content}")
        return "\n".join(lines)

    def _parse_json(self, raw: str) -> dict:
        text = raw.strip()
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        text = text.strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            logger.warning("Failed to parse fork alternatives JSON: %s", raw)
            return {}
