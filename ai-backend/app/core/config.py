"""FastAPI application configuration (pydantic-settings).

Every value can be overridden by environment variables or a local .env file.
No credentials are hard-coded; see .env.example at the repository root.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "RxRevive AI Backend"
    app_version: str = "2.0.0"
    debug: bool = False

    # --- NLP engines -------------------------------------------------------
    sbert_model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    sbert_device: str = "auto"  # auto | cpu | cuda
    sbert_max_chars: int = 6000  # per document fed to the encoder
    score_weight_similarity: float = 0.6
    score_weight_skills: float = 0.4

    # --- uploads -----------------------------------------------------------
    max_upload_mb: int = 8
    allowed_extensions: str = "pdf,docx,txt,md"

    # --- auth --------------------------------------------------------------
    # Clerk domain, e.g. https://your-app.clerk.accounts.dev  (no trailing slash)
    clerk_jwt_issuer_domain: str = ""
    clerk_jwt_audience: str = ""
    # Server-to-server secret shared with the Next.js API routes.
    python_api_secret: str = ""
    # When true (local dev only) unauthenticated requests run as an anonymous
    # identity. Never enable in production; the app reports this state openly.
    auth_disabled: bool = True

    # --- persistence -------------------------------------------------------
    generated_reports_dir: str = "../generated_reports"
    datasets_dir: str = "../datasets/experiments"

    # --- Gemini (Google AI Studio) resume assist ---------------------------
    # Key from https://aistudio.google.com/apikey . Without it the assist
    # endpoints report "not configured" honestly; nothing else changes.
    gemini_api_key: str = ""
    gemini_model: str = "gemini-flash-latest"
    gemini_timeout_s: int = 90

    # --- background processing (optional) -----------------------------------
    redis_url: str = ""

    @property
    def allowed_extension_list(self) -> list[str]:
        return [e.strip().lower() for e in self.allowed_extensions.split(",") if e.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
