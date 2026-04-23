from __future__ import annotations

import re

from actu_emploi_pipeline.analysis.skill_extractor import extract_skills
from actu_emploi_pipeline.models import NormalizedJob, SourceJobPayload


def slugify(value: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return cleaned


def normalize_job(payload: SourceJobPayload) -> NormalizedJob:
    skills = extract_skills(" ".join([payload.title, payload.description_text]))
    canonical_job_key = "-".join(
        part for part in [slugify(payload.title), slugify(payload.location_text)] if part
    )

    return NormalizedJob(
        id=f"{payload.source.lower().replace(' ', '-')}-{payload.source_job_id.lower()}",
        source=payload.source,
        source_job_id=payload.source_job_id,
        canonical_job_key=canonical_job_key,
        title=payload.title,
        company_name=payload.company_name,
        location_text=payload.location_text,
        remote_mode=payload.remote_mode,
        contract_type=payload.contract_type,
        seniority_text=payload.seniority_text,
        description_text=payload.description_text,
        published_at=payload.published_at,
        skills_detected=skills,
    )
