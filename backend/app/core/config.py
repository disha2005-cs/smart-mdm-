from pydantic_settings import BaseSettings
from typing import List, Union
import json

class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Mid-Day Meal Management System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["*"] # Adjust in production
    
    # Database
    DATABASE_URL: str
    
    # JWT Auth
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # AWS S3
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    AWS_S3_BUCKET: str = ""
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
