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
from actu_emploi_pipeline.analysis.agentic_orchestrator import ControlledMcpGateway, run_agentic_job_match


class AgenticOrchestratorTest(unittest.TestCase):
    def test_runs_observable_agentic_match_with_mcp_traces(self) -> None:
        tmp_root = ROOT_DIR / ".tmp" / "agentic-orchestrator-test"
        tmp_root.mkdir(parents=True, exist_ok=True)
        documents_path = tmp_root / "candidate-documents.json"
        pipeline_output_path = tmp_root / "pipeline-output.json"
        agent_runs_dir = tmp_root / "agent-runs"

        documents_path.write_text(
            json.dumps(
                [
                    {
                        "id": "doc-1",
                        "documentType": "cv",
                        "sourceFilename": "cv.txt",
                        "contentText": "Data analyst avec SQL, Python et tableaux de bord.",
                        "parsedJson": {"extraction_status": "seed"},
                        "createdAt": "2026-04-26T00:00:00Z",
                    }
                ]
            ),
            encoding="utf-8",
        )
        pipeline_output_path.write_text(
            json.dumps(
                {
                    "jobs": [
                        {
                            "job": {
                                "id": "job-test",
                                "source": "fixture",
                                "source_job_id": "1",
                                "canonical_job_key": "data-analyst",
                                "title": "Data Analyst",
                                "company_name": "Example",
                                "location_text": "Nantes",
                                "remote_mode": "hybrid",
                                "contract_type": "CDI",
                                "seniority_text": "2 ans",
                                "description_text": "SQL, Power BI et dbt pour dashboards.",
                                "published_at": "2026-04-26",
                                "skills_detected": ["SQL", "Power BI", "dbt"],
                            }
                        }
                    ]
                }
            ),
            encoding="utf-8",
        )

        original_documents_path = storage.CANDIDATE_DOCUMENTS_PATH
        original_pipeline_output_path = storage.PIPELINE_OUTPUT_PATH
        original_agent_runs_dir = storage.AGENT_RUNS_DIR
        try:
            storage.CANDIDATE_DOCUMENTS_PATH = documents_path
            storage.PIPELINE_OUTPUT_PATH = pipeline_output_path
            storage.AGENT_RUNS_DIR = agent_runs_dir

            result = run_agentic_job_match("job-test")
        finally:
            storage.CANDIDATE_DOCUMENTS_PATH = original_documents_path
            storage.PIPELINE_OUTPUT_PATH = original_pipeline_output_path
            storage.AGENT_RUNS_DIR = original_agent_runs_dir

        self.assertEqual(result["status"], "completed")
        self.assertGreaterEqual(result["confidence_score"], 70)
        self.assertEqual(len(result["tasks"]), 6)
        self.assertEqual(
            [call["server_name"] for call in result["mcp_calls"]],
            ["profile-mcp", "jobs-mcp", "audit-mcp"],
        )
        self.assertTrue(all(call["permission_status"] == "allowed" for call in result["mcp_calls"]))
        self.assertEqual(result["tasks"][1]["input_json"]["job_id"], "job-test")
        self.assertTrue((agent_runs_dir / f"{result['id']}.json").exists())

    def test_mcp_gateway_denies_unknown_tools(self) -> None:
        gateway = ControlledMcpGateway("run-test")

        with self.assertRaises(PermissionError):
            gateway._ensure_allowed("jobs-mcp", "delete_normalized_job", "task-denied")

        self.assertEqual(gateway.calls[0]["permission_status"], "denied")
        self.assertEqual(gateway.calls[0]["tool_name"], "delete_normalized_job")


if __name__ == "__main__":
    unittest.main()
