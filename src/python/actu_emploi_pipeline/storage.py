from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from actu_emploi_pipeline.fixtures import build_fixture_profile
from actu_emploi_pipeline.models import CandidateDocument, CandidateProfile


PROJECT_ROOT = Path(__file__).resolve().parents[3]
RUNTIME_DIR = PROJECT_ROOT / "data" / "runtime"
CANDIDATE_PROFILE_PATH = RUNTIME_DIR / "candidate-profile.json"
CANDIDATE_DOCUMENTS_PATH = RUNTIME_DIR / "candidate-documents.json"
PIPELINE_OUTPUT_PATH = RUNTIME_DIR / "pipeline-output.json"
AGENT_RUNS_DIR = RUNTIME_DIR / "agent-runs"


def ensure_runtime_dir() -> None:
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)


def _read_json(path: Path, fallback: Any) -> Any:
    ensure_runtime_dir()
    if not path.exists():
        _write_json(path, fallback)
        return fallback

    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except json.JSONDecodeError:
        return fallback


def _write_json(path: Path, payload: Any) -> None:
    ensure_runtime_dir()
    path.write_text(f"{json.dumps(payload, ensure_ascii=False, indent=2)}\n", encoding="utf-8")


def load_candidate_profile() -> CandidateProfile:
    fallback = {
        "id": "profile-main",
        "targetRoles": build_fixture_profile().target_roles,
        "preferredSkills": build_fixture_profile().preferred_skills,
        "excludedKeywords": build_fixture_profile().excluded_keywords,
        "preferredLocations": build_fixture_profile().preferred_locations,
        "preferRemoteFriendly": build_fixture_profile().prefer_remote_friendly,
        "notes": build_fixture_profile().notes,
        "updatedAt": build_fixture_profile().updated_at,
    }
    raw = _read_json(CANDIDATE_PROFILE_PATH, fallback)
    return CandidateProfile(
        id=raw.get("id", "profile-main"),
        target_roles=raw.get("targetRoles", []),
        preferred_skills=raw.get("preferredSkills", []),
        excluded_keywords=raw.get("excludedKeywords", []),
        preferred_locations=raw.get("preferredLocations", []),
        prefer_remote_friendly=raw.get("preferRemoteFriendly", False),
        notes=raw.get("notes", ""),
        updated_at=raw.get("updatedAt", "2026-04-22T06:00:00.000Z"),
    )


def load_candidate_documents() -> list[CandidateDocument]:
    raw_documents = _read_json(CANDIDATE_DOCUMENTS_PATH, [])
    documents: list[CandidateDocument] = []
    for raw in raw_documents:
        documents.append(
            CandidateDocument(
                id=raw.get("id", "doc-missing"),
                document_type=raw.get("documentType", "cv"),
                source_filename=raw.get("sourceFilename", "unknown.txt"),
                content_text=raw.get("contentText", ""),
                parsed_json=raw.get("parsedJson", {}),
                created_at=raw.get("createdAt", "2026-04-22T00:00:00.000Z"),
            )
        )
    return documents


def save_candidate_documents(documents: list[CandidateDocument]) -> None:
    payload = [
        {
            "id": document.id,
            "documentType": document.document_type,
            "sourceFilename": document.source_filename,
            "contentText": document.content_text,
            "parsedJson": document.parsed_json,
            "createdAt": document.created_at,
        }
        for document in documents
    ]
    _write_json(CANDIDATE_DOCUMENTS_PATH, payload)


def save_pipeline_output(payload: dict[str, Any]) -> None:
    _write_json(PIPELINE_OUTPUT_PATH, payload)


def load_pipeline_output() -> dict[str, Any]:
    return _read_json(
        PIPELINE_OUTPUT_PATH,
        {
            "generated_at": None,
            "feed_date": "",
            "profile": None,
            "documents": [],
            "stats": {},
            "source_runs": [],
            "jobs": [],
            "feed_items": [],
        },
    )


def save_agent_run(payload: dict[str, Any]) -> None:
    ensure_runtime_dir()
    AGENT_RUNS_DIR.mkdir(parents=True, exist_ok=True)
    run_id = payload.get("id")
    if not isinstance(run_id, str) or not run_id:
        raise ValueError("Agent run payload requires a non-empty id.")
    _write_json(AGENT_RUNS_DIR / f"{run_id}.json", payload)
