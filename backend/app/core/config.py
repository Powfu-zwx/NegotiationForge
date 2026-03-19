"""
应用配置模块。
所有配置项从环境变量读取，使用 pydantic-settings 做类型校验。
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── 应用基础 ──
    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    debug: bool = True

    # ── CORS ──
    allowed_origins: list[str] = ["http://localhost:3000"]

    # ── LLM 提供商 ──
    llm_provider: str = "deepseek"  # deepseek | openai | gemini

    # DeepSeek
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-chat"

    # OpenAI（备用）
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    # Gemini（备用）
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    # ── 数据库 ──
    database_url: str = "sqlite:///./negotiationforge.db"


# 全局单例，整个应用共享同一个 Settings 实例
settings = Settings()
