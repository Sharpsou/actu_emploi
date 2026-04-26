from __future__ import annotations

from dataclasses import asdict, dataclass

from actu_emploi_pipeline.analysis.agentic_match import AgenticMatchPipeline
from actu_emploi_pipeline.analysis.lightweight_llm import LightweightLlmClient, NullLightweightLlmClient, build_lightweight_llm_client
from actu_emploi_pipeline.models import CandidateDocument, NormalizedJob


@dataclass(frozen=True, slots=True)
class AgenticEvaluationCase:
    id: str
    documents: list[CandidateDocument]
    job: NormalizedJob
    expected_profile_skills: set[str]
    expected_job_skills: set[str]
    expected_statuses: dict[str, str]


def _coverage(detected: set[str], expected: set[str]) -> float:
    if not expected:
        return 1.0
    return len(detected.intersection(expected)) / len(expected)


def _status_accuracy(detected_statuses: dict[str, str], expected_statuses: dict[str, str]) -> float:
    if not expected_statuses:
        return 1.0
    correct = sum(1 for skill, status in expected_statuses.items() if detected_statuses.get(skill) == status)
    return correct / len(expected_statuses)


def _case_score(case: AgenticEvaluationCase, pipeline: AgenticMatchPipeline) -> dict[str, float]:
    analysis = pipeline.run(case.documents, case.job)
    profile_skills = set(analysis.profile_analysis.skills)
    job_skills = set(analysis.job_analysis.skills)
    statuses = {item.skill_name: item.status for item in analysis.confrontations}
    profile_coverage = _coverage(profile_skills, case.expected_profile_skills)
    job_coverage = _coverage(job_skills, case.expected_job_skills)
    status_accuracy = _status_accuracy(statuses, case.expected_statuses)

    return {
        "profile_skill_coverage": round(profile_coverage, 4),
        "job_skill_coverage": round(job_coverage, 4),
        "status_accuracy": round(status_accuracy, 4),
        "overall_score": round((profile_coverage + job_coverage + status_accuracy) / 3, 4),
    }


def evaluate_agentic_relevance(
    cases: list[AgenticEvaluationCase],
    llm_client: LightweightLlmClient | None = None,
) -> dict[str, object]:
    baseline_pipeline = AgenticMatchPipeline(NullLightweightLlmClient())
    enhanced_pipeline = AgenticMatchPipeline(llm_client or build_lightweight_llm_client())

    case_results = []
    baseline_totals = {
        "profile_skill_coverage": 0.0,
        "job_skill_coverage": 0.0,
        "status_accuracy": 0.0,
        "overall_score": 0.0,
    }
    enhanced_totals = dict(baseline_totals)

    for case in cases:
        baseline = _case_score(case, baseline_pipeline)
        enhanced = _case_score(case, enhanced_pipeline)
        for key in baseline_totals:
            baseline_totals[key] += baseline[key]
            enhanced_totals[key] += enhanced[key]
        case_results.append(
            {
                "id": case.id,
                "baseline": baseline,
                "enhanced": enhanced,
                "gain": round(enhanced["overall_score"] - baseline["overall_score"], 4),
            }
        )

    divisor = max(len(cases), 1)
    baseline_summary = {key: round(value / divisor, 4) for key, value in baseline_totals.items()}
    enhanced_summary = {key: round(value / divisor, 4) for key, value in enhanced_totals.items()}

    return {
        "cases_count": len(cases),
        "baseline": baseline_summary,
        "enhanced": enhanced_summary,
        "gain": {
            key: round(enhanced_summary[key] - baseline_summary[key], 4)
            for key in baseline_summary
        },
        "cases": case_results,
    }


