"""
Rule Engine - Static performance rules that run instantly (no AI call).
Rules produce Suggestion objects that get merged with AI suggestions.
"""

from app.models.schemas import PerformanceUpload, Suggestion


RULES = []


def rule(fn):
    RULES.append(fn)
    return fn


@rule
def lcp_too_slow(data: PerformanceUpload) -> list[Suggestion]:
    if data.metrics.LCP and data.metrics.LCP > 2.5:
        severity = "critical" if data.metrics.LCP > 4.0 else "warning"
        return [Suggestion(
            issue=f"LCP is {data.metrics.LCP}s — above the 2.5s threshold",
            fix="Preload your hero image with <link rel='preload'>. Serve images in WebP format. Use a CDN.",
            category="vitals",
            impact_score=0.35 if severity == "critical" else 0.2,
            code_snippet='<link rel="preload" as="image" href="/hero.webp" fetchpriority="high" />'
        )]
    return []


@rule
def cls_too_high(data: PerformanceUpload) -> list[Suggestion]:
    if data.metrics.CLS and data.metrics.CLS > 0.1:
        return [Suggestion(
            issue=f"CLS score of {data.metrics.CLS} — elements are shifting during load",
            fix="Add explicit width/height to images and embeds. Reserve space for ads/iframes.",
            category="vitals",
            impact_score=0.25,
            code_snippet="img { width: 800px; height: 450px; } /* Always set dimensions */"
        )]
    return []


@rule
def inp_too_slow(data: PerformanceUpload) -> list[Suggestion]:
    if data.metrics.INP and data.metrics.INP > 200:
        return [Suggestion(
            issue=f"INP is {data.metrics.INP}ms — interactions feel sluggish",
            fix="Break up long tasks with scheduler.yield(). Debounce event handlers. Move work off main thread.",
            category="vitals",
            impact_score=0.3,
            code_snippet="""// Break long tasks
async function processItems(items) {
  for (const item of items) {
    process(item);
    await scheduler.yield(); // yield to browser between items
  }
}"""
        )]
    return []


@rule
def slow_components(data: PerformanceUpload) -> list[Suggestion]:
    results = []
    for comp in data.components:
        if comp.renderTime > 50:
            results.append(Suggestion(
                issue=f"<{comp.name}> takes {comp.renderTime}ms to render",
                fix=f"Wrap <{comp.name}> with React.memo(). Move expensive computations to useMemo().",
                category="render",
                impact_score=min(0.9, comp.renderTime / 200),
                code_snippet=f"""// Memoize {comp.name}
export default React.memo({comp.name});

// Inside component, memoize expensive values:
const result = useMemo(() => expensiveCalc(data), [data]);"""
            ))
    return results


@rule
def excessive_rerenders(data: PerformanceUpload) -> list[Suggestion]:
    results = []
    for comp in data.components:
        if comp.reRenders > 5:
            results.append(Suggestion(
                issue=f"<{comp.name}> re-renders {comp.reRenders}x — likely missing dependency optimization",
                fix="Use useCallback for event handlers. Check if parent is passing new object references each render.",
                category="render",
                impact_score=min(0.8, comp.reRenders / 20),
                code_snippet=f"""// Stabilize callbacks in parent
const handle{comp.name}Click = useCallback(() => {{
  // handler logic
}}, [/* stable deps only */]);"""
            ))
    return results


@rule
def heavy_resources(data: PerformanceUpload) -> list[Suggestion]:
    results = []
    total_js = sum(r.encodedSize for r in data.resources if r.type == "script")
    if total_js > 500_000:
        results.append(Suggestion(
            issue=f"Total JS bundle is {total_js // 1024}KB — exceeds 500KB recommended limit",
            fix="Enable code splitting with dynamic import(). Use tree-shaking. Analyze bundle with webpack-bundle-analyzer.",
            category="bundle",
            impact_score=0.4,
            code_snippet="""// Lazy load heavy routes
const HeavyPage = lazy(() => import('./HeavyPage'));

// Lazy load components below the fold
const Chart = lazy(() => import('./Chart'));"""
        ))
    slow_resources = [r for r in data.resources if r.duration > 1000]
    for r in slow_resources[:2]:
        results.append(Suggestion(
            issue=f"Resource '{r.name}' took {r.duration}ms to load",
            fix="Host static assets on a CDN. Enable compression (gzip/brotli). Use HTTP/2.",
            category="network",
            impact_score=0.3,
        ))
    return results


def run_rules(data: PerformanceUpload) -> list[Suggestion]:
    suggestions = []
    for rule_fn in RULES:
        suggestions.extend(rule_fn(data))
    # Sort by impact descending
    return sorted(suggestions, key=lambda s: s.impact_score, reverse=True)
