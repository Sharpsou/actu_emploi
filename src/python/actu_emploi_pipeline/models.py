from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(slots=True)
class SourceJobPayload:
    source: str
    source_job_id: str
    title: str
    company_name: str
    location_text: str
    remote_mode: str
    contract_type: str
    seniority_text: str
    description_text: str
    published_at: str
    payload_json: dict[str, Any]


@dataclass(slots=True)
class NormalizedJob:
    id: str
    source: str
    source_job_id: str
    canonical_job_key: str
    title: str
    company_name: str
    location_text: str
    remote_mode: str
    contract_type: str
    seniority_text: str
    description_text: str
    published_at: str
    skills_detected: list[str]
    detail_url: str | None = None


@dataclass(slots=True)
class CandidateProfile:
    id: str
    target_roles: list[str]
    preferred_skills: list[str]
    excluded_keywords: list[str]
    preferred_locations: list[str]
    notes: str
    updated_at: str
    prefer_remote_friendly: bool = False
    document_skills: list[str] = field(default_factory=list)


@dataclass(slots=True)
class CandidateDocument:
    id: str
    document_type: str
    source_filename: str
    content_text: str
    parsed_json: dict[str, Any]
    created_at: str


@dataclass(slots=True)
class SuggestedAction:
    title: str
    format: str
    deliverable: str
    description: str | None = None
    example: str | None = None
    free_alternative: str | None = None
    public_data_idea: str | None = None


@dataclass(slots=True)
class SkillGap:
    id: str
    job_match_id: str
    skill_name: str
    gap_type: str
    importance_score: int
    rationale_text: str
    suggested_action: SuggestedAction


@dataclass(slots=True)
class ScoreExplanation:
    strengths: list[str] = field(default_factory=list)
    missing_skills: list[str] = field(default_factory=list)
    penalties: list[str] = field(default_factory=list)
    quick_wins: list[str] = field(default_factory=list)
    blocking_points: list[str] = field(default_factory=list)


@dataclass(slots=True)
class ScoredJob:
    id: str
    candidate_profile_id: str
    computed_at: str
    job: NormalizedJob
    score_global: int
    score_role: int
    score_skills_match: int
    score_stack_fit: int
    score_seniority: int
    score_penalties: int
    score_preference: int
    explanation: ScoreExplanation
    matched_skills: list[str]
    missing_skills: list[str]
    gaps: list[SkillGap]


def dataclass_to_dict(value: Any) -> Any:
    if hasattr(value, "__dataclass_fields__"):
        return asdict(value)
    if isinstance(value, list):
        return [dataclass_to_dict(item) for item in value]
    if isinstance(value, dict):
        return {key: dataclass_to_dict(item) for key, item in value.items()}
    return value
