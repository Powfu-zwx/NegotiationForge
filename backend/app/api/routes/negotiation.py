import logging
from typing import Literal

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.session import AnalysisResult, SessionStatus, SummaryContent
from app.services.analysis_service import (
    background_analyze_round,
    generate_and_save_summary,
    get_analysis_results,
    get_summary,
)
from app.services.opponent_agent import run_opponent_turn
from app.services.scenario_loader import list_scenarios, load_scenario
from app.services.session_manager import (
    check_termination,
    create_session,
    get_session,
    save_session,
)


router = APIRouter()
logger = logging.getLogger(__name__)


class CreateSessionRequest(BaseModel):
    scenario_id: str


class CreateSessionResponse(BaseModel):
    session_id: str
    scenario_id: str
    opponent_name: str
    opponent_role: str
    context_setting: str
    context_background: str


class ChatRequest(BaseModel):
    message: str


class OpponentStateSnapshot(BaseModel):
    round_count: int
    satisfaction: int
    patience: int
    rapport: int
    current_strategy: str
    current_phase: str


class ChatResponse(BaseModel):
    reply: str
    state: OpponentStateSnapshot
    session_status: str


class CompleteSessionRequest(BaseModel):
    status: Literal["agreement", "breakdown"]


class CompleteSessionResponse(BaseModel):
    session_id: str
    session_status: Literal["agreement", "breakdown"]
    message: str


class AnalysisListResponse(BaseModel):
    session_id: str
    results: list[AnalysisResult]


class SummaryResponse(BaseModel):
    session_id: str
    summary: SummaryContent


@router.get("/scenarios")
async def get_scenarios() -> list[dict]:
    return list_scenarios()


@router.post("/sessions", response_model=CreateSessionResponse)
async def create_new_session(
    request: CreateSessionRequest,
    db: AsyncSession = Depends(get_db),
) -> CreateSessionResponse:
    try:
        scenario = load_scenario(request.scenario_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"场景不存在：{request.scenario_id}")

    session = await create_session(db, scenario)

    return CreateSessionResponse(
        session_id=session.session_id,
        scenario_id=session.scenario_id,
        opponent_name=scenario.opponent.name,
        opponent_role=scenario.opponent.role,
        context_setting=scenario.context.setting,
        context_background=scenario.context.background_shared,
    )


@router.post("/sessions/{session_id}/chat", response_model=ChatResponse)
async def chat(
    session_id: str,
    request: ChatRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> ChatResponse:
    session = await get_session(db, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"会话不存在：{session_id}")

    if session.status.value != "active":
        raise HTTPException(
            status_code=400,
            detail=f"谈判已结束（{session.status.value}），无法继续发送消息。",
        )

    try:
        scenario = load_scenario(session.scenario_id)
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="场景文件缺失，请联系管理员。")

    current_round = session.opponent_state.round_count
    reply = await run_opponent_turn(session, scenario, request.message)
    session.status = check_termination(session, scenario)
    await save_session(db, session)
    background_tasks.add_task(background_analyze_round, session_id, current_round)

    state = session.opponent_state
    return ChatResponse(
        reply=reply,
        state=OpponentStateSnapshot(
            round_count=state.round_count,
            satisfaction=state.satisfaction,
            patience=state.patience,
            rapport=state.rapport,
            current_strategy=state.current_strategy.value,
            current_phase=state.current_phase.value,
        ),
        session_status=session.status.value,
    )


@router.post(
    "/sessions/{session_id}/complete",
    response_model=CompleteSessionResponse,
)
async def complete_session(
    session_id: str,
    request: CompleteSessionRequest,
    db: AsyncSession = Depends(get_db),
) -> CompleteSessionResponse:
    session = await get_session(db, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"会话不存在：{session_id}")

    if session.status.value != "active":
        raise HTTPException(
            status_code=400,
            detail=f"谈判已结束（{session.status.value}），无需重复结束。",
        )

    session.status = SessionStatus(request.status)
    await save_session(db, session)

    return CompleteSessionResponse(
        session_id=session_id,
        session_status=request.status,
        message="谈判已手动结束",
    )


@router.get("/sessions/{session_id}/analysis", response_model=AnalysisListResponse)
async def get_session_analysis(
    session_id: str,
    db: AsyncSession = Depends(get_db),
) -> AnalysisListResponse:
    session = await get_session(db, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"会话不存在：{session_id}")

    results = await get_analysis_results(db, session_id)
    return AnalysisListResponse(session_id=session_id, results=results)


@router.post("/sessions/{session_id}/summary", response_model=SummaryResponse)
async def create_summary(
    session_id: str,
    db: AsyncSession = Depends(get_db),
) -> SummaryResponse:
    session = await get_session(db, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"会话不存在：{session_id}")

    if session.status.value == "active":
        raise HTTPException(status_code=400, detail="谈判尚未结束，无法生成复盘。")

    try:
        scenario = load_scenario(session.scenario_id)
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="场景文件缺失，请联系管理员。")

    try:
        summary = await generate_and_save_summary(db, session, scenario)
    except Exception:
        logger.exception("Summary generation failed for session %s", session_id)
        raise HTTPException(
            status_code=503,
            detail="复盘生成失败，模型服务暂时不可用，请稍后重试。",
        )

    return SummaryResponse(session_id=session_id, summary=summary)


@router.get("/sessions/{session_id}/summary", response_model=SummaryResponse)
async def get_session_summary(
    session_id: str,
    db: AsyncSession = Depends(get_db),
) -> SummaryResponse:
    session = await get_session(db, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"会话不存在：{session_id}")

    summary = await get_summary(db, session_id)
    if summary is None:
        raise HTTPException(status_code=404, detail="复盘尚未生成，请先调用 POST /summary。")

    return SummaryResponse(session_id=session_id, summary=summary)
