from __future__ import annotations

import os
from dataclasses import dataclass


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


def get_settings() -> Settings:
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
    )
