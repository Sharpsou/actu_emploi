from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
PYTHON_SRC_DIR = ROOT_DIR / "src" / "python"

if str(PYTHON_SRC_DIR) not in sys.path:
    sys.path.insert(0, str(PYTHON_SRC_DIR))

from actu_emploi_pipeline.analysis.agentic_orchestrator import run_agentic_job_match


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: run_agentic_job_match.py <job_id>")

    result = run_agentic_job_match(sys.argv[1])
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
