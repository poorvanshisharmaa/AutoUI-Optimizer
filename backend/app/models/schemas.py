from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


# ── Inbound ──────────────────────────────────────────────────────────────────

class ComponentMetric(BaseModel):
    name: str
    renderTime: float
    reRenders: int

class ResourceMetric(BaseModel):
    name: str
    type: str
    duration: int
    transferSize: int = 0
    encodedSize: int = 0

class WebVitals(BaseModel):
    LCP: Optional[float] = None
    CLS: Optional[float] = None
    INP: Optional[int] = None
    TTFB: Optional[float] = None
    loadTime: Optional[float] = None
    domInteractive: Optional[float] = None

class PerformanceUpload(BaseModel):
    sessionId: str
    url: str
    timestamp: Optional[int] = None
    metrics: WebVitals
    components: list[ComponentMetric] = []
    resources: list[ResourceMetric] = []

class AnalyzeRequest(BaseModel):
    sessionId: str

class FixRequest(BaseModel):
    sessionId: str
    componentName: str
    issue: str


# ── Outbound ─────────────────────────────────────────────────────────────────

class Suggestion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    issue: str
    fix: str
    category: str  # "render" | "bundle" | "network" | "vitals"
    impact_score: float  # 0–1
    code_snippet: Optional[str] = None

class AnalysisResult(BaseModel):
    sessionId: str
    score: int
    suggestions: list[Suggestion]
    analyzed_at: str

class CompareResult(BaseModel):
    before_score: int
    after_score: int
    improvement_percent: float
    improved_metrics: list[str]
