from __future__ import annotations

from dataclasses import dataclass

from actu_emploi_pipeline.analysis.gap_analysis import build_suggested_action, categorize_gap
from actu_emploi_pipeline.analysis.lightweight_llm import LightweightLlmClient, NullLightweightLlmClient, build_lightweight_llm_client
from actu_emploi_pipeline.analysis.skill_extractor import extract_skills
from actu_emploi_pipeline.models import (
    AgenticEntityAnalysis,
    AgenticMatchAnalysis,
    CandidateDocument,
    NormalizedJob,
    SkillConfrontation,
    SkillSignal,
    SuggestedAction,
)
from actu_emploi_pipeline.skills_catalog import PRACTICAL_PROJECT_SKILLS, THEORETICAL_SKILLS, TOOL_SKILLS


RELATED_SKILL_GROUPS: tuple[frozenset[str], ...] = (
    frozenset({"SQL", "Python", "ETL", "Airflow", "dbt", "Databricks", "Snowflake", "DuckDB"}),
    frozenset({"Dashboarding", "Power BI", "SQL"}),
    frozenset({"Modelisation", "SQL", "dbt"}),
    frozenset({"Machine Learning", "Python"}),
)


@dataclass(frozen=True, slots=True)
class MiniAgentResult:
    agent_name: str
    skills: list[str]
    signals: list[SkillSignal]


def _compact_summary(text: str, limit: int = 220) -> str:
    compact = " ".join(text.split())
    return compact[:limit]


def _evidence_for_skill(text: str, skill_name: str) -> str:
    compact = " ".join(text.split())
    lowered = compact.lower()
    index = lowered.find(skill_name.lower())
    if index == -1:
        return _compact_summary(compact, 120)
    start = max(index - 50, 0)
    end = min(index + len(skill_name) + 70, len(compact))
    return compact[start:end].strip()


def _has_related_skill(skill_name: str, available_skills: set[str]) -> bool:
    for group in RELATED_SKILL_GROUPS:
        if skill_name in group and available_skills.intersection(group - {skill_name}):
            return True
    return False


class SkillDetectionMiniAgent:
    name = "skill-detector"

    def __init__(self, llm_client: LightweightLlmClient | None = None) -> None:
        self.llm_client = llm_client or NullLightweightLlmClient()

    def run(self, entity_kind: str, text: str) -> MiniAgentResult:
        skills = extract_skills(text)
        signals = [
            SkillSignal(
                skill_name=skill,
                source=entity_kind,
                evidence_text=_evidence_for_skill(text, skill),
                confidence_score=82,
            )
            for skill in skills
        ]

        by_skill = {signal.skill_name: signal for signal in signals}
        for candidate in self.llm_client.extract_skills(entity_kind=entity_kind, text=text):
            existing = by_skill.get(candidate.skill_name)
            if existing and existing.confidence_score >= candidate.confidence_score:
                continue
            by_skill[candidate.skill_name] = SkillSignal(
                skill_name=candidate.skill_name,
                source=entity_kind,
                evidence_text=candidate.evidence_text,
                confidence_score=max(candidate.confidence_score, 76),
            )

        merged = sorted(by_skill.values(), key=lambda signal: signal.skill_name)
        agent_name = (
            self.name
            if isinstance(self.llm_client, NullLightweightLlmClient)
            else f"{self.name}+llm:{self.llm_client.model_name}:{self.llm_client.device_kind}"
        )
        return MiniAgentResult(agent_name=agent_name, skills=[signal.skill_name for signal in merged], signals=merged)


