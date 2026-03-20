"""Gemini provider adapter."""

from __future__ import annotations

from typing import AsyncGenerator

from app.core.config import settings
from app.llm.base import LLMProvider, LLMResponse, Message


class GeminiProvider(LLMProvider):
    def __init__(self) -> None:
        self._api_key = settings.gemini_api_key
        self._base_url = settings.gemini_base_url.rstrip("/")
        self._model = settings.gemini_model

    @property
    def provider_name(self) -> str:
        return "gemini"

    async def chat(
        self,
        messages: list[Message],
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> LLMResponse:
        system_instruction, contents = self._build_contents(messages)
        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            },
        }
        if system_instruction:
            payload["systemInstruction"] = {
                "parts": [{"text": system_instruction}],
            }

        data = await self._post_json(
            f"{self._base_url}/models/{self._model}:generateContent",
            params={"key": self._api_key},
            json_body=payload,
        )

        text = self._extract_text(data)
        usage = data.get("usageMetadata", {})

        return LLMResponse(
            content=text,
            model=self._model,
            input_tokens=usage.get("promptTokenCount", 0),
            output_tokens=usage.get("candidatesTokenCount", 0),
        )

    async def stream(
        self,
        messages: list[Message],
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> AsyncGenerator[str, None]:
        response = await self.chat(messages, temperature=temperature, max_tokens=max_tokens)
        if response.content:
            yield response.content

    def _build_contents(self, messages: list[Message]) -> tuple[str, list[dict]]:
        system_parts: list[str] = []
        contents: list[dict] = []

        for message in messages:
            if message.role == "system":
                system_parts.append(message.content)
                continue

            role = "user" if message.role == "user" else "model"
            contents.append(
                {
                    "role": role,
                    "parts": [{"text": message.content}],
                }
            )

        return "\n\n".join(part for part in system_parts if part.strip()), contents

    def _extract_text(self, data: dict) -> str:
        candidates = data.get("candidates", [])
        if not candidates:
            return ""

        parts = candidates[0].get("content", {}).get("parts", [])
        return "".join(
            str(part.get("text", "")) for part in parts if isinstance(part, dict)
        ).strip()
