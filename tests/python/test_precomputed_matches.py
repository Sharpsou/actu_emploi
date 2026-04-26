from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
PYTHON_SRC_DIR = ROOT_DIR / "src" / "python"

if str(PYTHON_SRC_DIR) not in sys.path:
    sys.path.insert(0, str(PYTHON_SRC_DIR))

from actu_emploi_pipeline.analysis.precomputed_matches import build_precomputed_agentic_analysis
from actu_emploi_pipeline.models import CandidateDocument, NormalizedJob


class PrecomputedMatchesTest(unittest.TestCase):
    def test_builds_agentic_analysis_for_job_detail_payload(self) -> None:
        documents = [
            CandidateDocument(
                id="doc-1",
                document_type="cv",
                source_filename="cv.txt",
                content_text="Profil SQL et Python avec dashboards.",
                parsed_json={"extraction_status": "seed"},
                created_at="2026-04-26T00:00:00Z",
            )
        ]
        job = NormalizedJob(
            id="job-1",
            source="fixture",
            source_job_id="1",
            canonical_job_key="analytics-engineer",
            title="Analytics Engineer",
            company_name="Example",
            location_text="Nantes",
            remote_mode="hybrid",
            contract_type="CDI",
            seniority_text="2 ans",
            description_text="SQL, Python, Airflow et Power BI.",
            published_at="2026-04-26",
            skills_detected=["SQL", "Python", "Airflow", "Power BI"],
        )

        payload = build_precomputed_agentic_analysis(documents, job)

        self.assertEqual(payload["status"], "completed")
        self.assertEqual(payload["confidence_score"], 80)
        self.assertEqual(payload["analysis"]["confrontations"][0]["skill_name"], "Airflow")
        self.assertIn("computed_at", payload)


if __name__ == "__main__":
    unittest.main()
