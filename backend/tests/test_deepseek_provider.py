from __future__ import annotations

import httpx
import pytest

from app.core.config import settings
from app.llm.base import LLMProviderError, Message
from app.llm.providers.deepseek import DeepSeekProvider


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.mark.anyio
async def test_deepseek_chat_retries_remote_protocol_error(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "deepseek_api_key", "test-key")
    monkeypatch.setattr(settings, "deepseek_base_url", "https://example.com")
    monkeypatch.setattr(settings, "deepseek_model", "deepseek-chat")

    provider = DeepSeekProvider()
    provider.max_retries = 1
    provider.retry_base_delay_seconds = 0.0

    call_count = 0

    async def fake_post(
        self: httpx.AsyncClient,
        url: str,
        *,
        headers: dict[str, str] | None = None,
        json: dict | None = None,
        params: dict | None = None,
    ) -> httpx.Response:
        nonlocal call_count
        call_count += 1

        if call_count == 1:
            raise httpx.RemoteProtocolError("incomplete chunked read")

        return httpx.Response(
            200,
            request=httpx.Request("POST", url),
            json={
                "choices": [{"message": {"content": "reply ok"}}],
                "model": "deepseek-chat",
                "usage": {"prompt_tokens": 12, "completion_tokens": 8},
            },
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    response = await provider.chat([Message(role="user", content="hello")])

    assert response.content == "reply ok"
    assert response.input_tokens == 12
    assert response.output_tokens == 8
    assert call_count == 2


@pytest.mark.anyio
async def test_deepseek_chat_wraps_transport_error(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "deepseek_api_key", "test-key")
    monkeypatch.setattr(settings, "deepseek_base_url", "https://example.com")
    monkeypatch.setattr(settings, "deepseek_model", "deepseek-chat")

    provider = DeepSeekProvider()
    provider.max_retries = 0
    provider.retry_base_delay_seconds = 0.0

    async def fake_post(
        self: httpx.AsyncClient,
        url: str,
        *,
        headers: dict[str, str] | None = None,
        json: dict | None = None,
        params: dict | None = None,
    ) -> httpx.Response:
        raise httpx.RemoteProtocolError("incomplete chunked read")

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    with pytest.raises(LLMProviderError) as exc_info:
        await provider.chat([Message(role="user", content="hello")])

    assert exc_info.value.status_code == 503
    assert exc_info.value.retryable is True
    assert "deepseek upstream connection failed" in str(exc_info.value)
