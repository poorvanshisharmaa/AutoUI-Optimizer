from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config.settings import get_settings
from app.api.routes.performance import router as perf_router
from app.models.database import init_db, close_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()   # creates MongoDB indexes
    yield
    await close_db()  # clean shutdown


settings = get_settings()

app = FastAPI(
    title="AutoUI Optimizer API",
    version="1.0.0",
    description="AI-powered web performance analysis backend — MongoDB + Groq",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list + ["chrome-extension://*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(perf_router)


@app.get("/")
async def root():
    return {"message": "AutoUI Optimizer API", "docs": "/docs"}
