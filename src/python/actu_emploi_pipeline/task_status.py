from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[3]
TASKS_DIR = PROJECT_ROOT / "data" / "runtime" / "tasks"


def _task_path(task_id: str) -> Path:
    TASKS_DIR.mkdir(parents=True, exist_ok=True)
    return TASKS_DIR / f"{task_id}.json"


def _read_task(task_id: str) -> dict[str, Any]:
    path = _task_path(task_id)
    if not path.exists():
        raise FileNotFoundError(f"Task not found: {task_id}")
    return json.loads(path.read_text(encoding="utf-8"))


def _write_task(task_id: str, payload: dict[str, Any]) -> None:
    _task_path(task_id).write_text(f"{json.dumps(payload, ensure_ascii=False, indent=2)}\n", encoding="utf-8")


def _append_log(payload: dict[str, Any], message: str) -> None:
    logs = payload.get("logs")
    if not isinstance(logs, list):
        logs = []
        payload["logs"] = logs
    logs.append(message)


def mark_task_running(task_id: str, step: str, message: str | None = None) -> None:
    payload = _read_task(task_id)
    payload["status"] = "running"
    payload["currentStep"] = step
    payload["startedAt"] = payload.get("startedAt") or datetime.now(timezone.utc).isoformat()
    if message:
        _append_log(payload, message)
    _write_task(task_id, payload)


def update_task_step(task_id: str, step: str, message: str | None = None) -> None:
    payload = _read_task(task_id)
    payload["status"] = payload.get("status", "running")
    payload["currentStep"] = step
    if message:
        _append_log(payload, message)
    _write_task(task_id, payload)


def mark_task_completed(task_id: str, result: dict[str, Any] | None = None, message: str | None = None) -> None:
    payload = _read_task(task_id)
    payload["status"] = "completed"
    payload["currentStep"] = "Termine"
    payload["finishedAt"] = datetime.now(timezone.utc).isoformat()
    if message:
        _append_log(payload, message)
    if result is not None:
        payload["result"] = result
    _write_task(task_id, payload)


def mark_task_failed(task_id: str, error: str, message: str | None = None) -> None:
    payload = _read_task(task_id)
    payload["status"] = "failed"
    payload["currentStep"] = "Erreur"
    payload["finishedAt"] = datetime.now(timezone.utc).isoformat()
    payload["error"] = error
    if message:
        _append_log(payload, message)
    _append_log(payload, error)
    _write_task(task_id, payload)
