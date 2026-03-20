from __future__ import annotations

import logging

from app.models.fork_tree import ForkNode, ForkTree
from app.models.scenario import Scenario
from app.services.deduction_engine import DeductionEngine
from app.services.fork_generator import ForkGenerator


logger = logging.getLogger(__name__)


class TreeBuilder:
    def __init__(
        self,
        fork_generator: ForkGenerator,
        deduction_engine: DeductionEngine,
    ):
        self.fork_generator = fork_generator
        self.deduction_engine = deduction_engine

    async def build(
        self,
        session_id: str,
        scenario: Scenario,
        mainline_turns: list[dict],
        analysis_results: list[dict],
    ) -> ForkTree:
        normalized_turns = self._normalize_turns(mainline_turns)
        if not normalized_turns:
            return ForkTree(
                session_id=session_id,
                status="done",
                root=None,
                fork_count=0,
                total_nodes=0,
            )

        analysis_by_round = self._build_analysis_map(analysis_results)
        mainline_nodes = self._build_mainline_nodes(normalized_turns, analysis_by_round)
        for index in range(len(mainline_nodes) - 1):
            mainline_nodes[index].children.append(mainline_nodes[index + 1])

        critical_turns = {
            round_num
            for round_num, result in analysis_by_round.items()
            if result.get("is_turning_point")
        }
        successful_fork_roots = 0

        for index, node in enumerate(mainline_nodes):
            if node.speaker != "user" or node.turn not in critical_turns:
                continue

            history_before_fork = normalized_turns[:index]
            history_to_critical = normalized_turns[: index + 1]

            try:
                alternatives = await self.fork_generator.generate_alternatives(
                    scenario=scenario,
                    mainline_history=history_to_critical,
                    critical_turn=node.turn,
                    original_user_message=node.content,
                    n_alternatives=2,
                )
            except Exception:
                logger.exception("Failed to generate alternatives for mainline turn %s", node.turn)
                continue

            branch_roots: list[ForkNode] = []
            for fork_idx, alternative in enumerate(alternatives):
                try:
                    deduction_chain = await self.deduction_engine.deduce(
                        scenario=scenario,
                        mainline_history_before_fork=history_before_fork,
                        alternative_user_message=alternative["content"],
                        strategy_label=alternative["strategy_label"],
                        max_layers=2,
                    )
                    if not deduction_chain:
                        continue

                    root_history = history_before_fork + [
                        {
                            "round": node.turn,
                            "role": "player",
                            "content": alternative["content"],
                        }
                    ]
                    alternative_root = ForkNode(
                        node_id=f"fork_{node.turn}_{fork_idx}_0_0",
                        turn=node.turn,
                        speaker="user",
                        content=alternative["content"],
                        strategy_label=alternative["strategy_label"],
                        is_mainline=False,
                        analysis_snapshot=await self.deduction_engine.build_analysis_snapshot(
                            scenario,
                            root_history,
                        ),
                        children=[],
                    )
                    self._assign_branch_node_ids(node.turn, fork_idx, deduction_chain)
                    alternative_root.children = [deduction_chain[0]]
                    branch_roots.append(alternative_root)
                except Exception:
                    logger.exception(
                        "Failed to build fork branch for turn %s, fork %s",
                        node.turn,
                        fork_idx,
                    )

            if branch_roots:
                node.children.extend(branch_roots)
                successful_fork_roots += 1

        root = mainline_nodes[0]
        return ForkTree(
            session_id=session_id,
            status="done",
            error_message=None,
            root=root,
            fork_count=successful_fork_roots,
            total_nodes=self._count_nodes(root),
        )

    def _normalize_turns(self, mainline_turns: list[dict]) -> list[dict]:
        normalized: list[dict] = []
        for item in mainline_turns:
            role = str(item.get("role", "player"))
            speaker = "user" if role in {"player", "user"} else "opponent"
            normalized.append(
                {
                    "round": int(item.get("round", item.get("turn", 0))),
                    "role": speaker,
                    "content": str(item.get("content", "")).strip(),
                }
            )
        return normalized

    def _build_analysis_map(self, analysis_results: list[dict]) -> dict[int, dict]:
        result: dict[int, dict] = {}
        for item in analysis_results:
            raw = item.model_dump() if hasattr(item, "model_dump") else dict(item)
            round_num = int(raw.get("round", 0))
            result[round_num] = {
                "scores": raw.get("scores"),
                "is_turning_point": bool(raw.get("is_turning_point", False)),
                "turning_reason": raw.get("turning_reason"),
            }
        return result

    def _build_mainline_nodes(
        self,
        mainline_turns: list[dict],
        analysis_by_round: dict[int, dict],
    ) -> list[ForkNode]:
        seen_ids: dict[str, int] = {}
        nodes: list[ForkNode] = []

        for item in mainline_turns:
            base_id = f"main_{item['round']}_{item['role']}"
            seen_ids[base_id] = seen_ids.get(base_id, 0) + 1
            node_id = base_id if seen_ids[base_id] == 1 else f"{base_id}_{seen_ids[base_id] - 1}"
            nodes.append(
                ForkNode(
                    node_id=node_id,
                    turn=item["round"],
                    speaker=item["role"],
                    content=item["content"],
                    strategy_label="主线",
                    is_mainline=True,
                    analysis_snapshot=analysis_by_round.get(item["round"]),
                    children=[],
                )
            )

        return nodes

    def _assign_branch_node_ids(
        self,
        turn: int,
        fork_idx: int,
        deduction_chain: list[ForkNode],
    ) -> None:
        if not deduction_chain:
            return

        deduction_chain[0].node_id = f"fork_{turn}_{fork_idx}_1_0"
        if len(deduction_chain) > 1:
            deduction_chain[1].node_id = f"fork_{turn}_{fork_idx}_2_0"
        if len(deduction_chain) > 2:
            deduction_chain[2].node_id = f"fork_{turn}_{fork_idx}_2_1"

    def _count_nodes(self, node: ForkNode | None) -> int:
        if node is None:
            return 0
        return 1 + sum(self._count_nodes(child) for child in node.children)
