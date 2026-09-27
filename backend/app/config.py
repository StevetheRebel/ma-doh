from functools import lru_cache

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str = "postgresql+psycopg://money:money@localhost:5432/money"
    supabase_url: str = ""
    supabase_publishable_key: str = ""
    cors_origins: list[str] = []
    retain_source_text: bool = False
    gemini_api_key: SecretStr = SecretStr("")
    gemini_model: str = "gemini-2.5-flash"
    hf_token: SecretStr = SecretStr("")
    hf_inference_base_url: str = "https://router.huggingface.co"
    hf_vision_model: str = "Qwen/Qwen2.5-VL-7B-Instruct"
    hf_transcription_model: str = "openai/whisper-large-v3-turbo"
    ai_timeout_seconds: float = Field(default=45, gt=0, le=120)
    max_upload_mb: int = Field(default=10, ge=1, le=20)

    @field_validator("supabase_url")
    @classmethod
    def auth_url(cls, value):
        from urllib.parse import urlparse

        if not value:
            return value
        parsed = urlparse(value)
        if parsed.scheme != "https" and not (
            parsed.scheme == "http" and parsed.hostname in ("localhost", "127.0.0.1")
        ):
            raise ValueError(
                "SUPABASE_URL must use HTTPS (HTTP is only allowed for local development)."
            )
        if (
            not parsed.hostname
            or parsed.username
            or parsed.password
            or parsed.query
            or parsed.fragment
        ):
            raise ValueError(
                "SUPABASE_URL must be a project base URL without credentials or query parameters."
            )
        return value.rstrip("/")


@lru_cache
def settings() -> Settings:
    return Settings()
