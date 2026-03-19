"""
NegotiationForge 后端入口。
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import api_router
from app.core.config import settings

app = FastAPI(
    title="NegotiationForge API",
    description="对抗式谈判模拟与决策推演引擎",
    version="0.1.0",
    docs_url="/docs",       # Swagger UI：http://localhost:8000/docs
    redoc_url="/redoc",     # ReDoc：http://localhost:8000/redoc
)

# ── CORS 中间件 ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 注册路由 ──
app.include_router(api_router, prefix="/api/v1")


@app.get("/", tags=["系统"])
async def root() -> dict:
    return {"message": "NegotiationForge API is running"}
