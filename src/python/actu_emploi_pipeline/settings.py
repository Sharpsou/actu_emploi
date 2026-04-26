from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

_DOTENV_LOADED = False


def _load_dotenv() -> None:
    global _DOTENV_LOADED
    if _DOTENV_LOADED:
        return
    _DOTENV_LOADED = True

    env_path = Path(__file__).resolve().parents[3] / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, raw_value = line.split("=", 1)
        key = key.strip()
        value = raw_value.strip()
        if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
            value = value[1:-1]
        os.environ.setdefault(key, value)


@dataclass(slots=True)
class Settings:
    use_fixtures: bool
    enable_france_travail: bool
    enable_jooble: bool
    public_request_timeout_seconds: int
    public_request_delay_seconds: float
    public_max_jobs_per_role: int
    public_max_requests_per_source: int
    public_cache_ttl_seconds: int
    france_travail_search_radius_km: int
    france_travail_search_sort: str
    france_travail_search_url: str
    jooble_search_url: str
    default_search_location: str
    default_search_location_label: str
    jooble_api_key: str | None
    lightweight_llm_enabled: bool
    lightweight_llm_endpoint_url: str
    lightweight_llm_amd_endpoint_url: str | None
    lightweight_llm_model: str
    lightweight_llm_timeout_seconds: int
    lightweight_llm_device: str
    lightweight_llm_keep_alive: str


def get_settings() -> Settings:
    _load_dotenv()

    return Settings(
        use_fixtures=os.getenv("ACTU_EMPLOI_USE_FIXTURES", "1") == "1",
        enable_france_travail=os.getenv("ENABLE_FRANCE_TRAVAIL", "1") == "1",
        enable_jooble=os.getenv("ENABLE_JOOBLE", "0") == "1",
        public_request_timeout_seconds=int(os.getenv("PUBLIC_REQUEST_TIMEOUT_SECONDS", "20")),
        public_request_delay_seconds=float(os.getenv("PUBLIC_REQUEST_DELAY_SECONDS", "2.0")),
        public_max_jobs_per_role=int(os.getenv("PUBLIC_MAX_JOBS_PER_ROLE", "3")),
        public_max_requests_per_source=int(os.getenv("PUBLIC_MAX_REQUESTS_PER_SOURCE", "30")),
        public_cache_ttl_seconds=int(os.getenv("PUBLIC_CACHE_TTL_SECONDS", "21600")),
        france_travail_search_radius_km=int(os.getenv("FRANCE_TRAVAIL_SEARCH_RADIUS_KM", "10")),
        france_travail_search_sort=os.getenv("FRANCE_TRAVAIL_SEARCH_SORT", "0"),
        france_travail_search_url=os.getenv(
            "FRANCE_TRAVAIL_SEARCH_URL",
            "https://candidat.francetravail.fr/offres/recherche",
        ),
        jooble_search_url=os.getenv(
            "JOOBLE_SEARCH_URL",
            "https://fr.jooble.org/emploi-{role_slug}/{location_slug}",
        ),
        default_search_location=os.getenv("DEFAULT_SEARCH_LOCATION", "99100"),
        default_search_location_label=os.getenv("DEFAULT_SEARCH_LOCATION_LABEL", "France"),
        jooble_api_key=os.getenv("JOOBLE_API_KEY"),
        lightweight_llm_enabled=os.getenv("LIGHTWEIGHT_LLM_ENABLED", "0") == "1",
        lightweight_llm_endpoint_url=os.getenv(
            "LIGHTWEIGHT_LLM_ENDPOINT_URL",
            "http://localhost:11434/v1/chat/completions",
        ),
        lightweight_llm_amd_endpoint_url=os.getenv("LIGHTWEIGHT_LLM_AMD_ENDPOINT_URL") or None,
        lightweight_llm_model=os.getenv("LIGHTWEIGHT_LLM_MODEL", "qwen2.5:3b"),
        lightweight_llm_timeout_seconds=int(os.getenv("LIGHTWEIGHT_LLM_TIMEOUT_SECONDS", "20")),
        lightweight_llm_device=os.getenv("LIGHTWEIGHT_LLM_DEVICE", "auto"),
        lightweight_llm_keep_alive=os.getenv("LIGHTWEIGHT_LLM_KEEP_ALIVE", "30s"),
    )
