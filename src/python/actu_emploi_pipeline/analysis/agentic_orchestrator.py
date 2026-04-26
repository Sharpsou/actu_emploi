from __future__ import annotations

from dataclasses import asdict
from datetime import datetime, timezone
from time import perf_counter
from typing import Any, Callable
from uuid import uuid4

from actu_emploi_pipeline.analysis.agentic_match import AgenticMatchPipeline
from actu_emploi_pipeline.analysis.document_analyzer import analyze_candidate_documents
from actu_emploi_pipeline.analysis.precomputed_matches import build_job_from_dict
from actu_emploi_pipeline.models import CandidateDocument, NormalizedJob
from actu_emploi_pipeline.storage import load_candidate_documents, load_pipeline_output, save_agent_run


ALLOWED_MCP_TOOLS: dict[str, set[str]] = {
    "profile-mcp": {"read_candidate_documents"},
    "jobs-mcp": {"read_normalized_job"},
    "audit-mcp": {"validate_agentic_match_schema"},
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _duration_ms(start: float) -> int:
    return round((perf_counter() - start) * 1000)


def _as_list(value: object) -> list[Any]:
    return value if isinstance(value, list) else []


def _progress(progress_callback: Callable[[str], None] | None, message: str) -> None:
    if progress_callback:
        progress_callback(message)


def _compact_items(items: list[str], limit: int = 6) -> str:
    if not items:
        return "aucun"
    visible = items[:limit]
    suffix = f" (+{len(items) - limit})" if len(items) > limit else ""
    return ", ".join(visible) + suffix


def _confrontation_summary(confrontations: list[Any]) -> str:
    counts: dict[str, int] = {}
    for confrontation in confrontations:
        status = getattr(confrontation, "status", None)
        if isinstance(status, str):
            counts[status] = counts.get(status, 0) + 1
    if not counts:
        return "aucune decision"
    return ", ".join(f"{status}: {count}" for status, count in sorted(counts.items()))


def _find_job(job_id: str) -> NormalizedJob:
    output = load_pipeline_output()
    for scored in _as_list(output.get("jobs")):
        if not isinstance(scored, dict):
            continue
        raw_job = scored.get("job")
        if isinstance(raw_job, dict) and raw_job.get("id") == job_id:
            return build_job_from_dict(raw_job)
    raise ValueError(f"Job not found in pipeline output: {job_id}")


class ControlledMcpGateway:
    def __init__(self, run_id: str) -> None:
        self.run_id = run_id
        self.calls: list[dict[str, Any]] = []

    def _record_call(
        self,
        *,
        server_name: str,
        tool_name: str,
        input_json: dict[str, Any],
        output_json: dict[str, Any],
        permission_status: str = "allowed",
        latency_ms: int = 0,
        task_id: str | None = None,
    ) -> None:
        self.calls.append(
            {
                "id": f"mcp-call-{len(self.calls) + 1}",
                "run_id": self.run_id,
                "task_id": task_id,
                "server_name": server_name,
                "tool_name": tool_name,
                "input_json": input_json,
                "output_json": output_json,
                "permission_status": permission_status,
                "latency_ms": latency_ms,
                "created_at": _now(),
            }
        )

    def _ensure_allowed(self, server_name: str, tool_name: str, task_id: str) -> None:
        if tool_name in ALLOWED_MCP_TOOLS.get(server_name, set()):
            return

        self._record_call(
            server_name=server_name,
            tool_name=tool_name,
            input_json={"mode": "denied"},
            output_json={"error": "tool_not_allowed"},
            permission_status="denied",
            task_id=task_id,
        )
        raise PermissionError(f"MCP tool not allowed: {server_name}.{tool_name}")

    def read_candidate_documents(self, task_id: str) -> list[CandidateDocument]:
        start = perf_counter()
        self._ensure_allowed("profile-mcp", "read_candidate_documents", task_id)
        documents = load_candidate_documents()
        self._record_call(
            server_name="profile-mcp",
            tool_name="read_candidate_documents",
            input_json={"mode": "read_only"},
            output_json={"documents_count": len(documents)},
            latency_ms=_duration_ms(start),
            task_id=task_id,
        )
        return documents

    def read_job(self, job_id: str, task_id: str) -> NormalizedJob:
        start = perf_counter()
        self._ensure_allowed("jobs-mcp", "read_normalized_job", task_id)
        job = _find_job(job_id)
        self._record_call(
            server_name="jobs-mcp",
            tool_name="read_normalized_job",
            input_json={"job_id": job_id, "mode": "read_only"},
            output_json={"job_id": job.id, "skills_count": len(job.skills_detected)},
            latency_ms=_duration_ms(start),
            task_id=task_id,
        )
        return job

    def validate_schema(self, analysis_payload: dict[str, Any], task_id: str) -> dict[str, Any]:
        start = perf_counter()
        self._ensure_allowed("audit-mcp", "validate_agentic_match_schema", task_id)
        confrontations = analysis_payload.get("confrontations")
        valid = isinstance(confrontations, list) and all(
            isinstance(item, dict)
            and isinstance(item.get("skill_name"), str)
            and item.get("status") in {"acquis", "survol", "formation", "mini_projet"}
            and item.get("effort_level") in {"aucun", "leger", "court", "pratique"}
            for item in confrontations
        )
        result = {"valid": valid, "errors": [] if valid else ["invalid_confrontations"]}
        self._record_call(
            server_name="audit-mcp",
            tool_name="validate_agentic_match_schema",
            input_json={"confrontations_count": len(confrontations) if isinstance(confrontations, list) else 0},
            output_json=result,
            latency_ms=_duration_ms(start),
            task_id=task_id,
        )
        return result


def _task(
    task_id: str,
    agent_name: str,
    status: str,
    start: float,
    output_json: dict[str, Any],
    input_json: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "id": task_id,
        "agent_name": agent_name,
        "model_name": "deterministic-baseline",
        "status": status,
        "input_json": input_json or {},
        "output_json": output_json,
        "confidence_score": output_json.get("confidence_score", 0),
        "latency_ms": _duration_ms(start),
        "error_text": None,
    }


def _confidence_score(analysis_payload: dict[str, Any], schema_valid: bool) -> int:
    confrontations = _as_list(analysis_payload.get("confrontations"))
    if not schema_valid or not confrontations:
        return 35
    with_evidence = len(_as_list(analysis_payload.get("profile_analysis", {}).get("skill_signals"))) + len(
        _as_list(analysis_payload.get("job_analysis", {}).get("skill_signals"))
    )
    base = 70
    evidence_bonus = min(18, with_evidence * 2)
    missing_penalty = 8 if any(item.get("status") != "acquis" for item in confrontations if isinstance(item, dict)) else 0
    return max(0, min(96, base + evidence_bonus - missing_penalty))


def run_agentic_job_match(job_id: str, progress_callback: Callable[[str], None] | None = None) -> dict[str, Any]:
    run_id = f"agent-run-{uuid4().hex[:12]}"
    gateway = ControlledMcpGateway(run_id)
    tasks: list[dict[str, Any]] = []
    started_at = _now()

    _progress(progress_callback, "mcp-profile-reader: demande de lecture du profil candidat.")
    task_start = perf_counter()
    documents = analyze_candidate_documents(gateway.read_candidate_documents("task-read-profile"))
    _progress(
        progress_callback,
        f"mcp-profile-reader: {len(documents)} document(s) candidat lus via profile-mcp.",
    )
    tasks.append(
        _task(
            "task-read-profile",
            "mcp-profile-reader",
            "completed",
            task_start,
            {"documents_count": len(documents), "confidence_score": 90},
            {"resource": "candidate_documents", "access": "read_only"},
        )
    )

    _progress(progress_callback, "mcp-job-reader: demande de lecture de l'offre normalisee.")
    task_start = perf_counter()
    job = gateway.read_job(job_id, "task-read-job")
    _progress(
        progress_callback,
        f"mcp-job-reader: offre '{job.title}' lue avec {len(job.skills_detected)} competence(s) deja detectee(s).",
    )
    tasks.append(
        _task(
            "task-read-job",
            "mcp-job-reader",
            "completed",
            task_start,
            {"job_id": job.id, "skills_count": len(job.skills_detected), "confidence_score": 90},
            {"resource": "normalized_job", "job_id": job_id, "access": "read_only"},
        )
    )

    pipeline = AgenticMatchPipeline()

    _progress(progress_callback, "cv-skill-extractor: extraction des signaux du CV et de la lettre.")
    task_start = perf_counter()
    profile_analysis = pipeline.analyze_profile_documents(documents)
    _progress(
        progress_callback,
        f"cv-skill-extractor: competences retenues: {_compact_items(profile_analysis.skills)}.",
    )
    _progress(
        progress_callback,
        f"cv-skill-extractor: trace modele: {_compact_items(profile_analysis.agent_trace, 3)}.",
    )
    tasks.append(
        _task(
            "task-analyze-profile",
            "cv-skill-extractor",
            "completed",
            task_start,
            {"skills": profile_analysis.skills, "confidence_score": 82},
            {"documents_count": len(documents)},
        )
    )

    _progress(progress_callback, "job-requirement-extractor: extraction des exigences de l'offre.")
    task_start = perf_counter()
    job_analysis = pipeline.analyze_job(job)
    _progress(
        progress_callback,
        f"job-requirement-extractor: exigences retenues: {_compact_items(job_analysis.skills)}.",
    )
    _progress(
        progress_callback,
        f"job-requirement-extractor: trace modele: {_compact_items(job_analysis.agent_trace, 3)}.",
    )
    tasks.append(
        _task(
            "task-analyze-job",
            "job-requirement-extractor",
            "completed",
            task_start,
            {"skills": job_analysis.skills, "confidence_score": 84},
            {"job_id": job.id, "description_length": len(job.description_text)},
        )
    )

    _progress(progress_callback, "skill-gap-classifier: confrontation des competences profil/offre.")
    task_start = perf_counter()
    match_analysis = pipeline.confront(profile_analysis, job_analysis)
    analysis_payload = asdict(match_analysis)
    _progress(
        progress_callback,
        f"skill-gap-classifier: decisions: {_confrontation_summary(match_analysis.confrontations)}.",
    )
    for confrontation in match_analysis.confrontations[:8]:
        _progress(
            progress_callback,
            (
                f"skill-gap-classifier: {confrontation.skill_name} -> {confrontation.status} "
                f"({confrontation.effort_level})."
            ),
        )
    tasks.append(
        _task(
            "task-confront",
            "skill-gap-classifier",
            "completed",
            task_start,
            {
                "confrontations_count": len(match_analysis.confrontations),
                "mini_project_candidates_count": len(match_analysis.mini_project_candidates),
                "confidence_score": 78,
            },
            {"profile_skills_count": len(profile_analysis.skills), "job_skills_count": len(job_analysis.skills)},
        )
    )

    _progress(progress_callback, "deterministic-controller: validation du schema de sortie.")
    task_start = perf_counter()
    validation = gateway.validate_schema(analysis_payload, "task-validate")
    confidence = _confidence_score(analysis_payload, bool(validation["valid"]))
    _progress(
        progress_callback,
        f"deterministic-controller: schema {'valide' if validation['valid'] else 'invalide'}, confiance {confidence}.",
    )
    tasks.append(
        _task(
            "task-validate",
            "deterministic-controller",
            "completed" if validation["valid"] else "failed",
            task_start,
            {"validation": validation, "confidence_score": confidence},
            {"schema": "agentic_match_analysis"},
        )
    )

    status = "completed" if confidence >= 70 and validation["valid"] else "needs_review"
    payload = {
        "id": run_id,
        "job_id": job_id,
        "user_request": f"Analyse agentique CV/offre pour {job_id}",
        "status": status,
        "confidence_score": confidence,
        "human_review_required": status == "needs_review",
        "created_at": started_at,
        "completed_at": _now(),
        "result": analysis_payload,
        "tasks": tasks,
        "mcp_calls": gateway.calls,
    }
    _progress(progress_callback, f"orchestrateur: statut final {status}, revue humaine {status == 'needs_review'}.")
    _progress(progress_callback, "orchestrateur: sauvegarde du run agentique et des traces MCP.")
    save_agent_run(payload)
    return payload
