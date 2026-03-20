from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import AsyncSessionLocal, get_db
from app.llm.factory import get_llm_provider
from app.models.fork_tree import (
    ForkTree,
    ForkTreeStatusResponse,
    TriggerForkTreeResponse,
)
from app.services.analysis_service import get_analysis_results
from app.services.deduction_engine import DeductionEngine
from app.services.fork_generator import ForkGenerator
from app.services.scenario_loader import load_scenario
from app.services.session_manager import (
    get_fork_tree,
    get_session,
    save_fork_tree,
    update_fork_tree_status,
)
from app.services.tree_builder import TreeBuilder


logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/sessions/{session_id}/fork-tree",
    response_model=TriggerForkTreeResponse,
)
async def trigger_fork_tree(
    session_id: str,
    db: AsyncSession = Depends(get_db),
) -> TriggerForkTreeResponse:
    session = await get_session(db, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"会话不存在：{session_id}")

    if session.status.value == "active":
        raise HTTPException(status_code=400, detail="谈判尚未结束，无法生成分叉树。")

    if session.fork_tree_status == "generating":
        return TriggerForkTreeResponse(
            session_id=session_id,
            status="generating",
            message="分叉树正在生成中",
        )

    if session.fork_tree_status == "done":
        return TriggerForkTreeResponse(
            session_id=session_id,
            status="done",
            message="分叉树已生成",
        )

    await update_fork_tree_status(
        db=db,
        session_id=session_id,
        status="generating",
        error_message=None,
    )
    asyncio.create_task(_generate_fork_tree_in_background(session_id))

    return TriggerForkTreeResponse(
        session_id=session_id,
        status="generating",
        message="分叉树生成已启动",
    )


@router.get(
    "/sessions/{session_id}/fork-tree",
    response_model=ForkTree | ForkTreeStatusResponse,
)
async def get_session_fork_tree(
    session_id: str,
    db: AsyncSession = Depends(get_db),
) -> ForkTree | ForkTreeStatusResponse:
    session = await get_session(db, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"会话不存在：{session_id}")

    tree = await get_fork_tree(db, session_id)
    if session.fork_tree_status == "done":
        if tree is None:
            raise HTTPException(status_code=500, detail="分叉树状态异常，缺少树数据。")
        return tree

    return ForkTreeStatusResponse(
        session_id=session_id,
        status=session.fork_tree_status,
        error_message=tree.error_message if tree else None,
        fork_count=tree.fork_count if tree else 0,
        total_nodes=tree.total_nodes if tree else 0,
        created_at=session.fork_tree_created_at,
        updated_at=session.fork_tree_updated_at,
    )


async def _generate_fork_tree_in_background(session_id: str) -> None:
    async with AsyncSessionLocal() as db:
        try:
            session = await get_session(db, session_id)
            if session is None:
                return

            scenario = load_scenario(session.scenario_id)
            analysis_results = await get_analysis_results(db, session_id)
            llm_client = get_llm_provider()
            tree_builder = TreeBuilder(
                fork_generator=ForkGenerator(llm_client),
                deduction_engine=DeductionEngine(llm_client),
            )
            fork_tree = await tree_builder.build(
                session_id=session_id,
                scenario=scenario,
                mainline_turns=[m.model_dump(mode="json") for m in session.history],
                analysis_results=[result.model_dump(mode="json") for result in analysis_results],
            )
            await save_fork_tree(db, session_id, fork_tree)
        except Exception as exc:
            logger.exception("Failed to generate fork tree for session %s", session_id)
            try:
                await update_fork_tree_status(
                    db=db,
                    session_id=session_id,
                    status="error",
                    error_message=str(exc),
                )
            except Exception:
                logger.exception(
                    "Failed to persist fork tree error state for session %s",
                    session_id,
                )
