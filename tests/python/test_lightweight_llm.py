from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
PYTHON_SRC_DIR = ROOT_DIR / "src" / "python"

if str(PYTHON_SRC_DIR) not in sys.path:
    sys.path.insert(0, str(PYTHON_SRC_DIR))

from actu_emploi_pipeline.analysis.lightweight_llm import OpenAICompatibleLightweightLlmClient, _json_from_response
from actu_emploi_pipeline.analysis.hardware import HardwareAcceleration


class StaticLlmClient(OpenAICompatibleLightweightLlmClient):
    def __init__(self, response: dict[str, object]) -> None:
        super().__init__(
            endpoint_url="http://unused",
            model_name="fake",
            timeout_seconds=1,
            keep_alive="30s",
            hardware=HardwareAcceleration(
                detected=True,
                device_kind="amd-gpu",
                device_name="AMD Radeon Test",
                backend_hint="directml-or-vulkan",
            ),
        )
        self.response = response
        self.last_payload: dict[str, object] | None = None

    def _chat_json(self, system_prompt: str, user_payload: dict[str, object]) -> dict[str, object]:
        self.last_payload = user_payload
        return json.loads(json.dumps(self.response))


class LightweightLlmTest(unittest.TestCase):
    def test_accepts_high_confidence_out_of_catalog_skill_with_evidence(self) -> None:
        client = StaticLlmClient(
            {
                "skills": [
                    {
                        "skill_name": "Streamlit",
                        "evidence_text": "Application Streamlit de demonstration",
                        "confidence_score": 88,
                    }
                ]
            }
        )

        result = client.extract_skills(entity_kind="profile", text="Application Streamlit de demonstration")

        self.assertEqual(result[0].skill_name, "Streamlit")
        self.assertEqual(client.device_kind, "amd-gpu")

    def test_rejects_low_confidence_out_of_catalog_skill(self) -> None:
        client = StaticLlmClient(
            {
                "skills": [
                    {
                        "skill_name": "Kubernetes",
                        "evidence_text": "mention trop vague",
                        "confidence_score": 62,
                    }
                ]
            }
        )

        result = client.extract_skills(entity_kind="job", text="mention trop vague")

        self.assertEqual(result, [])

    def test_parses_json_wrapped_in_markdown_fence(self) -> None:
        result = _json_from_response(
            {
                "choices": [
                    {
                        "message": {
                            "content": '```json\n{"skills":[{"skill_name":"SQL"}]}\n```',
                        }
                    }
                ]
            }
        )

        self.assertEqual(result["skills"][0]["skill_name"], "SQL")


if __name__ == "__main__":
    unittest.main()
