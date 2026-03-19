"""
Phase 0 快速验证脚本。
在 backend/ 目录下运行：python check.py
确认依赖安装正确、配置可读取、路由可导入。
"""
import sys


def check_imports() -> None:
    print("检查依赖包...")
    try:
        import fastapi
        import uvicorn
        import httpx
        import pydantic_settings
        print(f"  fastapi        {fastapi.__version__}")
        print(f"  uvicorn        {uvicorn.__version__}")
        print(f"  httpx          {httpx.__version__}")
        print(f"  pydantic-settings OK")
    except ImportError as e:
        print(f"  缺少依赖：{e}")
        print("  请运行：pip install -r requirements.txt")
        sys.exit(1)


def check_config() -> None:
    print("检查配置读取...")
    try:
        from app.core.config import settings
        print(f"  env            {settings.app_env}")
        print(f"  llm_provider   {settings.llm_provider}")
        key = settings.deepseek_api_key
        configured = bool(key and "your" not in key)
        print(f"  deepseek_key   {'已配置' if configured else '未配置（需填写 .env）'}")
    except Exception as e:
        print(f"  配置读取失败：{e}")
        sys.exit(1)


def check_app() -> None:
    print("检查 FastAPI 应用...")
    try:
        from app.main import app
        routes = [r.path for r in app.routes]
        print(f"  已注册路由：{routes}")
    except Exception as e:
        print(f"  应用导入失败：{e}")
        sys.exit(1)


if __name__ == "__main__":
    print("=" * 40)
    print("NegotiationForge Phase 0 检查")
    print("=" * 40)
    check_imports()
    check_config()
    check_app()
    print("=" * 40)
    print("全部通过。运行以下命令启动服务：")
    print("  uvicorn app.main:app --reload")
    print("  访问：http://localhost:8000/docs")
    print("=" * 40)
