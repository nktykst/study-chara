from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    clerk_secret_key: str
    encryption_key: str
    default_gemini_api_key: Optional[str] = None
    frontend_url: Optional[str] = None  # 本番フロントエンドURL

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
