"""Shared LLM abstractions and HTTP helpers."""

from __future__ import annotations

import asyncio
import json
from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator

import httpx
from pydantic import BaseModel


RETRYABLE_STATUS_CODES = {408, 409, 429, 500, 502, 503, 504}


class Message(BaseModel):
    role: str
    content: str


class LLMResponse(BaseModel):
    content: str
    model: str
    input_tokens: int
    output_tokens: int


class LLMProviderError(RuntimeError):
    """Raised when an upstream LLM provider cannot complete a request."""

    def __init__(
        self,
        provider: str,
        message: str,
        *,
        status_code: int = 502,
        retryable: bool = False,
    ) -> None:
        super().__init__(message)
        self.provider = provider
        self.status_code = status_code
        self.retryable = retryable


class LLMProvider(ABC):
    request_timeout_seconds = 60.0
    connect_timeout_seconds = 10.0
    max_retries = 2
    retry_base_delay_seconds = 0.5

    @abstractmethod
    async def chat(
        self,
        messages: list[Message],
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> LLMResponse:
        ...

    @abstractmethod
    async def stream(
        self,
        messages: list[Message],
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> AsyncGenerator[str, None]:
        ...

    @property
    @abstractmethod
    def provider_name(self) -> str:
        ...

    def _build_timeout(self) -> httpx.Timeout:
        total = max(1.0, float(self.request_timeout_seconds))
        connect = min(total, max(1.0, float(self.connect_timeout_seconds)))
        return httpx.Timeout(total, connect=connect)

    def _retry_count(self) -> int:
        return max(0, int(self.max_retries))

    def _retry_delay(self, attempt: int) -> float:
        base_delay = max(0.0, float(self.retry_base_delay_seconds))
        return base_delay * (2**attempt)

    def _is_retryable_status_code(self, status_code: int) -> bool:
        return status_code in RETRYABLE_STATUS_CODES

    def _extract_error_detail(self, response: httpx.Response) -> str:
        detail: str | None = None

        try:
            payload = response.json()
        except ValueError:
            payload = None

        if isinstance(payload, dict):
            error = payload.get("error")
            if isinstance(error, dict):
                detail = error.get("message") or error.get("detail")
            elif isinstance(error, str):
                detail = error

            if detail is None:
                candidate = payload.get("detail") or payload.get("message")
                if isinstance(candidate, str):
                    detail = candidate

        if detail is None:
            text = response.text.strip()
            if text:
                detail = text

        if detail is None:
            detail = response.reason_phrase or "unknown upstream error"

        detail = " ".join(detail.split())
        return detail[:240]

    def _build_transport_error(self, exc: Exception) -> LLMProviderError:
        return LLMProviderError(
            self.provider_name,
            f"{self.provider_name} upstream connection failed: {exc}",
            status_code=503,
            retryable=True,
        )

    def _build_http_error(self, response: httpx.Response) -> LLMProviderError:
        status_code = response.status_code
        detail = self._extract_error_detail(response)
        message = f"{self.provider_name} upstream returned HTTP {status_code}: {detail}"
        mapped_status = 503 if status_code == 429 else 502

        return LLMProviderError(
            self.provider_name,
            message,
            status_code=mapped_status,
            retryable=self._is_retryable_status_code(status_code),
        )

    async def _post_json(
        self,
        url: str,
        *,
        headers: dict[str, str] | None = None,
        json_body: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        retry_count = self._retry_count()

        for attempt in range(retry_count + 1):
            try:
                async with httpx.AsyncClient(timeout=self._build_timeout()) as client:
                    response = await client.post(
                        url,
                        headers=headers,
                        json=json_body,
                        params=params,
                    )

                if response.is_error:
                    error = self._build_http_error(response)
                    if error.retryable and attempt < retry_count:
                        await asyncio.sleep(self._retry_delay(attempt))
                        continue
                    raise error

                try:
                    return response.json()
                except json.JSONDecodeError as exc:
                    if attempt < retry_count:
                        await asyncio.sleep(self._retry_delay(attempt))
                        continue
                    raise LLMProviderError(
                        self.provider_name,
                        f"{self.provider_name} upstream returned invalid JSON: {exc}",
                        status_code=502,
                        retryable=True,
                    ) from exc

            except LLMProviderError:
                raise
            except (httpx.TimeoutException, httpx.TransportError) as exc:
                if attempt < retry_count:
                    await asyncio.sleep(self._retry_delay(attempt))
                    continue
                raise self._build_transport_error(exc) from exc

        raise LLMProviderError(
            self.provider_name,
            f"{self.provider_name} request failed after retries.",
            status_code=503,
            retryable=True,
        )
