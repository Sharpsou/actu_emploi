from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
PYTHON_SRC_DIR = ROOT_DIR / "src" / "python"

if str(PYTHON_SRC_DIR) not in sys.path:
    sys.path.insert(0, str(PYTHON_SRC_DIR))

import os

from actu_emploi_pipeline.pipeline import run_pipeline
from actu_emploi_pipeline.task_status import mark_task_completed, mark_task_failed, mark_task_running, update_task_step


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--task-id", required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    try:
        mark_task_running(args.task_id, "Initialisation", "Tache pipeline demarree.")
        result = run_pipeline(progress_callback=lambda step: update_task_step(args.task_id, step, step))
        mark_task_completed(
            args.task_id,
            result={
                "generated_at": result.get("generated_at"),
                "feed_date": result.get("feed_date"),
                "stats": result.get("stats"),
            },
            message="Pipeline termine.",
        )
        print(json.dumps(result, ensure_ascii=False))
        return 0
    except Exception as error:  # pragma: no cover - defensive wrapper
        mark_task_failed(args.task_id, str(error), "Le pipeline a echoue.")
        print(json.dumps({"error": str(error)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
