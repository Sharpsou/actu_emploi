from __future__ import annotations

import sys
import unittest
from unittest.mock import patch
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
PYTHON_SRC_DIR = ROOT_DIR / "src" / "python"

if str(PYTHON_SRC_DIR) not in sys.path:
    sys.path.insert(0, str(PYTHON_SRC_DIR))

from actu_emploi_pipeline.analysis.agentic_match import AgenticMatchPipeline
from actu_emploi_pipeline.analysis.lightweight_llm import LlmGapDecision, LlmSkillCandidate
from actu_emploi_pipeline.models import CandidateDocument, NormalizedJob


class FakeLightweightLlmClient:
    model_name = "fake-3b"
    device_kind = "amd-gpu"

    def health_check(self) -> dict[str, object]:
        return {"enabled": True, "reachable": True}

    def extract_skills(self, *, entity_kind: str, text: str) -> list[LlmSkillCandidate]:
        if entity_kind == "profile":
            return [
                LlmSkillCandidate(
                    skill_name="Streamlit",
                    evidence_text="notebooks et Streamlit pour demos data",
                    confidence_score=86,
                )
            ]
        return [
            LlmSkillCandidate(
                skill_name="Docker",
                evidence_text="deploiement Docker attendu",
                confidence_score=84,
            )
        ]

    def classify_gaps(self, *, profile_skills: list[str], job_skills: list[str]) -> list[LlmGapDecision]:
        return [
            LlmGapDecision(
                skill_name="Docker",
                status="mini_projet",
                effort_level="pratique",
                rationale_text="Docker est demande et absent du profil, une preuve pratique est necessaire.",
                confidence_score=82,
            )
        ]


class AgenticMatchPipelineTest(unittest.TestCase):
    def setUp(self) -> None:
        self.env_patcher = patch.dict("os.environ", {"LIGHTWEIGHT_LLM_ENABLED": "0"})
        self.env_patcher.start()

    def tearDown(self) -> None:
        self.env_patcher.stop()

    def test_confronts_profile_and_job_skills(self) -> None:
        documents = [
            CandidateDocument(
                id="doc-cv",
                document_type="cv",
                source_filename="cv.txt",
                content_text="Data analyst avec SQL, Python, tableaux de bord et pipelines de donnees.",
                parsed_json={"extraction_status": "seed"},
                created_at="2026-04-26T00:00:00Z",
            )
        ]
        job = NormalizedJob(
            id="job-1",
            source="fixture",
            source_job_id="1",
            canonical_job_key="data-analyst-nantes",
            title="Data Analyst",
            company_name="Example",
            location_text="Nantes",
            remote_mode="hybrid",
            contract_type="CDI",
            seniority_text="2 ans",
            description_text=(
                "Mission SQL, Power BI, dbt et modelisation dimensionnelle. "
                "Une experience Airflow serait appreciee."
            ),
            published_at="2026-04-26T00:00:00Z",
            skills_detected=["SQL", "Power BI", "dbt", "Modelisation", "Airflow"],
        )

        analysis = AgenticMatchPipeline().run(documents, job)

        statuses = {item.skill_name: item.status for item in analysis.confrontations}
        self.assertEqual(statuses["SQL"], "acquis")
        self.assertEqual(statuses["Power BI"], "survol")
        self.assertEqual(statuses["dbt"], "formation")
        self.assertEqual(statuses["Modelisation"], "survol")
        self.assertEqual(statuses["Airflow"], "formation")
        self.assertEqual(analysis.profile_analysis.agent_trace, ["skill-detector", "gap-classifier"])
        self.assertEqual(analysis.job_analysis.agent_trace, ["requirement-classifier", "mini-project-generator"])

    def test_generates_training_project_candidates_for_unrelated_tools(self) -> None:
        documents = [
            CandidateDocument(
                id="doc-cv",
                document_type="cv",
                source_filename="cv.txt",
                content_text="Profil BI avec reporting et tableaux de bord.",
                parsed_json={"extraction_status": "seed"},
                created_at="2026-04-26T00:00:00Z",
            )
        ]
        job = NormalizedJob(
            id="job-2",
            source="fixture",
            source_job_id="2",
            canonical_job_key="ml-engineer",
            title="Machine Learning Engineer",
            company_name="Example",
            location_text="Remote",
            remote_mode="remote",
            contract_type="CDI",
            seniority_text="3 ans",
            description_text="Stack Python, Snowflake et machine learning.",
            published_at="2026-04-26T00:00:00Z",
            skills_detected=["Python", "Snowflake", "Machine Learning"],
        )

        analysis = AgenticMatchPipeline().run(documents, job)

        statuses = {item.skill_name: item.status for item in analysis.confrontations}
        self.assertEqual(statuses["Snowflake"], "formation")
        self.assertEqual(statuses["Machine Learning"], "survol")
        self.assertEqual(len(analysis.mini_project_candidates), 2)
        self.assertTrue(any("Snowflake" in action.title for action in analysis.mini_project_candidates))

    def test_lightweight_llm_can_add_high_confidence_out_of_catalog_skills(self) -> None:
        documents = [
            CandidateDocument(
                id="doc-cv",
                document_type="cv",
                source_filename="cv.txt",
                content_text="Profil data avec Python, notebooks et Streamlit pour demos data.",
                parsed_json={"extraction_status": "seed"},
                created_at="2026-04-26T00:00:00Z",
            )
        ]
        job = NormalizedJob(
            id="job-3",
            source="fixture",
            source_job_id="3",
            canonical_job_key="data-app",
            title="Data App Engineer",
            company_name="Example",
            location_text="Nantes",
            remote_mode="hybrid",
            contract_type="CDI",
            seniority_text="2 ans",
            description_text="Python, Streamlit et deploiement Docker attendu.",
            published_at="2026-04-26T00:00:00Z",
            skills_detected=[],
        )

        analysis = AgenticMatchPipeline(FakeLightweightLlmClient()).run(documents, job)

        self.assertIn("Streamlit", analysis.profile_analysis.skills)
        self.assertIn("Docker", analysis.job_analysis.skills)
        statuses = {item.skill_name: item.status for item in analysis.confrontations}
        self.assertEqual(statuses["Docker"], "mini_projet")
        self.assertIn("fake-3b", analysis.profile_analysis.agent_trace[0])


if __name__ == "__main__":
    unittest.main()
