from __future__ import annotations

from dataclasses import asdict
from datetime import datetime, timezone
from typing import Any

from actu_emploi_pipeline.analysis.agentic_match import AgenticMatchPipeline
from actu_emploi_pipeline.analysis.document_analyzer import analyze_candidate_documents
from actu_emploi_pipeline.models import CandidateDocument, NormalizedJob, ScoredJob
from actu_emploi_pipeline.storage import load_candidate_documents, load_pipeline_output, save_pipeline_output


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _as_list(value: object) -> list[Any]:
    return value if isinstance(value, list) else []


def build_job_from_dict(raw: dict[str, Any]) -> NormalizedJob:
    return NormalizedJob(
        id=str(raw.get("id", "")),
        source=str(raw.get("source", "")),
        source_job_id=str(raw.get("source_job_id", "")),
        canonical_job_key=str(raw.get("canonical_job_key", "")),
        title=str(raw.get("title", "")),
        company_name=str(raw.get("company_name", "")),
        location_text=str(raw.get("location_text", "")),
        remote_mode=str(raw.get("remote_mode", "onsite")),
        contract_type=str(raw.get("contract_type", "")),
        seniority_text=str(raw.get("seniority_text", "")),
        description_text=str(raw.get("description_text", "")),
        published_at=str(raw.get("published_at", "")),
        skills_detected=[item for item in _as_list(raw.get("skills_detected")) if isinstance(item, str)],
        detail_url=raw.get("detail_url") if isinstance(raw.get("detail_url"), str) else None,
    )


def build_precomputed_agentic_analysis(documents: list[CandidateDocument], job: NormalizedJob) -> dict[str, Any]:
    analysis = AgenticMatchPipeline().run(documents, job)
    confrontations = asdict(analysis)["confrontations"]
    confidence_score = 80 if confrontations else 45

    return {
        "status": "completed" if confidence_score >= 70 else "needs_review",
        "confidence_score": confidence_score,
        "human_review_required": confidence_score < 70,
        "computed_at": _now(),
        "analysis": asdict(analysis),
    }


def build_scored_job_payloads(scored_jobs: list[ScoredJob], documents: list[CandidateDocument]) -> list[dict[str, Any]]:
    payloads: list[dict[str, Any]] = []

    for scored_job in scored_jobs:
        payload = asdict(scored_job)
        payload["agentic_analysis"] = build_precomputed_agentic_analysis(documents, scored_job.job)
        payloads.append(payload)

    return payloads


def refresh_pipeline_output_agentic_analyses() -> dict[str, Any]:
    output = load_pipeline_output()
    documents = analyze_candidate_documents(load_candidate_documents())
    refreshed_jobs = []

    for scored in _as_list(output.get("jobs")):
        if not isinstance(scored, dict):
            continue
        raw_job = scored.get("job")
        if not isinstance(raw_job, dict):
            continue

        scored["agentic_analysis"] = build_precomputed_agentic_analysis(documents, build_job_from_dict(raw_job))
        refreshed_jobs.append(scored)
        output["jobs"] = refreshed_jobs + [
            item for item in _as_list(output.get("jobs")) if isinstance(item, dict) and item not in refreshed_jobs
        ]
        output["documents"] = [asdict(document) for document in documents]
        output["agentic_matches_refreshed_at"] = _now()
        output["partial"] = True
        save_pipeline_output(output)

    refreshed_at = _now()
    output["jobs"] = refreshed_jobs
    output["documents"] = [asdict(document) for document in documents]
    output["agentic_matches_refreshed_at"] = refreshed_at
    output["partial"] = False
    save_pipeline_output(output)

    return {
        "refreshed_at": refreshed_at,
        "jobs_refreshed": len(refreshed_jobs),
    }
