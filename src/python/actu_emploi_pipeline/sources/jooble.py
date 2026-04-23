from __future__ import annotations

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
    slugify_for_path,
    strip_html,
)


class JoobleSource:
    source_name = "Jooble"

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
            notes="",
            updated_at="",
        )

        jobs: list[SourceJobPayload] = []
        seen_ids: set[str] = set()
        location_value = effective_profile.preferred_locations[0] if effective_profile.preferred_locations else self.settings.default_search_location

        for role in effective_profile.target_roles:
            search_url = self.settings.jooble_search_url.format(
                role_slug=slugify_for_path(role),
                location_slug=slugify_for_path(location_value),
            )
            search_html = self.fetcher.fetch_text(search_url)
            detail_urls = extract_item_list_urls(search_html)
            if not detail_urls:
                detail_urls = extract_links_by_pattern(
                    search_html,
                    r'href=["\'](/jdp/\d+)["\']',
                    "https://fr.jooble.org",
                )
            detail_urls = detail_urls[: self.settings.public_max_jobs_per_role]

            for detail_url in detail_urls:
                payload = self._fetch_detail(detail_url, role, location_value)
                if not payload or payload.source_job_id in seen_ids:
                    continue
                seen_ids.add(payload.source_job_id)
                jobs.append(payload)

        return jobs

    def _fetch_detail(self, detail_url: str, role: str, location_value: str) -> SourceJobPayload | None:
        full_url = absolute_url("https://fr.jooble.org", detail_url)
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
        description_text = strip_html(str(posting.get("description") or ""))
        company_name = self._extract_company_name(posting)
        location_text = self._extract_location_text(posting) or location_value
        employment_type = posting.get("employmentType")
        if isinstance(employment_type, list):
            contract_type = ", ".join(str(item) for item in employment_type)
        else:
            contract_type = str(employment_type or "NC")

        remote_mode = "remote" if "télétravail" in description_text.lower() or "remote" in description_text.lower() else "onsite"

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
        return ""
