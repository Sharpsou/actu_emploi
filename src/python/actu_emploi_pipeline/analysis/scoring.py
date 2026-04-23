from __future__ import annotations

from datetime import datetime, timezone

from actu_emploi_pipeline.analysis.gap_analysis import analyze_skill_gaps
from actu_emploi_pipeline.filters import role_match_strength
from actu_emploi_pipeline.models import CandidateProfile, NormalizedJob, ScoreExplanation, ScoredJob


def _job_required_skills(job: NormalizedJob) -> list[str]:
    return job.skills_detected


def _job_preferred_skills(job: NormalizedJob) -> list[str]:
    return []


def score_role(job: NormalizedJob, profile: CandidateProfile) -> int:
    strength = role_match_strength(job, profile)
    if strength == 3:
        return 25
    if strength == 2:
        return 18
    if strength == 1:
        return 10
    return 0


def score_skills_match(job: NormalizedJob, profile: CandidateProfile) -> tuple[int, list[str], list[str]]:
    preferred = {skill.lower(): skill for skill in profile.preferred_skills}
    required_skills = _job_required_skills(job)
    preferred_skills = _job_preferred_skills(job)

    matched_required = [skill for skill in required_skills if skill.lower() in preferred]
    missing_required = [skill for skill in required_skills if skill.lower() not in preferred]
    matched_preferred = [skill for skill in preferred_skills if skill.lower() in preferred]
    missing_preferred = [skill for skill in preferred_skills if skill.lower() not in preferred]

    required_coverage = len(matched_required) / max(len(required_skills), 1)
    preferred_coverage = len(matched_preferred) / max(len(preferred_skills), 1) if preferred_skills else 1
    total_score = round((28 * required_coverage) + (7 * preferred_coverage))
    matched = matched_required + [skill for skill in matched_preferred if skill not in matched_required]
    missing = missing_required + [skill for skill in missing_preferred if skill not in missing_required]

    return total_score, matched, missing


def score_stack_fit(job: NormalizedJob) -> int:
    positive = {"SQL", "Python", "ETL", "Modelisation", "Power BI", "dbt", "Airflow", "Databricks"}
    present = positive.intersection(set(job.skills_detected))
    return min(15, 6 + len(present))


def score_seniority(job: NormalizedJob) -> int:
    text = job.seniority_text.lower()
    if "2" in text or "3" in text or "4" in text:
        return 8
    if "5" in text:
        return 6
    return 5


def score_penalties(job: NormalizedJob, profile: CandidateProfile) -> tuple[int, list[str]]:
    lowered = job.description_text.lower()
    matches = [keyword for keyword in profile.excluded_keywords if keyword.lower() in lowered]
    if not matches:
        return 0, []
    penalty = -10 * len(matches)
    return max(-20, penalty), [f"Presence de {keyword}" for keyword in matches]


def score_preference(job: NormalizedJob, profile: CandidateProfile) -> int:
    location_match = any(location.lower() in job.location_text.lower() for location in profile.preferred_locations)

    if location_match and profile.prefer_remote_friendly:
        if job.remote_mode == "remote":
            return 15
        if job.remote_mode == "hybrid":
            return 14
        return 8
    if location_match:
        return 12
    if job.remote_mode == "remote":
        return 10
    if profile.prefer_remote_friendly and job.remote_mode == "hybrid":
        return 8
    return 6


def build_explanation(
    matched_skills: list[str],
    missing_skills: list[str],
    penalties: list[str],
) -> ScoreExplanation:
    quick_wins = [f"Ajouter une preuve concrete sur {skill}" for skill in missing_skills[:2]]
    blocking_points = penalties + [f"Competence visible manquante: {skill}" for skill in missing_skills[:1]]
    return ScoreExplanation(
        strengths=matched_skills[:3] or ["Role proche du profil cible"],
        missing_skills=missing_skills,
        penalties=penalties,
        quick_wins=quick_wins,
        blocking_points=blocking_points,
    )


def score_job(job: NormalizedJob, profile: CandidateProfile) -> ScoredJob:
    job_match_id = f"match-{job.id}"
    role_score = score_role(job, profile)
    skills_score, matched_skills, missing_skills = score_skills_match(job, profile)
    stack_score = score_stack_fit(job)
    seniority_score = score_seniority(job)
    penalties_score, penalties = score_penalties(job, profile)
    preference_score = score_preference(job, profile)
    total = role_score + skills_score + stack_score + seniority_score + penalties_score + preference_score
    explanation = build_explanation(matched_skills, missing_skills, penalties)
    gaps = analyze_skill_gaps(job, profile, job_match_id)

    return ScoredJob(
        id=job_match_id,
        candidate_profile_id=profile.id,
        computed_at=datetime.now(timezone.utc).isoformat(),
        job=job,
        score_global=total,
        score_role=role_score,
        score_skills_match=skills_score,
        score_stack_fit=stack_score,
        score_seniority=seniority_score,
        score_penalties=penalties_score,
        score_preference=preference_score,
        explanation=explanation,
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        gaps=gaps,
    )
