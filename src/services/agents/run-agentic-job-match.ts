import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { getPythonCandidates } from "@/src/services/runtime/python-executable";
import type { AgentRun } from "@/src/domain/types";

const projectRoot = process.cwd();
const scriptPath = path.join(projectRoot, "scripts", "python", "run_agentic_job_match.py");

type PythonAgentRun = {
  id: string;
  job_id: string;
  user_request: string;
  status: string;
  confidence_score: number;
  human_review_required: boolean;
  created_at: string;
  completed_at?: string | null;
  result: Record<string, unknown>;
  tasks: Array<{
    id: string;
    agent_name: string;
    model_name: string;
    status: string;
    input_json: Record<string, unknown>;
    output_json: Record<string, unknown>;
    confidence_score: number;
    latency_ms: number;
    error_text?: string | null;
  }>;
  mcp_calls: Array<{
    id: string;
    run_id: string;
    task_id?: string | null;
    server_name: string;
    tool_name: string;
    input_json: Record<string, unknown>;
    output_json: Record<string, unknown>;
    permission_status: string;
    latency_ms: number;
    created_at: string;
  }>;
};

function mapAgentRun(run: PythonAgentRun): AgentRun {
  return {
    id: run.id,
    jobId: run.job_id,
    userRequest: run.user_request,
    status: run.status,
    confidenceScore: run.confidence_score,
    humanReviewRequired: run.human_review_required,
    createdAt: run.created_at,
    completedAt: run.completed_at,
    result: run.result,
    tasks: run.tasks.map((task) => ({
      id: task.id,
      agentName: task.agent_name,
      modelName: task.model_name,
      status: task.status,
      inputJson: task.input_json,
      outputJson: task.output_json,
      confidenceScore: task.confidence_score,
      latencyMs: task.latency_ms,
      errorText: task.error_text
    })),
    mcpCalls: run.mcp_calls.map((call) => ({
      id: call.id,
      runId: call.run_id,
      taskId: call.task_id,
      serverName: call.server_name,
      toolName: call.tool_name,
      inputJson: call.input_json,
      outputJson: call.output_json,
      permissionStatus: call.permission_status,
      latencyMs: call.latency_ms,
      createdAt: call.created_at
    }))
  };
}

export function runAgenticJobMatch(jobId: string): AgentRun {
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Agentic analysis script missing: ${scriptPath}`);
  }

  const failures: string[] = [];

  for (const executable of getPythonCandidates()) {
    const result = spawnSync(executable, [scriptPath, jobId], {
      cwd: projectRoot,
      env: process.env,
      encoding: "utf8",
      windowsHide: true
    });

    if (result.error) {
      failures.push(`${executable}: ${result.error.message}`);
      continue;
    }

    if (result.status !== 0) {
      failures.push(`${executable}: ${result.stderr || result.stdout}`);
      continue;
    }

    return mapAgentRun(JSON.parse(result.stdout) as PythonAgentRun);
  }

  throw new Error(`Agentic analysis failed. ${failures.join(" | ")}`);
}
