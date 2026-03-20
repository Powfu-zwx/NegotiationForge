"""OpenAI-compatible provider adapter."""

from __future__ import annotations

import json
from typing import AsyncGenerator

import httpx

from app.core.config import settings
from app.llm.base import LLMProvider, LLMProviderError, LLMResponse, Message


class OpenAIProvider(LLMProvider):
    def __init__(self) -> None:
        self._api_key = settings.openai_api_key
        self._base_url = settings.openai_base_url.rstrip("/")
        self._model = settings.openai_model
        self._headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    @property
    def provider_name(self) -> str:
        return "openai"

    def _build_payload(
        self,
        messages: list[Message],
        temperature: float,
        max_tokens: int,
        stream: bool = False,
    ) -> dict:
        return {
            "model": self._model,
            "messages": [message.model_dump() for message in messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": stream,
        }

    async def chat(
        self,
        messages: list[Message],
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> LLMResponse:
        payload = self._build_payload(messages, temperature, max_tokens)
        data = await self._post_json(
            f"{self._base_url}/chat/completions",
            headers=self._headers,
            json_body=payload,
        )

        choice = data["choices"][0]["message"]
        usage = data.get("usage", {})

        return LLMResponse(
            content=choice["content"],
            model=data.get("model", self._model),
            input_tokens=usage.get("prompt_tokens", 0),
            output_tokens=usage.get("completion_tokens", 0),
        )

    async def stream(
        self,
        messages: list[Message],
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> AsyncGenerator[str, None]:
        payload = self._build_payload(messages, temperature, max_tokens, stream=True)

        try:
            async with httpx.AsyncClient(timeout=self._build_timeout()) as client:
                async with client.stream(
                    "POST",
                    f"{self._base_url}/chat/completions",
                    headers=self._headers,
                    json=payload,
                ) as response:
                    if response.is_error:
                        await response.aread()
                        raise self._build_http_error(response)

                    async for line in response.aiter_lines():
                        if not line.startswith("data: "):
                            continue

                        chunk = line[len("data: ") :].strip()
                        if chunk == "[DONE]":
                            break

                        try:
                            data = json.loads(chunk)
                            delta = data["choices"][0].get("delta", {})
                            text = delta.get("content", "")
                            if text:
                                yield text
                        except (KeyError, IndexError, ValueError, json.JSONDecodeError):
                            continue
        except LLMProviderError:
            raise
        except (httpx.TimeoutException, httpx.TransportError) as exc:
            raise self._build_transport_error(exc) from exc