def build_default_evaluation_cases() -> list[AgenticEvaluationCase]:
    return [
        AgenticEvaluationCase(
            id="implicit-bi-tooling",
            documents=[
                CandidateDocument(
                    id="doc-eval-1",
                    document_type="cv",
                    source_filename="cv.txt",
                    content_text="Analyste data avec SQL, Python, reporting, datavisualisation et tableaux de bord.",
                    parsed_json={"extraction_status": "seed"},
                    created_at="2026-04-26T00:00:00Z",
                )
            ],
            job=NormalizedJob(
                id="job-eval-1",
                source="fixture",
                source_job_id="1",
                canonical_job_key="data-analyst",
                title="Data Analyst",
                company_name="Example",
                location_text="Nantes",
                remote_mode="hybrid",
                contract_type="CDI",
                seniority_text="2 ans",
                description_text="Power BI, SQL, modelisation dimensionnelle et dbt.",
                published_at="2026-04-26",
                skills_detected=[],
            ),
            expected_profile_skills={"SQL", "Python", "Dashboarding"},
            expected_job_skills={"Power BI", "SQL", "Modelisation", "dbt"},
            expected_statuses={
                "Power BI": "survol",
                "SQL": "acquis",
                "Modelisation": "survol",
                "dbt": "formation",
            },
        ),
        AgenticEvaluationCase(
            id="tool-gap-heavy",
            documents=[
                CandidateDocument(
                    id="doc-eval-2",
                    document_type="cv",
                    source_filename="cv.txt",
                    content_text="Profil machine learning avec Python, SQL, scikit-learn, notebooks et experimentation.",
                    parsed_json={"extraction_status": "seed"},
                    created_at="2026-04-26T00:00:00Z",
                )
            ],
            job=NormalizedJob(
                id="job-eval-2",
                source="fixture",
                source_job_id="2",
                canonical_job_key="ml-platform",
                title="Machine Learning Engineer",
                company_name="Example",
                location_text="Remote",
                remote_mode="remote",
                contract_type="CDI",
                seniority_text="3 ans",
                description_text="Python, Machine Learning, Snowflake, Databricks et Airflow.",
                published_at="2026-04-26",
                skills_detected=[],
            ),
            expected_profile_skills={"Python", "SQL", "Machine Learning"},
            expected_job_skills={"Python", "Machine Learning", "Snowflake", "Databricks", "Airflow"},
            expected_statuses={
                "Python": "acquis",
                "Machine Learning": "acquis",
                "Snowflake": "formation",
                "Databricks": "formation",
                "Airflow": "formation",
            },
        ),
        AgenticEvaluationCase(
            id="out-of-catalog-data-app",
            documents=[
                CandidateDocument(
                    id="doc-eval-3",
                    document_type="cv",
                    source_filename="cv.txt",
                    content_text="Profil data avec Python, SQL et applications Streamlit pour partager les resultats.",
                    parsed_json={"extraction_status": "seed"},
                    created_at="2026-04-26T00:00:00Z",
                )
            ],
            job=NormalizedJob(
                id="job-eval-3",
                source="fixture",
                source_job_id="3",
                canonical_job_key="data-app-engineer",
                title="Data App Engineer",
                company_name="Example",
                location_text="Nantes",
                remote_mode="hybrid",
                contract_type="CDI",
                seniority_text="2 ans",
                description_text="Python, Streamlit, Docker et API data internes.",
                published_at="2026-04-26",
                skills_detected=[],
            ),
            expected_profile_skills={"Python", "SQL", "Streamlit"},
            expected_job_skills={"Python", "Streamlit", "Docker"},
            expected_statuses={
                "Python": "acquis",
                "Streamlit": "acquis",
                "Docker": "mini_projet",
            },
        ),
    ]


def evaluate_default_agentic_relevance(llm_client: LightweightLlmClient | None = None) -> dict[str, object]:
    return evaluate_agentic_relevance(build_default_evaluation_cases(), llm_client)


def evaluation_to_dict(value: object) -> object:
    if hasattr(value, "__dataclass_fields__"):
        return asdict(value)
    return value
