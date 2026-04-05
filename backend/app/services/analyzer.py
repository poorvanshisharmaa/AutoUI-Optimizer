"""
Core analyzer: orchestrates rule engine + AI, stores result as a single MongoDB document.
"""

from datetime import datetime, timezone
from app.models.schemas import PerformanceUpload, AnalysisResult, Suggestion
from app.models.database import get_db
from app.services.rule_engine import run_rules
from app.services.groq_service import get_ai_suggestions
from app.services.cache import cache_get, cache_set


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


def _suggestion_to_dict(s: Suggestion) -> dict:
    return {
        "id": s.id,
        "issue": s.issue,
        "fix": s.fix,
        "category": s.category,
        "impact_score": s.impact_score,
        "code_snippet": s.code_snippet,
    }


async def analyze_session(data: PerformanceUpload) -> AnalysisResult:
    cache_key = f"analysis:{data.sessionId}"
    cached = await cache_get(cache_key)
    if cached:
        return AnalysisResult(**cached)

    score = compute_score(data.metrics)

    # 1. Rule-based (fast, deterministic)
    rule_suggestions = run_rules(data)
    rule_issues = [s.issue for s in rule_suggestions]

    # 2. AI suggestions via Groq + Llama 3
    ai_suggestions = await get_ai_suggestions(data, rule_issues)

    # Merge — cap at 3 per category, 10 total
    all_suggestions = rule_suggestions + ai_suggestions
    seen: dict[str, int] = {}
    deduped: list[Suggestion] = []
    for s in all_suggestions:
        if seen.get(s.category, 0) < 3:
            deduped.append(s)
            seen[s.category] = seen.get(s.category, 0) + 1
    deduped = deduped[:10]

    # 3. Upsert single document into MongoDB (one doc = one session, everything embedded)
    db = get_db()
    doc = {
        "_id": data.sessionId,
        "url": data.url,
        "score": score,
        "created_at": datetime.now(timezone.utc),
        "metrics": data.metrics.model_dump(exclude_none=True),
        "components": [c.model_dump() for c in data.components],
        "resources": [r.model_dump() for r in data.resources],
        "suggestions": [_suggestion_to_dict(s) for s in deduped],
    }
    try:
        await db.sessions.replace_one({"_id": data.sessionId}, doc, upsert=True)
    except Exception as e:
        print(f"[MongoDB] Write error: {e}")

    result = AnalysisResult(
        sessionId=data.sessionId,
        score=score,
        suggestions=deduped,
        analyzed_at=datetime.now(timezone.utc).isoformat(),
    )

    await cache_set(cache_key, result.model_dump())
    return result


async def get_session_document(session_id: str) -> dict | None:
    """Fetch the full session document from MongoDB."""
    db = get_db()
    doc = await db.sessions.find_one({"_id": session_id})
    return doc


async def get_recent_sessions(limit: int = 20) -> list[dict]:
    """Fetch most recent sessions for the dashboard overview."""
    db = get_db()
    cursor = db.sessions.find(
        {},
        {"_id": 1, "url": 1, "score": 1, "created_at": 1}
    ).sort("created_at", -1).limit(limit)
    return await cursor.to_list(length=limit)
