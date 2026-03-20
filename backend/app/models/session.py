from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, Field
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


# ---------------------------------------------------------------------------
# SQLAlchemy ORM
# ---------------------------------------------------------------------------

class Base(DeclarativeBase):
    pass


class SessionORM(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    scenario_id: Mapped[str] = mapped_column(String, nullable=False)
    state_json: Mapped[str] = mapped_column(Text, nullable=False)
    history_json: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String, default="active")
    fork_tree_status: Mapped[str] = mapped_column(String, default="pending")
    fork_tree_data: Mapped[str | None] = mapped_column(Text, nullable=True)
    fork_tree_created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    fork_tree_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


# ---------------------------------------------------------------------------
# Pydantic：内存状态模型
# ---------------------------------------------------------------------------

class NegotiationPhase(str, Enum):
    opening = "opening"
    probing = "probing"
    bargaining = "bargaining"
    closing = "closing"


class NegotiationStrategy(str, Enum):
    anchoring = "anchoring"
    probing = "probing"
    conceding = "conceding"
    pressuring = "pressuring"
    face_saving = "face_saving"
    stalling = "stalling"


class Concession(BaseModel):
    round: int
    from_value: int
    to_value: int
    trigger: str  # pressure | information | time | goodwill


class Message(BaseModel):
    round: int
    role: str  # "player" | "opponent"
    content: str
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class OpponentState(BaseModel):
    # 核心资源
    satisfaction: int = Field(ge=0, le=100)
    patience: int = Field(ge=0, le=100)
    rapport: int = Field(default=50, ge=0, le=100)

    # 策略层
    current_strategy: NegotiationStrategy
    strategy_locked: bool = False

    # 信息层
    disclosed_info: list[str] = Field(default_factory=list)
    detected_player_cards: list[str] = Field(default_factory=list)

    # 让步记录
    concession_history: list[Concession] = Field(default_factory=list)
    last_concession_round: int = 0

    # 元信息
    current_phase: NegotiationPhase = NegotiationPhase.opening
    round_count: int = 0


class SessionStatus(str, Enum):
    active = "active"
    agreement = "agreement"
    breakdown = "breakdown"


class SessionState(BaseModel):
    session_id: str
    scenario_id: str
    opponent_state: OpponentState
    history: list[Message] = Field(default_factory=list)
    status: SessionStatus = SessionStatus.active
    fork_tree_status: str = "pending"
    fork_tree_data: str | None = None
    fork_tree_created_at: datetime | None = None
    fork_tree_updated_at: datetime | None = None

class AnalysisResultORM(Base):
    __tablename__ = "analysis_results"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    session_id: Mapped[str] = mapped_column(
        String, ForeignKey("sessions.id"), nullable=False
    )
    round: Mapped[int] = mapped_column(Integer, nullable=False)

    # 转折点判断
    is_turning_point: Mapped[bool] = mapped_column(Boolean, default=False)
    turning_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 五维态势评分（0.0 ~ 10.0）
    leverage: Mapped[float] = mapped_column(Float, nullable=False)
    info_advantage: Mapped[float] = mapped_column(Float, nullable=False)
    relationship: Mapped[float] = mapped_column(Float, nullable=False)
    agreement_prob: Mapped[float] = mapped_column(Float, nullable=False)
    satisfaction: Mapped[float] = mapped_column(Float, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class SummaryORM(Base):
    __tablename__ = "summaries"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    session_id: Mapped[str] = mapped_column(
        String, ForeignKey("sessions.id"), unique=True, nullable=False
    )
    content_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


# ---------------------------------------------------------------------------
# Pydantic：Phase 2 分析结果模型
# ---------------------------------------------------------------------------

class SituationScores(BaseModel):
    leverage: float = Field(ge=0.0, le=10.0, description="议价力")
    info_advantage: float = Field(ge=0.0, le=10.0, description="信息优势")
    relationship: float = Field(ge=0.0, le=10.0, description="关系温度")
    agreement_prob: float = Field(ge=0.0, le=10.0, description="达成协议概率")
    satisfaction: float = Field(ge=0.0, le=10.0, description="双方满意度均值")


class AnalysisResult(BaseModel):
    session_id: str
    round: int
    is_turning_point: bool
    turning_reason: str | None = None
    scores: SituationScores


class TurningPointSummary(BaseModel):
    round: int
    reason: str
    player_move: str       # 该轮玩家说了什么
    opponent_reaction: str # 对手如何反应


class SummaryContent(BaseModel):
    turning_points: list[TurningPointSummary]
    strategy_analysis: str    # 策略得失分析（自然语言段落）
    improvement_suggestions: list[str]  # 2~4 条具体改进建议
    final_verdict: str        # 一句话总结谈判结果评价
