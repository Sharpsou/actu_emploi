from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
PYTHON_SRC_DIR = ROOT_DIR / "src" / "python"

if str(PYTHON_SRC_DIR) not in sys.path:
    sys.path.insert(0, str(PYTHON_SRC_DIR))

from actu_emploi_pipeline import storage


class StorageTest(unittest.TestCase):
    def test_load_candidate_documents_accepts_utf8_bom(self) -> None:
        payload = [
            {
                "id": "doc-bom",
                "documentType": "cv",
                "sourceFilename": "cv.pdf",
                "contentText": "CV data avec Python et SQL.",
                "parsedJson": {"detected_skills": ["Python", "SQL"]},
                "createdAt": "2026-04-23T01:20:21.165Z",
            }
        ]

        tmp_root = ROOT_DIR / ".tmp"
        tmp_root.mkdir(exist_ok=True)

        documents_path = tmp_root / "test-candidate-documents-bom.json"
        documents_path.write_text(
            f"\ufeff{json.dumps(payload, ensure_ascii=False)}",
            encoding="utf-8",
        )

        original_path = storage.CANDIDATE_DOCUMENTS_PATH
        try:
            storage.CANDIDATE_DOCUMENTS_PATH = documents_path
            documents = storage.load_candidate_documents()
        finally:
            storage.CANDIDATE_DOCUMENTS_PATH = original_path
            documents_path.unlink(missing_ok=True)

        self.assertEqual(len(documents), 1)
        self.assertEqual(documents[0].id, "doc-bom")
        self.assertEqual(documents[0].parsed_json["detected_skills"], ["Python", "SQL"])


if __name__ == "__main__":
    unittest.main()