class RequirementMiniAgent:
    name = "requirement-classifier"

    def __init__(self, llm_client: LightweightLlmClient | None = None) -> None:
        self.llm_client = llm_client or NullLightweightLlmClient()

    def run(self, job: NormalizedJob) -> MiniAgentResult:
        text = " ".join([job.title, job.description_text])
        skills = extract_skills(text)
        signals = [
            SkillSignal(
                skill_name=skill,
                source="job",
                evidence_text=_evidence_for_skill(text, skill),
                confidence_score=86 if skill in TOOL_SKILLS else 80,
            )
            for skill in skills
        ]
        by_skill = {signal.skill_name: signal for signal in signals}
        for candidate in self.llm_client.extract_skills(entity_kind="job", text=text):
            existing = by_skill.get(candidate.skill_name)
            if existing and existing.confidence_score >= candidate.confidence_score:
                continue
            by_skill[candidate.skill_name] = SkillSignal(
                skill_name=candidate.skill_name,
                source="job",
                evidence_text=candidate.evidence_text,
                confidence_score=max(candidate.confidence_score, 76),
            )

        merged = sorted(by_skill.values(), key=lambda signal: signal.skill_name)
        agent_name = (
            self.name
            if isinstance(self.llm_client, NullLightweightLlmClient)
            else f"{self.name}+llm:{self.llm_client.model_name}:{self.llm_client.device_kind}"
        )
        return MiniAgentResult(agent_name=agent_name, skills=[signal.skill_name for signal in merged], signals=merged)


class GapClassifierMiniAgent:
    name = "gap-classifier"

    def __init__(self, llm_client: LightweightLlmClient | None = None) -> None:
        self.llm_client = llm_client or NullLightweightLlmClient()

    def run(self, profile_skills: list[str], job_skills: list[str]) -> list[SkillConfrontation]:
        profile_skill_set = set(profile_skills)
        confrontations: list[SkillConfrontation] = []

        for skill in job_skills:
            if skill in profile_skill_set:
                confrontations.append(
                    SkillConfrontation(
                        skill_name=skill,
                        status="acquis",
                        effort_level="aucun",
                        rationale_text=f"{skill} est deja visible dans le profil candidat.",
                        suggested_action=SuggestedAction(
                            title=f"Renforcer la preuve {skill}",
                            format="preuve CV",
                            deliverable="une ligne d'impact ou un exemple concret",
                            description=f"Garder {skill} visible avec un resultat mesure ou un contexte projet.",
                        ),
                    )
                )
                continue

            gap_type = categorize_gap(skill)
            has_related = _has_related_skill(skill, profile_skill_set)
            if skill in PRACTICAL_PROJECT_SKILLS:
                status = "mini_projet"
                effort_level = "pratique"
                action = build_suggested_action(skill, gap_type)
            elif skill in TOOL_SKILLS:
                if skill == "Power BI" and "Dashboarding" in profile_skill_set:
                    status = "survol"
                    effort_level = "leger"
                    action = SuggestedAction(
                        title=f"Faire un survol cible de {skill}",
                        format="fiche courte",
                        deliverable="notes de synthese et vocabulaire cle",
                        description=f"Comprendre les attentes autour de {skill} pour savoir en parler correctement.",
                    )
                else:
                    status = "formation"
                    effort_level = "court"
                    action = build_suggested_action(skill, gap_type)
            elif skill in THEORETICAL_SKILLS or has_related:
                status = "survol"
                effort_level = "leger"
                action = SuggestedAction(
                    title=f"Faire un survol cible de {skill}",
                    format="fiche courte",
                    deliverable="notes de synthese et vocabulaire cle",
                    description=f"Comprendre les attentes autour de {skill} pour savoir en parler correctement.",
                )
            else:
                status = "mini_projet"
                effort_level = "pratique"
                action = build_suggested_action(skill, gap_type)

            confrontations.append(
                SkillConfrontation(
                    skill_name=skill,
                    status=status,
                    effort_level=effort_level,
                    rationale_text=(
                        f"{skill} est demande par l'offre mais n'est pas etabli dans le profil. "
                        f"Niveau d'effort estime: {effort_level}."
                    ),
                    suggested_action=action,
                )
            )

        llm_decisions = {
            decision.skill_name: decision
            for decision in self.llm_client.classify_gaps(profile_skills=profile_skills, job_skills=job_skills)
            if decision.confidence_score >= 70
        }
        if not llm_decisions:
            return confrontations

        refined: list[SkillConfrontation] = []
        for confrontation in confrontations:
            decision = llm_decisions.get(confrontation.skill_name)
            if (
                not decision
                or confrontation.status == "acquis" and decision.status != "acquis"
                or confrontation.skill_name not in profile_skill_set and decision.status == "acquis"
            ):
                refined.append(confrontation)
                continue
            refined.append(
                SkillConfrontation(
                    skill_name=confrontation.skill_name,
                    status=decision.status,
                    effort_level=decision.effort_level,
                    rationale_text=decision.rationale_text,
                    suggested_action=confrontation.suggested_action,
                )
            )
        return refined


