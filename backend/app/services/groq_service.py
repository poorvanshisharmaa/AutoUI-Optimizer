"""
Groq AI Service - Uses Llama 3 via Groq's free API for ultra-fast inference.
Generates detailed code fixes and optimization explanations.
"""

import json
from groq import AsyncGroq
from app.config.settings import get_settings
from app.models.schemas import PerformanceUpload, Suggestion

MODEL = "llama3-70b-8192"  # Free, fast, high quality


def _build_analysis_prompt(data: PerformanceUpload, rule_issues: list[str]) -> str:
    vitals = data.metrics
    top_components = sorted(data.components, key=lambda c: c.renderTime, reverse=True)[:5]
    heavy_resources = sorted(data.resources, key=lambda r: r.duration, reverse=True)[:3]

    return f"""You are an expert React/web performance engineer. Analyze this performance data and provide 3-5 specific, actionable optimization suggestions.

URL: {data.url}

CORE WEB VITALS:
- LCP: {vitals.LCP}s (good: <2.5s)
- CLS: {vitals.CLS} (good: <0.1)
- INP: {vitals.INP}ms (good: <200ms)
- TTFB: {vitals.TTFB}s (good: <0.8s)
- Load Time: {vitals.loadTime}s

SLOWEST REACT COMPONENTS:
{chr(10).join(f'- {c.name}: {c.renderTime}ms, {c.reRenders} re-renders' for c in top_components) or 'None detected'}

HEAVIEST RESOURCES:
{chr(10).join(f'- {r.name} ({r.type}): {r.duration}ms, {r.transferSize//1024}KB' for r in heavy_resources) or 'None detected'}

ALREADY DETECTED ISSUES (do not repeat these, find NEW issues):
{chr(10).join(f'- {i}' for i in rule_issues) or 'None'}

Return a JSON array of suggestions. Each suggestion must have:
- "issue": concise problem description (1 sentence)
- "fix": specific solution with technical details (2-3 sentences)
- "category": one of "render" | "bundle" | "network" | "vitals" | "architecture"
- "impact_score": float 0.0-1.0 (how much this will improve performance)
- "code_snippet": optional working code example (string, use real React/JS code)

Return ONLY valid JSON array, no markdown, no explanation outside JSON."""


def _build_fix_prompt(component_name: str, issue: str) -> str:
    return f"""You are an expert React performance engineer. Generate a complete, production-ready code fix.

Component: {component_name}
Issue: {issue}

Provide:
1. The optimized component code with React.memo, useMemo, useCallback as appropriate
2. Brief explanation of what was wrong and why this fix works

Return a JSON object:
{{
  "optimized_code": "// full component code here",
  "explanation": "what was wrong and why the fix works",
  "performance_gain": "estimated improvement (e.g. '40% fewer re-renders')"
}}

Return ONLY valid JSON, no markdown."""


async def get_ai_suggestions(
    data: PerformanceUpload,
    rule_issues: list[str],
) -> list[Suggestion]:
    settings = get_settings()
    if not settings.groq_api_key:
        return []

    client = AsyncGroq(api_key=settings.groq_api_key)
    prompt = _build_analysis_prompt(data, rule_issues)

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a web performance expert. Always return valid JSON only.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=2048,
        )

        content = response.choices[0].message.content.strip()
        # Strip potential markdown code fences
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]

        raw = json.loads(content)
        suggestions = []
        for item in raw:
            try:
                suggestions.append(
                    Suggestion(
                        issue=item["issue"],
                        fix=item["fix"],
                        category=item.get("category", "render"),
                        impact_score=float(item.get("impact_score", 0.3)),
                        code_snippet=item.get("code_snippet"),
                    )
                )
            except (KeyError, ValueError):
                continue
        return suggestions

    except Exception as e:
        print(f"[Groq] Error: {e}")
        return []


async def generate_code_fix(component_name: str, issue: str) -> dict:
    settings = get_settings()
    if not settings.groq_api_key:
        return {"error": "GROQ_API_KEY not configured"}

    client = AsyncGroq(api_key=settings.groq_api_key)
    prompt = _build_fix_prompt(component_name, issue)

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": "You are a React performance expert. Return only valid JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=2048,
        )
        content = response.choices[0].message.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        return json.loads(content)
    except Exception as e:
        return {"error": str(e)}
