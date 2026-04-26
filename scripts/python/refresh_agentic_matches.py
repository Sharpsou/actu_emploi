from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
PYTHON_SRC_DIR = ROOT_DIR / "src" / "python"

if str(PYTHON_SRC_DIR) not in sys.path:
    sys.path.insert(0, str(PYTHON_SRC_DIR))

from actu_emploi_pipeline.analysis.precomputed_matches import refresh_pipeline_output_agentic_analyses


def main() -> None:
    result = refresh_pipeline_output_agentic_analyses()
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