class MiniProjectMiniAgent:
    name = "mini-project-generator"

    def run(self, confrontations: list[SkillConfrontation]) -> list[SuggestedAction]:
        return [
            confrontation.suggested_action
            for confrontation in confrontations
            if confrontation.status in {"formation", "mini_projet"}
        ][:3]


class AgenticMatchPipeline:
    def __init__(self, llm_client: LightweightLlmClient | None = None) -> None:
        self.llm_client = llm_client or build_lightweight_llm_client()
        self.skill_detector = SkillDetectionMiniAgent(self.llm_client)
        self.requirement_detector = RequirementMiniAgent(self.llm_client)
        self.gap_classifier = GapClassifierMiniAgent(self.llm_client)
        self.project_generator = MiniProjectMiniAgent()

    def analyze_profile_documents(self, documents: list[CandidateDocument]) -> AgenticEntityAnalysis:
        text = "\n".join(
            document.content_text
            for document in documents
            if document.document_type in {"cv", "lettre", "cover_letter"}
        )
        result = self.skill_detector.run("profile", text)
        return AgenticEntityAnalysis(
            entity_kind="profile",
            summary=_compact_summary(text),
            skills=result.skills,
            skill_signals=result.signals,
            agent_trace=[result.agent_name],
        )

    def analyze_job(self, job: NormalizedJob) -> AgenticEntityAnalysis:
        result = self.requirement_detector.run(job)
        return AgenticEntityAnalysis(
            entity_kind="job",
            summary=_compact_summary(" ".join([job.title, job.company_name, job.description_text])),
            skills=result.skills,
            skill_signals=result.signals,
            agent_trace=[result.agent_name],
        )

    def confront(self, profile_analysis: AgenticEntityAnalysis, job_analysis: AgenticEntityAnalysis) -> AgenticMatchAnalysis:
        confrontations = self.gap_classifier.run(profile_analysis.skills, job_analysis.skills)
        mini_projects = self.project_generator.run(confrontations)

        return AgenticMatchAnalysis(
            profile_analysis=AgenticEntityAnalysis(
                entity_kind=profile_analysis.entity_kind,
                summary=profile_analysis.summary,
                skills=profile_analysis.skills,
                skill_signals=profile_analysis.skill_signals,
                agent_trace=profile_analysis.agent_trace + [self.gap_classifier.name],
            ),
            job_analysis=AgenticEntityAnalysis(
                entity_kind=job_analysis.entity_kind,
                summary=job_analysis.summary,
                skills=job_analysis.skills,
                skill_signals=job_analysis.skill_signals,
                agent_trace=job_analysis.agent_trace + [self.project_generator.name],
            ),
            confrontations=confrontations,
            mini_project_candidates=mini_projects,
        )

    def run(self, documents: list[CandidateDocument], job: NormalizedJob) -> AgenticMatchAnalysis:
        profile_analysis = self.analyze_profile_documents(documents)
        job_analysis = self.analyze_job(job)
        return self.confront(profile_analysis, job_analysis)


def analyze_profile_text_agentically(text: str, llm_client: LightweightLlmClient | None = None) -> AgenticEntityAnalysis:
    result = SkillDetectionMiniAgent(llm_client or build_lightweight_llm_client()).run("profile", text)
    return AgenticEntityAnalysis(
        entity_kind="profile",
        summary=_compact_summary(text),
        skills=result.skills,
        skill_signals=result.signals,
        agent_trace=[result.agent_name, "profile-signal-controller"],
    )


def analyze_job_text_agentically(
    title: str,
    description_text: str,
    llm_client: LightweightLlmClient | None = None,
) -> AgenticEntityAnalysis:
    job = NormalizedJob(
        id="job-analysis-preview",
        source="internal",
        source_job_id="preview",
        canonical_job_key="preview",
        title=title,
        company_name="",
        location_text="",
        remote_mode="onsite",
        contract_type="",
        seniority_text="",
        description_text=description_text,
        published_at="",
        skills_detected=[],
    )
    return AgenticMatchPipeline(llm_client).analyze_job(job)
