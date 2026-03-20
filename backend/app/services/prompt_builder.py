"""
Prompt 构建器。
将场景数据和对手当前状态组装成三层 System Prompt。
"""
from app.models.scenario import Scenario
from app.models.session import OpponentState, NegotiationStrategy


# ---------------------------------------------------------------------------
# 策略说明映射
# ---------------------------------------------------------------------------

_STRATEGY_DESCRIPTIONS: dict[NegotiationStrategy, str] = {
    NegotiationStrategy.anchoring: (
        "坚守当前报价，给出理由，不主动让步。"
        "可以解释预算限制或公司政策，但不给出新的数字。"
    ),
    NegotiationStrategy.probing: (
        "追问对方信息（底线、能力细节、决策时限），暂不让步。"
        "用问题引导对话，而不是给出承诺。"
    ),
    NegotiationStrategy.conceding: (
        "主动给出比上次更好的条件，但同时要求对方给出回报或承诺。"
        "让步幅度要克制，不能一次给到底。"
    ),
    NegotiationStrategy.pressuring: (
        "强调己方底线或退出可能，给对方制造紧迫感。"
        "语气可以更直接，但不要失去职业感。"
    ),
    NegotiationStrategy.face_saving: (
        "帮对方构建接受当前条件的理由，推动收尾。"
        "重点是让对方觉得接受是合理的，而不是妥协。"
    ),
    NegotiationStrategy.stalling: (
        "以需要内部确认为由拖延，避免当场承诺。"
        "给出模糊但不失礼貌的回应，争取时间。"
    ),
}

# ---------------------------------------------------------------------------
# 阶段说明映射
# ---------------------------------------------------------------------------

_PHASE_LABELS: dict[str, str] = {
    "opening": "开场锚定",
    "probing": "试探摸底",
    "bargaining": "实质交锋",
    "closing": "收尾收敛",
}


# ---------------------------------------------------------------------------
# 三层 Prompt 构建
# ---------------------------------------------------------------------------

def build_opponent_system_prompt(
    scenario: Scenario,
    state: OpponentState,
) -> str:
    """
    组装对手 Agent 的完整 System Prompt。
    包含三层：角色锚定 / 状态注入 / 行为约束。
    """
    layer1 = _build_layer1(scenario)
    layer2 = _build_layer2(scenario, state)
    layer3 = _build_layer3(state)

    return f"{layer1}\n\n---\n\n{layer2}\n\n---\n\n{layer3}"


def build_state_update_prompt(
    state: OpponentState,
    player_message: str,
    opponent_message: str,
) -> str:
    """
    组装状态更新 Agent 的 Prompt。
    输入本轮对话内容，输出状态变化的 JSON。
    """
    return f"""你是一个谈判状态分析器，负责在每轮对话结束后更新对手的内部状态。

当前状态：
- 满意度：{state.satisfaction}/100
- 耐心值：{state.patience}/100
- 关系温度：{state.rapport}/100
- 当前策略：{state.current_strategy.value}
- 策略锁定：{state.strategy_locked}
- 已透露信息：{state.disclosed_info or "无"}
- 已识别对方手牌：{state.detected_player_cards or "无"}
- 上次让步轮次：{state.last_concession_round}
- 让步次数：{len(state.concession_history)}

本轮对话：
用户：{player_message}
对手：{opponent_message}

请分析本轮对话，输出以下字段的变化。仅输出有变化的字段，无变化的字段不要输出。

字段说明：
- satisfaction_delta：整数，范围 -30 ~ +30，满意度变化量
- patience_delta：整数，范围 -20 ~ +10，额外耐心变化量（基础衰减已在代码层处理）
- rapport_delta：整数，范围 -20 ~ +20，关系温度变化量
- strategy：如需切换策略，输出新策略名（anchoring/probing/conceding/pressuring/face_saving/stalling）；否则不输出此字段
- strategy_locked：bool，如需变更锁定状态则输出；否则不输出此字段
- new_disclosed_info：本轮对手透露的私有信息描述列表，无则不输出此字段
- detected_player_cards：本轮新识别的用户手牌 id 列表（competing_offer/skill_proof/deadline_pressure），无则不输出此字段
- concession：本轮若有让步，输出 {{"from_value": 数字, "to_value": 数字, "trigger": "pressure|information|time|goodwill"}}；否则不输出此字段

仅输出 JSON，不附加任何解释文字，不使用 Markdown 代码块。"""


