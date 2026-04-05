"""
MongoDB connection using Motor (async driver).
Each session is stored as a single document — no joins needed.

Document shape in `sessions` collection:
{
  "_id": "session-uuid",
  "url": "https://...",
  "score": 72,
  "created_at": ISODate,
  "metrics": { "LCP": 3.1, "CLS": 0.05, "INP": 210, ... },
  "components": [ { "name": "Dashboard", "renderTime": 120, "reRenders": 5 }, ... ],
  "resources":  [ { "name": "bundle.js", "type": "script", "duration": 800, ... }, ... ],
  "suggestions": [
    { "id": "...", "issue": "...", "fix": "...", "category": "render", "impact_score": 0.4, "code_snippet": "..." },
    ...
  ]
}
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config.settings import get_settings

_client: AsyncIOMotorClient | None = None


def _clean_mongo_url(url: str) -> str:
    """
    Fix common corruption that happens when copy-pasting MongoDB URIs
    into environment variable dashboards (Render, Railway, etc.).
    - &amp; → &   (HTML entity encoding)
    - strips accidental whitespace / newlines
    """
    return url.strip().replace("&amp;", "&").replace("%26", "&")


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        settings = get_settings()
        url = _clean_mongo_url(settings.mongodb_url)
        _client = AsyncIOMotorClient(url)
    return _client


def get_db() -> AsyncIOMotorDatabase:
    settings = get_settings()
    return get_client()[settings.mongodb_db_name]


async def init_db() -> None:
    """Create indexes on startup. Non-fatal — app starts even if Atlas is unreachable."""
    try:
        db = get_db()
        await db.sessions.create_index("created_at")
        await db.sessions.create_index([("url", 1), ("created_at", -1)])
        print("[DB] MongoDB connected and indexes ready.")
    except Exception as e:
        # Log but don't crash — bad credentials / network won't kill the server
        print(f"[DB] WARNING: Could not connect to MongoDB at startup: {e}")
        print("[DB] Fix MONGODB_URL in Render env vars, then redeploy.")


async def close_db() -> None:
    global _client
    if _client:
        _client.close()
        _client = None
