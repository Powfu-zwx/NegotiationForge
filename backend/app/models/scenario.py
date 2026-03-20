from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class ScenarioCategory(str, Enum):
    workplace = "职场"
    business = "商务"
    daily = "日常"
    high_stakes = "高风险"


class Difficulty(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class Metadata(BaseModel):
    title: str
    description: str
    category: ScenarioCategory
    difficulty: Difficulty
    estimated_rounds: int


class Context(BaseModel):
    setting: str
    background_shared: str


class CompetingOffer(BaseModel):
    exists: bool
    amount: int | None = None
    company_attractiveness: str | None = None
    description: str | None = None


class PlayerPrivateInfo(BaseModel):
    current_salary: int | None = None
    competing_offer: CompetingOffer | None = None
    ideal_salary: int
    reservation_point: int


class Card(BaseModel):
    card_id: str
    label: str
    description: str
    effect: str
    cost: str
    optimal_timing: str


class Player(BaseModel):
    role: str
    identity: str
    objective: str
    private_info: PlayerPrivateInfo
    cards: list[Card] = Field(default_factory=list)


class OpponentPersonality(BaseModel):
    style: str
    pressure_response: str
    rationality: float = Field(ge=0.0, le=1.0)
    description: str


class OpponentPrivateInfo(BaseModel):
    budget_ceiling: int
    opening_offer: int
    internal_valuation: int
    has_backup_candidates: bool
    backup_candidates_quality: str
    company_profit_pressure: bool


class NegotiationStrategy(str, Enum):
    anchoring = "anchoring"
    probing = "probing"
    conceding = "conceding"
    pressuring = "pressuring"
    face_saving = "face_saving"
    stalling = "stalling"


class InitialOpponentState(BaseModel):
    satisfaction: int = Field(ge=0, le=100)
    patience: int = Field(ge=0, le=100)
    current_strategy: NegotiationStrategy
    disclosed_info: list[str] = Field(default_factory=list)
    concession_history: list[dict] = Field(default_factory=list)


class Opponent(BaseModel):
    role: str
    name: str
    identity: str
    personality: OpponentPersonality
    objective: str
    private_info: OpponentPrivateInfo
    reservation_point: int
    target: int
    initial_state: InitialOpponentState


class Phase(BaseModel):
    phase_id: str
    label: str
    typical_rounds: str
    description: str


class TerminationConditions(BaseModel):
    agreement: str
    breakdown: str
    max_rounds: int


class NegotiationStructure(BaseModel):
    phases: list[Phase]
    termination_conditions: TerminationConditions


class Scenario(BaseModel):
    schema_version: str
    scenario_id: str
    metadata: Metadata
    context: Context
    player: Player
    opponent: Opponent
    negotiation_structure: NegotiationStructure