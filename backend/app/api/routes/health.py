"""
健康检查路由。
Phase 0 验证技术栈是否跑通的第一个接口。
"""
from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import settings

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    env: str
    llm_provider: str
    llm_provider_configured: bool


@router.get("/health", response_model=HealthResponse, tags=["系统"])
async def health_check() -> HealthResponse:
    """
    健康检查接口。
    返回应用运行状态和当前 LLM 提供商配置情况。
    """
    provider = settings.llm_provider

    # 检查当前提供商的 API Key 是否已配置
    key_map = {
        "deepseek": settings.deepseek_api_key,
        "openai": settings.openai_api_key,
        "gemini": settings.gemini_api_key,
    }
    api_key = key_map.get(provider, "")
    configured = bool(api_key and api_key != f"sk-your-{provider}-key-here")

    return HealthResponse(
        status="ok",
        env=settings.app_env,
        llm_provider=provider,
        llm_provider_configured=configured,
    )
