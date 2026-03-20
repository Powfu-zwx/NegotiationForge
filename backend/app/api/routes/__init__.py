from fastapi import APIRouter

from app.api.routes import health, llm_test, negotiation

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(llm_test.router)
api_router.include_router(negotiation.router)