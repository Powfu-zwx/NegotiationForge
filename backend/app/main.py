"""NegotiationForge backend entrypoint."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import api_router, fork_tree
from app.core.config import settings
from app.db.database import init_db
from app.llm.base import LLMProviderError


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize application resources on startup."""
    await init_db()
    yield


app = FastAPI(
    title="NegotiationForge API",
    description="对抗式谈判模拟与决策推演引擎",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")
app.include_router(fork_tree.router, prefix="/api/v1", tags=["fork-tree"])


@app.exception_handler(LLMProviderError)
async def handle_llm_provider_error(
    _: Request,
    exc: LLMProviderError,
) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": str(exc),
            "provider": exc.provider,
            "retryable": exc.retryable,
        },
    )


@app.get("/", tags=["system"])
async def root() -> dict:
    return {"message": "NegotiationForge API is running"}
