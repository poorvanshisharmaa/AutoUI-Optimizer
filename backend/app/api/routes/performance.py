from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.models.schemas import (
    PerformanceUpload, AnalyzeRequest, FixRequest,
    AnalysisResult, CompareResult
)
from app.models.database import get_db, Suggestion as DBSuggestion, Metric
from app.services.analyzer import analyze_session, compute_score
from app.services.groq_service import generate_code_fix
from app.services.cache import cache_get

router = APIRouter(prefix="/api/v1", tags=["performance"])


@router.post("/performance/upload")
async def upload_performance(
    data: PerformanceUpload,
    db: AsyncSession = Depends(get_db),
):
    """Receive performance data from Chrome extension."""
    result = await analyze_session(data, db)
    return {
        "sessionId": data.sessionId,
        "score": result.score,
        "message": "Analysis complete",
        "suggestion_count": len(result.suggestions),
    }


@router.post("/analyze", response_model=AnalysisResult)
async def analyze(
    req: AnalyzeRequest,
    db: AsyncSession = Depends(get_db),
):
    """Re-trigger analysis for an existing session."""
    cached = await cache_get(f"analysis:{req.sessionId}")
    if cached:
        return AnalysisResult(**cached)
    raise HTTPException(status_code=404, detail="Session not found. Upload data first.")


@router.get("/suggestions/{session_id}")
async def get_suggestions(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Fetch suggestions for a session."""
    cached = await cache_get(f"analysis:{session_id}")
    if cached:
        return {"sessionId": session_id, "suggestions": cached.get("suggestions", [])}

    # Fallback to DB
    result = await db.execute(
        select(DBSuggestion).where(DBSuggestion.session_id == session_id)
    )
    rows = result.scalars().all()
    if not rows:
        raise HTTPException(status_code=404, detail="No suggestions found for this session")

    return {
        "sessionId": session_id,
        "suggestions": [
            {
                "id": r.id,
                "issue": r.issue,
                "fix": r.fix,
                "category": r.category,
                "impact_score": r.impact_score,
                "code_snippet": r.code_snippet,
            }
            for r in rows
        ],
    }


@router.post("/fix")
async def generate_fix(req: FixRequest):
    """Generate AI-powered code fix for a specific component issue."""
    fix = await generate_code_fix(req.componentName, req.issue)
    return fix


@router.get("/compare")
async def compare_sessions(
    before: str,
    after: str,
    db: AsyncSession = Depends(get_db),
):
    """Compare performance between two sessions."""
    async def get_metrics(session_id: str):
        result = await db.execute(
            select(Metric).where(Metric.session_id == session_id)
        )
        return result.scalar_one_or_none()

    before_m = await get_metrics(before)
    after_m = await get_metrics(after)

    if not before_m or not after_m:
        raise HTTPException(status_code=404, detail="One or both sessions not found")

    def to_vitals(m):
        from app.models.schemas import WebVitals
        return WebVitals(LCP=m.lcp, CLS=m.cls, INP=m.inp, TTFB=m.ttfb, loadTime=m.load_time)

    before_score = compute_score(to_vitals(before_m))
    after_score = compute_score(to_vitals(after_m))

    improved = []
    if after_m.lcp and before_m.lcp and after_m.lcp < before_m.lcp:
        improved.append("LCP")
    if after_m.cls and before_m.cls and after_m.cls < before_m.cls:
        improved.append("CLS")
    if after_m.inp and before_m.inp and after_m.inp < before_m.inp:
        improved.append("INP")

    return CompareResult(
        before_score=before_score,
        after_score=after_score,
        improvement_percent=round((after_score - before_score) / max(before_score, 1) * 100, 1),
        improved_metrics=improved,
    )


@router.get("/health")
async def health():
    return {"status": "ok", "service": "autoui-optimizer"}
