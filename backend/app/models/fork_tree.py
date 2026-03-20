from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field


class ForkNode(BaseModel):
    node_id: str
    turn: int
    speaker: Literal["user", "opponent"]
    content: str
    strategy_label: str
    is_mainline: bool
    analysis_snapshot: dict[str, Any] | None = None
    children: list["ForkNode"] = Field(default_factory=list)


ForkNode.model_rebuild()


class ForkTree(BaseModel):
    session_id: str
    status: Literal["pending", "generating", "done", "error"] = "pending"
    error_message: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    root: ForkNode | None = None
    fork_count: int = 0
    total_nodes: int = 0


class ForkTreeStatusResponse(BaseModel):
    session_id: str
    status: Literal["pending", "generating", "done", "error"]
    error_message: str | None = None
    fork_count: int = 0
    total_nodes: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None


class TriggerForkTreeResponse(BaseModel):
    session_id: str
    status: Literal["pending", "generating", "done", "error"]
    message: str
