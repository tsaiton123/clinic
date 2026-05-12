from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./clinic.db"
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 60 * 24
    algorithm: str = "HS256"
    allowed_origins: str = "http://127.0.0.1:5173,http://localhost:5173"
    allowed_origin_regex: str = r"http://(127\.0\.0\.1|localhost):\d+"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
