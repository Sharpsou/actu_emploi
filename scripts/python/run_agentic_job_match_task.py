from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
PYTHON_SRC_DIR = ROOT_DIR / "src" / "python"

if str(PYTHON_SRC_DIR) not in sys.path:
    sys.path.insert(0, str(PYTHON_SRC_DIR))

from actu_emploi_pipeline.analysis.agentic_orchestrator import run_agentic_job_match
from actu_emploi_pipeline.task_status import mark_task_completed, mark_task_failed, mark_task_running, update_task_step


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--task-id", required=True)
    parser.add_argument("--job-id", required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    try:
        mark_task_running(args.task_id, "Initialisation", "Analyse agentique demarree.")
        result = run_agentic_job_match(
            args.job_id,
            progress_callback=lambda step: update_task_step(args.task_id, step, step),
        )
        mark_task_completed(
            args.task_id,
            result={
                "run_id": result.get("id"),
                "job_id": result.get("job_id"),
                "status": result.get("status"),
                "confidence_score": result.get("confidence_score"),
                "tasks_count": len(result.get("tasks", [])) if isinstance(result.get("tasks"), list) else 0,
            },
            message="Analyse agentique terminee.",
        )
        print(json.dumps(result, ensure_ascii=False))
        return 0
    except Exception as error:  # pragma: no cover - defensive wrapper
        mark_task_failed(args.task_id, str(error), "L'analyse agentique a echoue.")
        print(json.dumps({"error": str(error)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