# ---------------------------------------------------------------------------
# 内部函数
# ---------------------------------------------------------------------------

def _build_layer1(scenario: Scenario) -> str:
    opponent = scenario.opponent
    pi = opponent.private_info

    return f"""你是{opponent.name}，{opponent.identity}，正在与一名候选人进行薪资谈判。

【你的性格】
{opponent.personality.description}
{opponent.personality.pressure_response}

【你的目标】
{opponent.objective}

【你的私有信息（绝对不能主动透露）】
- 该岗位预算上限：{pi.budget_ceiling} 元/月
- 你的开场报价预设：{pi.opening_offer} 元/月
- 你对候选人的内心估值：{pi.internal_valuation} 元/月
- 是否有备选候选人：{"有，但质量一般" if pi.has_backup_candidates and pi.backup_candidates_quality == "low" else "有" if pi.has_backup_candidates else "无"}
- 公司当前是否有利润压力：{"是" if pi.company_profit_pressure else "否"}

【你永远不能做的事】
- 用任何名字称呼对方，你不知道对方叫什么，统一用"你"来称呼
- 主动透露预算上限（{pi.budget_ceiling} 元/月）
- 在同一轮对话中连续做出两次让步
- 接受任何超出预算上限的条件
- 在上次让步后的下一轮立即再次让步"""


def _build_layer2(scenario: Scenario, state: OpponentState) -> str:
    phase_label = _PHASE_LABELS.get(state.current_phase.value, state.current_phase.value)

    # 让步记录摘要
    if state.concession_history:
        concession_lines = []
        for c in state.concession_history:
            trigger_map = {
                "pressure": "对方施压",
                "information": "对方提供新信息",
                "time": "时间压力",
                "goodwill": "建立信任",
            }
            trigger_label = trigger_map.get(c.trigger, c.trigger)
            concession_lines.append(
                f"第 {c.round} 轮：{c.from_value} → {c.to_value} 元，触发原因：{trigger_label}"
            )
        concession_summary = "\n".join(concession_lines)
    else:
        concession_summary = "本场谈判尚未做出让步"

    # 已透露信息摘要
    disclosed_summary = (
        "、".join(state.disclosed_info) if state.disclosed_info else "尚未透露任何私有信息"
    )

    # 已识别手牌摘要
    card_label_map = {
        "competing_offer": "竞争 offer",
        "skill_proof": "能力背书",
        "deadline_pressure": "决策时限",
    }
    if state.detected_player_cards:
        cards_summary = "、".join(
            card_label_map.get(c, c) for c in state.detected_player_cards
        )
    else:
        cards_summary = "暂未识别到对方的筹码"

    return f"""【当前状态】
谈判阶段：{phase_label}（第 {state.round_count} 轮）
满意度：{state.satisfaction}/100
耐心值：{state.patience}/100
关系温度：{state.rapport}/100
当前策略：{state.current_strategy.value}
策略锁定：{"是" if state.strategy_locked else "否"}

【让步记录】
{concession_summary}

【已透露的信息】
{disclosed_summary}

【已识别的对方手牌】
{cards_summary}"""


def _build_layer3(state: OpponentState) -> str:
    strategy_desc = _STRATEGY_DESCRIPTIONS.get(
        state.current_strategy,
        "按照当前策略自然回应对方。"
    )

    # 不完全理性规则（满足条件时附加）
    irrational_rules = []

    if state.rapport > 70:
        irrational_rules.append(
            "- 关系温度较高（>70），你可以在本轮额外透露一条尚未透露过的私有信息，以示诚意。"
        )
    if state.patience < 30:
        irrational_rules.append(
            "- 耐心值较低（<30），你的语气变得明显简短，不再详细解释理由。"
        )
    if state.satisfaction < 20:
        irrational_rules.append(
            "- 满意度极低（<20），你可以在本轮暗示谈判可能无法继续推进。"
        )

    irrational_section = (
        "\n【不完全理性规则】\n以下规则在满足条件时自然融入回复，不要生硬地宣告状态：\n"
        + "\n".join(irrational_rules)
        if irrational_rules
        else ""
    )

    return f"""【本轮行为规则】

当前策略：{state.current_strategy.value}
策略说明：{strategy_desc}

输出格式要求：
- 每次回复 3~5 句话，不超过 150 字
- 不使用 Markdown 格式，不加粗，不分条
- 语气与你的性格一致：直接、务实，偶尔带职场温度，但不圆滑
- 不要在回复末尾加总结句或重复对方的话{irrational_section}"""