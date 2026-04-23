from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
PYTHON_SRC_DIR = ROOT_DIR / "src" / "python"

if str(PYTHON_SRC_DIR) not in sys.path:
    sys.path.insert(0, str(PYTHON_SRC_DIR))

from actu_emploi_pipeline.analysis.document_quality import evaluate_document_text_quality


class DocumentQualityTest(unittest.TestCase):
    def test_rejects_corrupted_pdf_text(self) -> None:
        content = (
            '*2 ?DQ?CP Â§Â³Ã”|Â„Â\x9ddk HM [as:>JU[l Â®ÂºÃ\x9d NScx qxÂ€Â™ '
            's|Â“u}Â• szÂ‘szÂ‘ qxÂ�qyÂ� bi}bh}'
        ) * 4

        ok, reason = evaluate_document_text_quality(content, "pdf_text_stream")

        self.assertFalse(ok)
        self.assertIsNotNone(reason)

    def test_accepts_readable_pdf_text(self) -> None:
        content = (
            "Data scientist avec experience Python, SQL, machine learning, visualisation, "
            "pipelines de donnees, experimentation produit et communication avec les equipes. "
            "Projet a Nantes avec teletravail partiel et forte orientation analyse."
        )

        ok, reason = evaluate_document_text_quality(content, "pdf_text_stream")

        self.assertTrue(ok)
        self.assertIsNone(reason)

    def test_accepts_other_pdf_extraction_method_names(self) -> None:
        content = (
            "Data analyst avec experience SQL, Power BI, modelisation, automatisation de reporting "
            "et communication avec les equipes produit a Nantes."
        )

        ok, reason = evaluate_document_text_quality(content, "pdf_js_text")

        self.assertTrue(ok)
        self.assertIsNone(reason)


if __name__ == "__main__":
    unittest.main()
