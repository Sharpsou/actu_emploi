from __future__ import annotations

from actu_emploi_pipeline.models import CandidateProfile, NormalizedJob, SkillGap, SuggestedAction
from actu_emploi_pipeline.skills_catalog import THEORETICAL_SKILLS, TOOL_SKILLS


def categorize_gap(skill_name: str) -> str:
    if skill_name in TOOL_SKILLS:
        return "outil"
    if skill_name in THEORETICAL_SKILLS:
        return "theorique"
    return "pratique"


def build_suggested_action(skill_name: str, gap_type: str) -> SuggestedAction:
    if gap_type == "theorique":
        return SuggestedAction(
            title=f"Revoir les fondamentaux de {skill_name}",
            format="note de synthese",
            deliverable="README court avec definition, exemple et schema",
            description=f"Clarifier {skill_name} avec une definition courte, les principes cles et un mini cas d'usage data.",
            example=f"Documenter un exemple simple de {skill_name} applique a un pipeline analytics ou BI.",
        )
    if gap_type == "outil":
        free_alternative = "DuckDB" if skill_name == "Snowflake" else "Prefect" if skill_name == "Airflow" else None
        return SuggestedAction(
            title=f"Monter un mini cas d'usage {skill_name}",
            format="mini implementation",
            deliverable="repo avec README et preuve d'execution",
            description=f"Mettre en place rapidement {skill_name} sur un cas de donnees publiques avec une preuve de fonctionnement.",
            example=f"Construire un flux minimal autour de {skill_name} puis publier les captures et commandes d'execution.",
            free_alternative=free_alternative,
            public_data_idea="Jeu de donnees transport, energie ou emploi en open data.",
        )
    return SuggestedAction(
        title=f"Prouver {skill_name} par un POC",
        format="mini projet",
        deliverable="repo GitHub avec etapes, code et resultat",
        description=f"Montrer une implementation concretement executable de {skill_name} dans un repo simple.",
        example=f"Realiser un POC focalise sur {skill_name} avec README, scripts et resultat visible.",
        public_data_idea="Utiliser une source open data simple pour produire un cas reproductible.",
    )


def analyze_skill_gaps(job: NormalizedJob, profile: CandidateProfile, job_match_id: str) -> list[SkillGap]:
    profile_skills = {skill.lower() for skill in profile.preferred_skills}
    missing = [skill for skill in job.skills_detected if skill.lower() not in profile_skills]

    gaps: list[SkillGap] = []
    for index, skill in enumerate(missing, start=1):
        gap_type = categorize_gap(skill)
        importance = 78 if gap_type == "outil" else 70
        gaps.append(
            SkillGap(
                id=f"{job_match_id}-gap-{index}",
                job_match_id=job_match_id,
                skill_name=skill,
                gap_type=gap_type,
                importance_score=importance,
                rationale_text=(
                    f"{skill} apparait dans l'offre comme signal utile "
                    "mais n'est pas encore etabli clairement dans le profil cible."
                ),
                suggested_action=build_suggested_action(skill, gap_type),
            )
        )

    return gaps
