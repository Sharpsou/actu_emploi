from __future__ import annotations

import unicodedata

from actu_emploi_pipeline.analysis.skill_extractor import extract_skills
from actu_emploi_pipeline.analysis.document_quality import evaluate_document_text_quality
from actu_emploi_pipeline.models import CandidateDocument


ROLE_ALIASES: dict[str, list[str]] = {
    "Data Analyst": ["data analyst", "analyste data"],
    "Data Scientist": ["data scientist", "data science"],
    "Data Engineer": ["data engineer", "ingenieur data", "ingénieur data"],
    "Analytics Engineer": ["analytics engineer", "bi engineer"],
}

LOCATION_ALIASES: dict[str, list[str]] = {
    "Nantes": ["nantes"],
    "Saint-Nazaire": ["saint-nazaire", "saint nazaire"],
    "Loire-Atlantique": ["loire-atlantique", "loire atlantique"],
    "Remote": ["remote", "teletravail", "télétravail", "hybride", "hybrid"],
}


def normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return normalized.lower().replace("â€™", "'")


def detect_aliases(text: str, aliases_by_key: dict[str, list[str]]) -> list[str]:
    lowered = normalize_text(text)
    detected: list[str] = []

    for key, aliases in aliases_by_key.items():
        if any(normalize_text(alias) in lowered for alias in aliases):
            detected.append(key)

    return sorted(set(detected))


def build_summary(content: str) -> str:
    compact = " ".join(content.split())
    return compact[:220]


def analyze_candidate_document(document: CandidateDocument) -> CandidateDocument:
    return _analyze_candidate_document(document, force_reanalyze=False)


def _analyze_candidate_document(document: CandidateDocument, force_reanalyze: bool) -> CandidateDocument:
    base_parsed_json = dict(document.parsed_json)
    extraction_method = document.parsed_json.get("extraction_method")
    quality_ok, quality_reason = evaluate_document_text_quality(
        document.content_text,
        extraction_method if isinstance(extraction_method, str) else None,
    )

    if not quality_ok:
        return CandidateDocument(
            id=document.id,
            document_type=document.document_type,
            source_filename=document.source_filename,
            content_text=document.content_text,
            parsed_json={
                **base_parsed_json,
                "extraction_status": "invalid",
                "extraction_warning": quality_reason,
                "summary": "Extraction PDF invalide: document ignore pour eviter une analyse trompeuse.",
                "detected_skills": [],
                "detected_roles": [],
                "detected_locations": [],
                "mentions_teletravail": False,
                "profile_signals": {
                    "skills_count": 0,
                    "roles_count": 0,
                    "locations_count": 0,
                },
            },
            created_at=document.created_at,
        )

    if document.parsed_json.get("extraction_status") == "done" and not force_reanalyze:
        return CandidateDocument(
            id=document.id,
            document_type=document.document_type,
            source_filename=document.source_filename,
            content_text=document.content_text,
            parsed_json=base_parsed_json,
            created_at=document.created_at,
        )

    normalized = normalize_text(document.content_text)
    detected_skills = extract_skills(document.content_text)
    detected_roles = detect_aliases(document.content_text, ROLE_ALIASES)
    detected_locations = detect_aliases(document.content_text, LOCATION_ALIASES)
    mentions_remote = any(token in normalized for token in ["teletravail", "remote", "hybride", "hybrid"])

    parsed_json = {
        **base_parsed_json,
        "extraction_status": "done",
        "summary": build_summary(document.content_text),
        "detected_skills": detected_skills,
        "detected_roles": detected_roles,
        "detected_locations": detected_locations,
        "mentions_teletravail": mentions_remote,
        "profile_signals": {
            "skills_count": len(detected_skills),
            "roles_count": len(detected_roles),
            "locations_count": len(detected_locations),
        },
    }

    return CandidateDocument(
        id=document.id,
        document_type=document.document_type,
        source_filename=document.source_filename,
        content_text=document.content_text,
        parsed_json=parsed_json,
        created_at=document.created_at,
    )


def analyze_candidate_documents(documents: list[CandidateDocument]) -> list[CandidateDocument]:
    return [analyze_candidate_document(document) for document in documents]


def reanalyze_candidate_document(document: CandidateDocument) -> CandidateDocument:
    return _analyze_candidate_document(document, force_reanalyze=True)
