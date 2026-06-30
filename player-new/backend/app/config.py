from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./vibeplayer.db"

    @property
    def async_database_url(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgresql://") and "+" not in url.split("://")[0]:
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "changeme-secret-key-please-rotate-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    S3_ENDPOINT: str = "https://your-account.r2.cloudflarestorage.com"
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_BUCKET: str = "vibeplayer-audio"
    S3_PUBLIC_URL: str = "https://pub-xxxxx.r2.dev"
    GOOGLE_CLIENT_ID: str = ""
    APPLE_CLIENT_ID: str = ""
    CORS_ORIGINS: str = "http://localhost:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
