"""
Core analyzer: orchestrates rule engine + AI, stores results, calculates score.
"""

from datetime import datetime, timezone
from app.models.schemas import PerformanceUpload, AnalysisResult, Suggestion
from app.models.database import AsyncSession, Session as DBSession, Metric, Component
from app.models.database import Suggestion as DBSuggestion
from app.services.rule_engine import run_rules
from app.services.groq_service import get_ai_suggestions
from app.services.cache import cache_get, cache_set
import uuid


def compute_score(metrics) -> int:
    """Weighted performance score 0–100."""
    weights = {"LCP": 0.25, "CLS": 0.15, "INP": 0.30, "TTFB": 0.10, "loadTime": 0.20}
    normalized = {
        "LCP":      max(0, 1 - (metrics.LCP or 2.5) / 4.0),
        "CLS":      max(0, 1 - (metrics.CLS or 0.1) / 0.25),
        "INP":      max(0, 1 - (metrics.INP or 200) / 500),
        "TTFB":     max(0, 1 - (metrics.TTFB or 0.8) / 2.0),
        "loadTime": max(0, 1 - (metrics.loadTime or 2.0) / 5.0),
    }
    score = sum(normalized[k] * w for k, w in weights.items())
    return round(score * 100)


async def store_session(db: AsyncSession, data: PerformanceUpload, score: int) -> None:
    # Upsert session
    session = DBSession(id=data.sessionId, url=data.url, score=score)
    await db.merge(session)

    # Metric row
    m = data.metrics
    metric = Metric(
        id=str(uuid.uuid4()),
        session_id=data.sessionId,
        lcp=m.LCP, cls=m.CLS, inp=m.INP,
        ttfb=m.TTFB, load_time=m.loadTime,
        dom_interactive=m.domInteractive,
    )
    db.add(metric)

    # Component rows
    for comp in data.components:
        db.add(Component(
            id=str(uuid.uuid4()),
            session_id=data.sessionId,
            name=comp.name,
            render_time=comp.renderTime,
            re_renders=comp.reRenders,
        ))

    await db.commit()


async def store_suggestions(db: AsyncSession, session_id: str, suggestions: list[Suggestion]) -> None:
    for s in suggestions:
        db.add(DBSuggestion(
            id=s.id,
            session_id=session_id,
            issue=s.issue,
            fix=s.fix,
            category=s.category,
            impact_score=s.impact_score,
            code_snippet=s.code_snippet,
        ))
    await db.commit()


async def analyze_session(data: PerformanceUpload, db: AsyncSession) -> AnalysisResult:
    cache_key = f"analysis:{data.sessionId}"
    cached = await cache_get(cache_key)
    if cached:
        return AnalysisResult(**cached)

    score = compute_score(data.metrics)

    # 1. Rule-based (fast, deterministic)
    rule_suggestions = run_rules(data)
    rule_issues = [s.issue for s in rule_suggestions]

    # 2. AI suggestions (async, Groq Llama 3)
    ai_suggestions = await get_ai_suggestions(data, rule_issues)

    # Merge: rules first, then AI (deduplicated by category limit)
    all_suggestions = rule_suggestions + ai_suggestions
    seen_categories: dict[str, int] = {}
    deduped = []
    for s in all_suggestions:
        count = seen_categories.get(s.category, 0)
        if count < 3:  # max 3 per category
            deduped.append(s)
            seen_categories[s.category] = count + 1

    result = AnalysisResult(
        sessionId=data.sessionId,
        score=score,
        suggestions=deduped[:10],
        analyzed_at=datetime.now(timezone.utc).isoformat(),
    )

    # Persist
    try:
        await store_session(db, data, score)
        await store_suggestions(db, data.sessionId, deduped[:10])
    except Exception as e:
        print(f"[DB] Store error: {e}")

    # Cache result
    await cache_set(cache_key, result.model_dump())
    return result
