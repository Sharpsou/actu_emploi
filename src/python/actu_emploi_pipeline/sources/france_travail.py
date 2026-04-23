from __future__ import annotations

import re
import unicodedata
import urllib.parse
from typing import Any

from actu_emploi_pipeline.fixtures import build_fixture_jobs
from actu_emploi_pipeline.models import CandidateProfile, SourceJobPayload
from actu_emploi_pipeline.settings import get_settings
from actu_emploi_pipeline.sources.public_web import (
    PublicWebFetcher,
    absolute_url,
    extract_links_by_pattern,
    extract_item_list_urls,
    extract_job_posting,
    strip_html,
)


REMOTE_ONLY_MARKERS = {
    "100% teletravail",
    "full remote",
    "fully remote",
    "entierement a distance",
    "teletravail complet",
}
HYBRID_MARKERS = {
    "teletravail",
    "hybride",
    "hybrid",
    "travail a distance",
    "remote partiel",
    "presentiel",
}
LOCATION_CODES = {
    "nantes": "44109",
    "saint-nazaire": "44184",
    "saint nazaire": "44184",
}


def normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return normalized.lower().replace("’", "'")


def detect_remote_mode(description_text: str) -> str:
    lowered = normalize_text(description_text)

    if any(marker in lowered for marker in REMOTE_ONLY_MARKERS):
        return "remote"
    if any(marker in lowered for marker in HYBRID_MARKERS):
        return "hybrid"
    return "onsite"


def matches_location_preference(location_text: str, preferred_locations: list[str]) -> bool:
    if not preferred_locations:
        return True

    normalized_location = normalize_text(location_text)
    city_preferences = [
        normalize_text(location)
        for location in preferred_locations
        if "remote" not in normalize_text(location) and "teletravail" not in normalize_text(location)
    ]

    if not city_preferences:
        return True

    return any(location in normalized_location for location in city_preferences)


class FranceTravailSource:
    source_name = "France Travail"

    def __init__(self) -> None:
        self.settings = get_settings()
        self.fetcher = PublicWebFetcher(self.settings, self.source_name)

    def fetch_jobs(self, profile: CandidateProfile | None = None) -> list[SourceJobPayload]:
        if self.settings.use_fixtures:
            return [job for job in build_fixture_jobs() if job.source == self.source_name]

        effective_profile = profile or CandidateProfile(
            id="profile-main",
            target_roles=["Data Analyst", "Data Scientist", "Data Engineer"],
            preferred_skills=[],
            excluded_keywords=[],
            preferred_locations=[],
            prefer_remote_friendly=False,
            notes="",
            updated_at="",
        )

        jobs: list[SourceJobPayload] = []
        seen_ids: set[str] = set()

        for role in effective_profile.target_roles:
            for search_location in self._build_search_locations(effective_profile):
                search_url = self._build_search_url(role, search_location)
                search_html = self.fetcher.fetch_text(search_url)
                detail_urls = extract_item_list_urls(search_html)
                if not detail_urls:
                    detail_urls = extract_links_by_pattern(
                        search_html,
                        r'href=["\'](/offres/recherche/detail/[^"\']+)["\']',
                        "https://candidat.francetravail.fr",
                    )
                detail_urls = detail_urls[: self.settings.public_max_jobs_per_role]

                for detail_url in detail_urls:
                    payload = self._fetch_detail(detail_url, role)
                    if not payload or payload.source_job_id in seen_ids:
                        continue
                    if not self._matches_profile_preferences(payload, effective_profile):
                        continue
                    seen_ids.add(payload.source_job_id)
                    jobs.append(payload)

        return jobs

    def _build_search_locations(self, profile: CandidateProfile) -> list[str]:
        explicit_locations = [
            LOCATION_CODES[normalize_text(location)]
            for location in profile.preferred_locations
            if normalize_text(location) in LOCATION_CODES
        ]

        if explicit_locations:
            return list(dict.fromkeys(explicit_locations))
        if self.settings.default_search_location:
            return [self.settings.default_search_location]
        return [""]

    def _build_search_url(self, role: str, location_value: str) -> str:
        params = {
            "motsCles": role,
            "offresPartenaires": "true",
            "rayon": str(self.settings.france_travail_search_radius_km),
            "tri": self.settings.france_travail_search_sort,
        }
        if location_value:
            params["lieux"] = location_value
        return f"{self.settings.france_travail_search_url}?{urllib.parse.urlencode(params)}"

    def _fetch_detail(self, detail_url: str, role: str) -> SourceJobPayload | None:
        full_url = absolute_url("https://candidat.francetravail.fr", detail_url)
        html = self.fetcher.fetch_text(full_url)
        posting = extract_job_posting(html)
        if not posting:
            return None

        identifier = posting.get("identifier")
        if isinstance(identifier, dict):
            source_job_id = str(identifier.get("value") or identifier.get("name") or detail_url.rsplit("/", 1)[-1])
        else:
            source_job_id = detail_url.rsplit("/", 1)[-1]

        title = str(posting.get("title") or role)
        description_html = str(posting.get("description") or "")
        description_text = strip_html(description_html)
        company_name = self._extract_company_name(posting)
        location_text = self._extract_location_text(posting)
        contract_type = self._extract_contract_type(posting, html)
        remote_mode = detect_remote_mode(description_text)

        return SourceJobPayload(
            source=self.source_name,
            source_job_id=source_job_id,
            title=title,
            company_name=company_name,
            location_text=location_text,
            remote_mode=remote_mode,
            contract_type=contract_type,
            seniority_text="NC",
            description_text=description_text,
            published_at=str(posting.get("datePosted") or "")[:10],
            payload_json={
                "detail_url": full_url,
                "search_role": role,
                "job_posting": posting,
            },
        )

    def _matches_profile_preferences(self, payload: SourceJobPayload, profile: CandidateProfile) -> bool:
        if not matches_location_preference(payload.location_text, profile.preferred_locations):
            return False
        return True

    def _extract_company_name(self, posting: dict[str, Any]) -> str:
        organization = posting.get("hiringOrganization")
        if isinstance(organization, dict):
            return str(organization.get("name") or "Entreprise non precisee")
        return "Entreprise non precisee"

    def _extract_location_text(self, posting: dict[str, Any]) -> str:
        location = posting.get("jobLocation")
        if isinstance(location, list) and location:
            location = location[0]
        if isinstance(location, dict):
            address = location.get("address")
            if isinstance(address, dict):
                parts = [
                    str(address.get("addressLocality") or "").strip(),
                    str(address.get("addressRegion") or "").strip(),
                    str(address.get("addressCountry") or "").strip(),
                ]
                parts = [part for part in parts if part]
                if parts:
                    return ", ".join(parts)
        return self.settings.default_search_location_label

    def _extract_contract_type(self, posting: dict[str, Any], html: str) -> str:
        match = re.search(
            r'<dt><span title="Type de contrat".*?</dt><dd>\s*(.*?)\s*</dd>',
            html,
            flags=re.IGNORECASE | re.DOTALL,
        )
        if match:
            value = strip_html(match.group(1))
            if value:
                return value

        employment_type = posting.get("employmentType")
        if isinstance(employment_type, list):
            joined = ", ".join(str(item) for item in employment_type if str(item).strip())
            if joined:
                return joined
        elif employment_type:
            return str(employment_type)

        return "NC"
