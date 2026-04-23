from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
PYTHON_SRC_DIR = ROOT_DIR / "src" / "python"

if str(PYTHON_SRC_DIR) not in sys.path:
    sys.path.insert(0, str(PYTHON_SRC_DIR))

from actu_emploi_pipeline.analysis.document_analyzer import analyze_candidate_documents
from actu_emploi_pipeline.models import CandidateDocument, CandidateProfile
from actu_emploi_pipeline.profile_builder import build_candidate_profile


class CandidateDocumentAnalysisTest(unittest.TestCase):
    def test_enriches_seed_documents_with_detected_signals(self) -> None:
        documents = [
            CandidateDocument(
                id="doc-1",
                document_type="cv",
                source_filename="cv.txt",
                content_text=(
                    "Data Analyst avec experience SQL, Python et dashboards. "
                    "Recherche un poste a Nantes avec teletravail hybride."
                ),
                parsed_json={"extraction_status": "seed"},
                created_at="2026-04-22T00:00:00Z",
            )
        ]

        analyzed = analyze_candidate_documents(documents)

        self.assertEqual(analyzed[0].parsed_json["extraction_status"], "done")
        self.assertEqual(analyzed[0].parsed_json["detected_roles"], ["Data Analyst"])
        self.assertEqual(analyzed[0].parsed_json["detected_locations"], ["Nantes", "Remote"])
        self.assertEqual(analyzed[0].parsed_json["detected_skills"], ["Dashboarding", "Python", "SQL"])
        self.assertTrue(analyzed[0].parsed_json["mentions_teletravail"])

    def test_profile_builder_merges_document_skills_from_analysis(self) -> None:
        profile = CandidateProfile(
            id="profile-main",
            target_roles=["Data Analyst"],
            preferred_skills=["SQL"],
            excluded_keywords=[],
            preferred_locations=["Nantes"],
            notes="",
            updated_at="2026-04-22T00:00:00Z",
        )
        documents = analyze_candidate_documents(
            [
                CandidateDocument(
                    id="doc-2",
                    document_type="lettre",
                    source_filename="lettre.txt",
                    content_text=(
                        "Je veux renforcer Python et Power BI dans un role data centre sur "
                        "l'analyse, la visualisation, les pipelines de donnees et la communication "
                        "avec les equipes metier a Nantes."
                    ),
                    parsed_json={"extraction_status": "seed"},
                    created_at="2026-04-22T00:00:00Z",
                )
            ]
        )

        enriched = build_candidate_profile(profile, documents)

        self.assertEqual(enriched.document_skills, ["ETL", "Power BI", "Python"])
        self.assertEqual(enriched.preferred_skills, ["ETL", "Power BI", "Python", "SQL"])


if __name__ == "__main__":
    unittest.main()
