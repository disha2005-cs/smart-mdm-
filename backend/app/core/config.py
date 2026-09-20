import json
from typing import List, Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Mid-Day Meal Management System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # CORS: a comma-separated list or a JSON array of production origins.
    BACKEND_CORS_ORIGINS: str | List[str] = ""
    FRONTEND_URL: Optional[str] = None

    # Database
    DATABASE_URL: str

    # JWT Auth
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # AWS S3 (optional - photo storage falls back to local disk without it)
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: Optional[str] = None
    AWS_S3_BUCKET: Optional[str] = None

    @field_validator("JWT_SECRET_KEY")
    @classmethod
    def _secret_must_be_strong(cls, value: str) -> str:
        # A short or placeholder secret makes every issued token forgeable, so
        # fail loudly at boot rather than silently running insecurely.
        if not value or len(value) < 32:
            raise ValueError(
                "JWT_SECRET_KEY must be at least 32 characters. "
                "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(48))\""
            )
        if value.lower() in {"secret", "changeme", "your-secret-key", "supersecret"}:
            raise ValueError("JWT_SECRET_KEY is a known placeholder value; set a real secret.")
        return value

    @field_validator("DATABASE_URL")
    @classmethod
    def _database_url_present(cls, value: str) -> str:
        if not value or "://" not in value:
            raise ValueError("DATABASE_URL must be a valid connection string")
        return value

    def cors_origins(self) -> List[str]:
        """Extra allowed origins from the environment, as a clean list."""
        origins: List[str] = []

        raw = self.BACKEND_CORS_ORIGINS
        if isinstance(raw, list):
            origins.extend(raw)
        elif isinstance(raw, str) and raw.strip():
            text = raw.strip()
            if text.startswith("["):
                try:
                    origins.extend(json.loads(text))
                except json.JSONDecodeError:
                    pass
            else:
                origins.extend(part.strip() for part in text.split(","))

        if self.FRONTEND_URL:
            origins.append(self.FRONTEND_URL)

        # "*" with allow_credentials=True is rejected by browsers, so it is
        # dropped here rather than silently breaking every authenticated call.
        return [origin.rstrip("/") for origin in origins if origin and origin.strip() != "*"]

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"


settings = Settings()
