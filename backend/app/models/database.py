from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, String, Float, Integer, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone
from app.config.settings import get_settings


class Base(DeclarativeBase):
    pass


class Session(Base):
    __tablename__ = "sessions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    url = Column(Text)
    score = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Metric(Base):
    __tablename__ = "metrics"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("sessions.id"))
    lcp = Column(Float, nullable=True)
    cls = Column(Float, nullable=True)
    inp = Column(Integer, nullable=True)
    ttfb = Column(Float, nullable=True)
    load_time = Column(Float, nullable=True)
    dom_interactive = Column(Float, nullable=True)


class Component(Base):
    __tablename__ = "components"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("sessions.id"))
    name = Column(String)
    render_time = Column(Float)
    re_renders = Column(Integer)


class Suggestion(Base):
    __tablename__ = "suggestions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("sessions.id"))
    issue = Column(Text)
    fix = Column(Text)
    category = Column(String)
    impact_score = Column(Float)
    code_snippet = Column(Text, nullable=True)


# ── Engine & Session factory ──────────────────────────────────────────────────

_engine = None
_session_factory = None


def get_engine():
    global _engine
    if _engine is None:
        settings = get_settings()
        _engine = create_async_engine(
            settings.database_url,
            echo=False,
            pool_size=5,
            max_overflow=10,
        )
    return _engine


def get_session_factory():
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(get_engine(), expire_on_commit=False)
    return _session_factory


async def get_db():
    factory = get_session_factory()
    async with factory() as session:
        yield session


async def init_db():
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
