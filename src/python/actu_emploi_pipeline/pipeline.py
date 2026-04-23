from __future__ import annotations

from dataclasses import asdict
from datetime import datetime, timezone

from typing import Callable

from actu_emploi_pipeline.analysis.document_analyzer import analyze_candidate_documents
from actu_emploi_pipeline.filters import should_keep_job
from actu_emploi_pipeline.models import ScoredJob
from actu_emploi_pipeline.normalize import normalize_job
from actu_emploi_pipeline.settings import get_settings
from actu_emploi_pipeline.sources.france_travail import FranceTravailSource
from actu_emploi_pipeline.sources.jooble import JoobleSource
from actu_emploi_pipeline.analysis.scoring import score_job
from actu_emploi_pipeline.profile_builder import build_candidate_profile
from actu_emploi_pipeline.storage import (
    load_candidate_documents,
    load_candidate_profile,
    save_pipeline_output,
)


def _feed_date() -> str:
    return datetime.now(timezone.utc).date().isoformat()
def _build_feed_items(scored_jobs: list[ScoredJob], date: str) -> list[dict[str, object]]:
    items: list[dict[str, object]] = []

    for index, scored in enumerate(scored_jobs[:10], start=1):
        items.append(
            {
                "id": f"feed-offre-{index}",
                "feed_date": date,
                "kind": "offre",
                "related_job_id": scored.job.id,
                "related_job_match_id": scored.id,
                "title": f"{scored.job.title} - {scored.job.company_name}",
                "summary": ", ".join(scored.explanation.strengths[:3]) or scored.job.description_text[:140],
                "score": scored.score_global,
                "rank": index,
                "source": scored.job.source,
                "tags": sorted(set(scored.matched_skills[:3] + scored.missing_skills[:2])),
                "payload": {
                    "missing_skills": scored.missing_skills,
                    "quick_wins": scored.explanation.quick_wins,
                },
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )

    gap_items = []
    all_gaps = [gap for scored in scored_jobs for gap in scored.gaps]
    all_gaps.sort(key=lambda gap: gap.importance_score, reverse=True)
    for offset, gap in enumerate(all_gaps[:2], start=len(items) + 1):
        gap_items.append(
            {
                "id": f"feed-gap-{offset}",
                "feed_date": date,
                "kind": "competence" if gap.gap_type == "outil" else "notion",
                "title": gap.skill_name,
                "summary": gap.rationale_text,
                "score": gap.importance_score,
                "rank": offset,
                "tags": [gap.gap_type, "gap", "prioritaire"],
                "payload": {
                    "suggested_action": asdict(gap.suggested_action),
                },
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )

    project_items = []
    project_gaps = [gap for gap in all_gaps if gap.gap_type in {"pratique", "outil"}]
    for offset, gap in enumerate(project_gaps[:2], start=len(items) + len(gap_items) + 1):
        project_items.append(
            {
                "id": f"feed-project-{offset}",
                "feed_date": date,
                "kind": "projet",
                "title": gap.suggested_action.title,
                "summary": gap.suggested_action.description or gap.rationale_text,
                "score": max(60, gap.importance_score - 5),
                "rank": offset,
                "tags": [gap.skill_name, gap.gap_type, "poc"],
                "payload": {
                    "deliverable": gap.suggested_action.deliverable,
                    "free_alternative": gap.suggested_action.free_alternative,
                    "public_data_idea": gap.suggested_action.public_data_idea,
                },
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )

    return items + gap_items + project_items


def _build_connectors() -> tuple[list[object], list[dict[str, object]]]:
    settings = get_settings()
    connectors: list[object] = []
    source_runs: list[dict[str, object]] = []

    if settings.enable_france_travail:
        connectors.append(FranceTravailSource())
    else:
        source_runs.append(
            {
                "source": FranceTravailSource.source_name,
                "status": "disabled",
                "reason": "disabled_by_config",
            }
        )

    if settings.enable_jooble:
        connectors.append(JoobleSource())
    else:
        source_runs.append(
            {
                "source": JoobleSource.source_name,
                "status": "disabled",
                "reason": "disabled_by_config",
            }
        )

    return connectors, source_runs


def run_pipeline(progress_callback: Callable[[str], None] | None = None) -> dict[str, object]:
    stored_profile = load_candidate_profile()
    if progress_callback:
        progress_callback("Analyse des documents candidat...")
    documents = analyze_candidate_documents(load_candidate_documents())
    profile = build_candidate_profile(stored_profile, documents)
    connectors, source_runs = _build_connectors()
    raw_jobs = []
    for connector in connectors:
        try:
            if progress_callback:
                progress_callback(f"Collecte {connector.source_name}...")
            connector_jobs = connector.fetch_jobs(profile)
            raw_jobs.extend(connector_jobs)
            source_runs.append(
                {
                    "source": connector.source_name,
                    "status": "ok",
                    "jobs_fetched": len(connector_jobs),
                }
            )
        except Exception as error:  # pragma: no cover - defensive for external sources
            source_runs.append(
                {
                    "source": connector.source_name,
                    "status": "error",
                    "error": str(error),
                }
            )

    normalized = []
    if progress_callback:
        progress_callback("Analyse heuristique des offres par mots-cles...")
    total_jobs = len(raw_jobs)
    for index, job in enumerate(raw_jobs, start=1):
        normalized.append(normalize_job(job))
        if progress_callback and total_jobs > 0:
            progress_callback(f"Offres traitees: {index}/{total_jobs}")

    if progress_callback:
        progress_callback("Filtrage et scoring des offres...")
    filtered = [job for job in normalized if should_keep_job(job, profile)]
    scored: list[ScoredJob] = [score_job(job, profile) for job in filtered]
    scored.sort(key=lambda item: item.score_global, reverse=True)
    generated_at = datetime.now(timezone.utc).isoformat()
    feed_date = _feed_date()
    if progress_callback:
        progress_callback("Generation du feed...")
    feed_items = _build_feed_items(scored, feed_date)

    payload = {
        "generated_at": generated_at,
        "feed_date": feed_date,
        "profile": asdict(profile),
        "documents": [asdict(document) for document in documents],
        "stats": {
            "raw_jobs": len(raw_jobs),
            "normalized_jobs": len(normalized),
            "filtered_jobs": len(filtered),
            "scored_jobs": len(scored),
        },
        "source_runs": source_runs,
        "jobs": [asdict(item) for item in scored],
        "feed_items": feed_items,
    }
    save_pipeline_output(
        {
            "generated_at": payload["generated_at"],
            "feed_date": payload["feed_date"],
            "profile": payload["profile"],
            "documents": payload["documents"],
            "stats": payload["stats"],
            "source_runs": payload["source_runs"],
            "jobs": payload["jobs"],
            "feed_items": payload["feed_items"],
        }
    )
    return payload
