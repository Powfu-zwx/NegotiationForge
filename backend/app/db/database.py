from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models.session import Base


engine = create_async_engine(
    settings.database_url,
    echo=False,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db() -> None:
    """Initialize the database and backfill compatible schema additions."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_ensure_session_columns)


async def get_db() -> AsyncSession:
    """FastAPI dependency that yields an async database session."""
    async with AsyncSessionLocal() as session:
        yield session


def _ensure_session_columns(sync_conn) -> None:
    inspector = inspect(sync_conn)
    if "sessions" not in inspector.get_table_names():
        return

    existing_columns = {
        column["name"] for column in inspector.get_columns("sessions")
    }
    required_columns = {
        "fork_tree_status": "ALTER TABLE sessions ADD COLUMN fork_tree_status VARCHAR DEFAULT 'pending'",
        "fork_tree_data": "ALTER TABLE sessions ADD COLUMN fork_tree_data TEXT",
        "fork_tree_created_at": "ALTER TABLE sessions ADD COLUMN fork_tree_created_at DATETIME",
        "fork_tree_updated_at": "ALTER TABLE sessions ADD COLUMN fork_tree_updated_at DATETIME",
    }

    for column_name, statement in required_columns.items():
        if column_name not in existing_columns:
            sync_conn.exec_driver_sql(statement)
