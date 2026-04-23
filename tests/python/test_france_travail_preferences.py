from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT_DIR = Path(__file__).resolve().parents[2]
PYTHON_SRC_DIR = ROOT_DIR / "src" / "python"

if str(PYTHON_SRC_DIR) not in sys.path:
    sys.path.insert(0, str(PYTHON_SRC_DIR))

from actu_emploi_pipeline.sources.france_travail import (
    FranceTravailSource,
    detect_remote_mode,
    matches_location_preference,
)


class FranceTravailPreferencesTest(unittest.TestCase):
    def test_detects_hybrid_offer_from_telework_signal(self) -> None:
        text = "Poste base a Nantes avec 2 jours de teletravail par semaine."
        self.assertEqual(detect_remote_mode(text), "hybrid")

    def test_detects_remote_offer_from_strong_remote_signal(self) -> None:
        text = "Role data engineer full remote en France."
        self.assertEqual(detect_remote_mode(text), "remote")

    def test_matches_nantes_or_saint_nazaire_preferences(self) -> None:
        self.assertTrue(matches_location_preference("Nantes, Pays de la Loire, France", ["Nantes", "Saint-Nazaire"]))
        self.assertTrue(
            matches_location_preference("Saint-Nazaire, Pays de la Loire, France", ["Nantes", "Saint-Nazaire"])
        )
        self.assertFalse(matches_location_preference("Paris, Ile-de-France, France", ["Nantes", "Saint-Nazaire"]))

    def test_build_search_url_keeps_expected_radius_and_sort(self) -> None:
        with patch.dict(
            "os.environ",
            {
                "ACTU_EMPLOI_USE_FIXTURES": "0",
                "FRANCE_TRAVAIL_SEARCH_RADIUS_KM": "10",
                "FRANCE_TRAVAIL_SEARCH_SORT": "0",
            },
            clear=False,
        ):
            source = FranceTravailSource()

        url = source._build_search_url("Data Analyst", "44109")

        self.assertIn("motsCles=Data+Analyst", url)
        self.assertIn("lieux=44109", url)
        self.assertIn("rayon=10", url)
        self.assertIn("tri=0", url)


if __name__ == "__main__":
    unittest.main()
