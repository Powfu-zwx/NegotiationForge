"""
LLM 连通性测试路由。
Phase 0 专用，确认 API Key 填写正确、网络可达、模型响应正常。
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.llm.base import Message
from app.llm.factory import get_llm_provider

router = APIRouter()


class LLMTestResponse(BaseModel):
    provider: str
    model: str
    reply: str
    input_tokens: int
    output_tokens: int


@router.get("/llm/test", response_model=LLMTestResponse, tags=["系统"])
async def test_llm() -> LLMTestResponse:
    """
    向当前配置的 LLM 发送一条测试消息，验证 API Key 和网络连通性。
    响应成功即说明 Phase 0 的 LLM 接入全部跑通。
    """
    try:
        provider = get_llm_provider()
        messages = [
            Message(role="system", content="你是一个助手，请用中文简短回复。"),
            Message(role="user", content="用一句话介绍你自己。"),
        ]
        result = await provider.chat(messages, temperature=0.7, max_tokens=100)
        return LLMTestResponse(
            provider=provider.provider_name,
            model=result.model,
            reply=result.content,
            input_tokens=result.input_tokens,
            output_tokens=result.output_tokens,
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"LLM 调用失败：{str(e)}。请检查 .env 中的 API Key 和网络连接。",
        )
