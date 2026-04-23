from __future__ import annotations

from actu_emploi_pipeline.models import CandidateDocument, CandidateProfile


def _read_string_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return sorted({item for item in value if isinstance(item, str)})


def build_candidate_profile(
    stored_profile: CandidateProfile,
    documents: list[CandidateDocument],
) -> CandidateProfile:
    document_skills: list[str] = []

    for document in documents:
        if document.parsed_json.get("extraction_status") != "done":
            continue
        document_skills.extend(_read_string_list(document.parsed_json.get("detected_skills")))

    merged_skills = sorted(set(stored_profile.preferred_skills + document_skills))

    return CandidateProfile(
        id=stored_profile.id,
        target_roles=stored_profile.target_roles,
        preferred_skills=merged_skills,
        excluded_keywords=stored_profile.excluded_keywords,
        preferred_locations=stored_profile.preferred_locations,
        prefer_remote_friendly=stored_profile.prefer_remote_friendly,
        notes=stored_profile.notes,
        updated_at=stored_profile.updated_at,
        document_skills=sorted(set(document_skills)),
    )
