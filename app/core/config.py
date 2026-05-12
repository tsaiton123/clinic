from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./clinic.db"
    secret_key: str = "change-me-in-production"
    bootstrap_token: str = ""
    access_token_expire_minutes: int = 60 * 24
    algorithm: str = "HS256"
    allowed_origins: str = "http://127.0.0.1:5173,http://localhost:5173"
    allowed_origin_regex: str = r"http://(127\.0\.0\.1|localhost):\d+"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def normalized_database_url(self) -> str:
        if self.database_url.startswith("postgres://"):
            return self.database_url.replace("postgres://", "postgresql+psycopg://", 1)
        if self.database_url.startswith("postgresql://"):
            return self.database_url.replace("postgresql://", "postgresql+psycopg://", 1)
        return self.database_url


settings = Settings()
