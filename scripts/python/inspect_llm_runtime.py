from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

ROOT_DIR = Path(__file__).resolve().parents[2]
PYTHON_SRC_DIR = ROOT_DIR / "src" / "python"

if str(PYTHON_SRC_DIR) not in sys.path:
    sys.path.insert(0, str(PYTHON_SRC_DIR))

from actu_emploi_pipeline.analysis.hardware import detect_hardware_acceleration
from actu_emploi_pipeline.analysis.lightweight_llm import build_lightweight_llm_client


def _ollama_base_url(endpoint_url: str) -> str | None:
    parts = urlsplit(endpoint_url)
    if not parts.scheme or not parts.netloc:
        return None
    return urlunsplit((parts.scheme, parts.netloc, "", "", ""))


def _ollama_running_models(endpoint_url: str) -> list[dict[str, object]]:
    base_url = _ollama_base_url(endpoint_url)
    if not base_url:
        return []
    try:
        with urllib.request.urlopen(f"{base_url}/api/ps", timeout=5) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (OSError, urllib.error.URLError, json.JSONDecodeError):
        return []

    models = payload.get("models")
    return models if isinstance(models, list) else []


def main() -> None:
    hardware = detect_hardware_acceleration()
    client = build_lightweight_llm_client()
    health = client.health_check()
    endpoint_url = health.get("endpoint_url")
    running_models = _ollama_running_models(endpoint_url) if isinstance(endpoint_url, str) else []
    print(
        json.dumps(
            {
                "hardware": {
                    "detected": hardware.detected,
                    "device_kind": hardware.device_kind,
                    "device_name": hardware.device_name,
                    "backend_hint": hardware.backend_hint,
                },
                "llm_client": {
                    "model_name": client.model_name,
                    "device_kind": client.device_kind,
                    "health": health,
                    "running_models": running_models,
                },
            },
            indent=2,
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
