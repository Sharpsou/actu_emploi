from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
PYTHON_SRC_DIR = ROOT_DIR / "src" / "python"

if str(PYTHON_SRC_DIR) not in sys.path:
    sys.path.insert(0, str(PYTHON_SRC_DIR))

from actu_emploi_pipeline.analysis.skill_extractor import extract_skills


class SkillExtractorTest(unittest.TestCase):
    def test_extracts_real_france_travail_stack_signals(self) -> None:
        text = (
            "DATA ENGINEER (H/F) sur un projet strategique. "
            "L'environnement technique est en PySpark et Databricks."
        )

        self.assertEqual(extract_skills(text), ["Databricks", "Python"])

    def test_extracts_french_dashboard_and_structuration_signals(self) -> None:
        text = (
            "Data analyst avec tableaux de bord, structuration de la donnee "
            "et capacite a preparer la donnee."
        )

        self.assertEqual(extract_skills(text), ["Dashboarding", "ETL", "Modelisation"])


if __name__ == "__main__":
    unittest.main()
