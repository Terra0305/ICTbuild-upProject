from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Common
    app_env: str = "development"
    frontend_url: str = "http://localhost:3000"

    # Database
    database_url: str = "postgresql+psycopg://refind:refind@localhost:5432/refind"

    # Auth
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_access_expire_minutes: int = 30
    jwt_refresh_expire_days: int = 14

    # Public Data
    lost112_service_key: str = ""
    lost112_base_url: str = ""

    # Storage
    storage_endpoint: str = ""
    storage_bucket: str = ""
    storage_access_key: str = ""
    storage_secret_key: str = ""

    # AI
    text_model_name: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    image_model_name: str = "openai/clip-vit-base-patch32"
    faiss_index_dir: str = "/data/faiss"
    match_display_threshold: float = 0.50
    match_notification_threshold: float = 0.78

    # Email
    email_from: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""

    # Scheduler
    sync_cron_secret: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
