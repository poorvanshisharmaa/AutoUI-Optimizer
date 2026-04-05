from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    PerformanceUpload, AnalyzeRequest, FixRequest,
    AnalysisResult, CompareResult,
)
from app.services.analyzer import (
    analyze_session, get_session_document,
    get_recent_sessions, compute_score,
)
from app.services.groq_service import generate_code_fix
from app.services.cache import cache_get
from app.models.schemas import WebVitals

router = APIRouter(prefix="/api/v1", tags=["performance"])


@router.post("/performance/upload")
async def upload_performance(data: PerformanceUpload):
    """Receive performance data from the Chrome extension and run analysis."""
    result = await analyze_session(data)
    return {
        "sessionId": data.sessionId,
        "score": result.score,
        "message": "Analysis complete",
        "suggestion_count": len(result.suggestions),
    }


@router.post("/analyze", response_model=AnalysisResult)
async def analyze(req: AnalyzeRequest):
    """Re-fetch cached analysis for an existing session."""
    cached = await cache_get(f"analysis:{req.sessionId}")
    if cached:
        return AnalysisResult(**cached)

    doc = await get_session_document(req.sessionId)
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found.")

    return AnalysisResult(
        sessionId=doc["_id"],
        score=doc["score"],
        suggestions=doc.get("suggestions", []),
        analyzed_at=doc["created_at"].isoformat(),
    )


@router.get("/suggestions/{session_id}")
async def get_suggestions(session_id: str):
    """Get suggestions for a session (used by extension popup)."""
    cached = await cache_get(f"analysis:{session_id}")
    if cached:
        return {"sessionId": session_id, "suggestions": cached.get("suggestions", [])}

    doc = await get_session_document(session_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found.")

    return {"sessionId": session_id, "suggestions": doc.get("suggestions", [])}


@router.get("/session/{session_id}")
async def get_session(session_id: str):
    """Get full session document including metrics and components."""
    doc = await get_session_document(session_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found.")

    # MongoDB stores _id; normalise for the frontend
    doc["sessionId"] = doc.pop("_id")
    if "created_at" in doc:
        doc["created_at"] = doc["created_at"].isoformat()
    return doc


@router.get("/sessions")
async def list_sessions(limit: int = 20):
    """List recent sessions for the dashboard overview page."""
    sessions = await get_recent_sessions(limit)
    return [
        {
            "sessionId": s["_id"],
            "url": s.get("url", ""),
            "score": s.get("score"),
            "created_at": s["created_at"].isoformat() if s.get("created_at") else None,
        }
        for s in sessions
    ]


@router.post("/fix")
async def generate_fix(req: FixRequest):
    """Generate an AI-powered code fix for a specific component issue."""
    return await generate_code_fix(req.componentName, req.issue)


@router.get("/compare")
async def compare_sessions(before: str, after: str):
    """Compare performance scores between two sessions."""
    before_doc = await get_session_document(before)
    after_doc  = await get_session_document(after)

    if not before_doc or not after_doc:
        raise HTTPException(status_code=404, detail="One or both sessions not found.")

    def doc_to_vitals(doc: dict) -> WebVitals:
        m = doc.get("metrics", {})
        return WebVitals(
            LCP=m.get("LCP"), CLS=m.get("CLS"), INP=m.get("INP"),
            TTFB=m.get("TTFB"), loadTime=m.get("loadTime"),
        )

    before_score = compute_score(doc_to_vitals(before_doc))
    after_score  = compute_score(doc_to_vitals(after_doc))

    bm = before_doc.get("metrics", {})
    am = after_doc.get("metrics", {})
    improved = [
        k for k in ["LCP", "CLS", "INP", "TTFB"]
        if bm.get(k) and am.get(k) and am[k] < bm[k]
    ]

    return CompareResult(
        before_score=before_score,
        after_score=after_score,
        improvement_percent=round((after_score - before_score) / max(before_score, 1) * 100, 1),
        improved_metrics=improved,
    )


@router.get("/health")
async def health():
    return {"status": "ok", "service": "autoui-optimizer"}
