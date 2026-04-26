from __future__ import annotations

import json
import sys
from dataclasses import asdict
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
PYTHON_SRC_DIR = ROOT_DIR / "src" / "python"

if str(PYTHON_SRC_DIR) not in sys.path:
    sys.path.insert(0, str(PYTHON_SRC_DIR))

from actu_emploi_pipeline.analysis.document_analyzer import reanalyze_candidate_document
from actu_emploi_pipeline.models import CandidateDocument


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    payload = json.loads(sys.stdin.read() or "{}")
    content = payload.get("content_text")
    if not isinstance(content, str) or not content.strip():
        print(json.dumps({"error": "content_text is required"}))
        return 1

    extraction_method = payload.get("extraction_method")
    document = CandidateDocument(
        id="transient-document",
        document_type=str(payload.get("document_type") or "cv"),
        source_filename=str(payload.get("source_filename") or "document.txt"),
        content_text=content,
        parsed_json={
            "extraction_status": "seed",
            "extraction_method": extraction_method if isinstance(extraction_method, str) else "manual_text",
        },
        created_at="",
    )

    analyzed = reanalyze_candidate_document(document)
    print(json.dumps(asdict(analyzed)["parsed_json"], ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
