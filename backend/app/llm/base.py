"""
LLM 提供商抽象基类。

上层业务代码只与此接口交互，不感知具体是 DeepSeek / OpenAI / Gemini。
后续切换模型或混用多个模型（主线用高质量、推演用轻量），只需在工厂层处理。
"""
from abc import ABC, abstractmethod
from typing import AsyncGenerator

from pydantic import BaseModel


class Message(BaseModel):
    """单条对话消息。"""
    role: str   # "system" | "user" | "assistant"
    content: str


class LLMResponse(BaseModel):
    """LLM 非流式响应。"""
    content: str
    model: str
    input_tokens: int
    output_tokens: int


class LLMProvider(ABC):
    """
    所有 LLM 适配器必须实现此抽象类。

    两个核心方法：
    - chat()：非流式，等待完整响应后返回，适合态势分析、分叉树推演
    - stream()：流式，逐 token 返回，适合实时对话界面
    """

    @abstractmethod
    async def chat(
        self,
        messages: list[Message],
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> LLMResponse:
        """
        非流式对话。返回完整响应和 token 用量。
        """
        ...

    @abstractmethod
    async def stream(
        self,
        messages: list[Message],
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> AsyncGenerator[str, None]:
        """
        流式对话。逐块 yield 文本片段。
        调用方负责拼接完整内容。
        """
        ...

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """提供商标识，用于日志和监控。"""
        ...
