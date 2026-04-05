from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    groq_api_key: str = ""
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "autoui"
    redis_url: str = ""
    secret_key: str = "dev-secret-key-change-in-prod"
    environment: str = "development"
    allowed_origins: str = "http://localhost:3000"

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
