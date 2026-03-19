"""
LLM 工厂模块。

根据配置返回对应的 LLMProvider 实例。
上层业务代码调用 get_llm_provider() 即可，无需感知具体实现。

使用示例：
    from app.llm.factory import get_llm_provider

    provider = get_llm_provider()
    response = await provider.chat(messages)

切换模型只需修改 .env 中的 LLM_PROVIDER，代码零改动。
"""
from app.core.config import settings
from app.llm.base import LLMProvider


def get_llm_provider(provider_name: str | None = None) -> LLMProvider:
    """
    返回指定提供商的 LLMProvider 实例。
    不传 provider_name 时，使用 .env 中 LLM_PROVIDER 的值。

    Phase 3 分叉树推演时可以显式指定轻量模型：
        main_provider = get_llm_provider()            # 主线：默认高质量模型
        fork_provider = get_llm_provider("deepseek")  # 推演：同样是 DeepSeek，但可以单独调低 temperature
    """
    name = provider_name or settings.llm_provider

    if name == "deepseek":
        from app.llm.providers.deepseek import DeepSeekProvider
        return DeepSeekProvider()

    if name == "openai":
        from app.llm.providers.openai import OpenAIProvider
        return OpenAIProvider()

    if name == "gemini":
        from app.llm.providers.gemini import GeminiProvider
        return GeminiProvider()

    raise ValueError(
        f"未知的 LLM 提供商：'{name}'。"
        f"支持的值：deepseek | openai | gemini"
    )
