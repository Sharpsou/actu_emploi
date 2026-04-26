import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { getPythonCandidates } from "@/src/services/runtime/python-executable";

const projectRoot = process.cwd();
const scriptPath = path.join(projectRoot, "scripts", "python", "evaluate_agentic_relevance.py");

export type AgenticEvaluationScore = {
  profile_skill_coverage: number;
  job_skill_coverage: number;
  status_accuracy: number;
  overall_score: number;
};

export type AgenticEvaluationResult = {
  cases_count: number;
  baseline: AgenticEvaluationScore;
  enhanced: AgenticEvaluationScore;
  gain: AgenticEvaluationScore;
  cases: Array<{
    id: string;
    baseline: AgenticEvaluationScore;
    enhanced: AgenticEvaluationScore;
    gain: number;
  }>;
};

export type EvaluateAgenticRelevanceResult =
  | { ok: true; value: AgenticEvaluationResult }
  | { ok: false; error: string };

export function evaluateAgenticRelevance(): EvaluateAgenticRelevanceResult {
  if (!fs.existsSync(scriptPath)) {
    return {
      ok: false,
      error: `Agentic evaluation script missing: ${scriptPath}`
    };
  }

  const failures: string[] = [];

  for (const executable of getPythonCandidates()) {
    const result = spawnSync(executable, [scriptPath], {
      cwd: projectRoot,
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8"
      },
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

    return {
      ok: true,
      value: JSON.parse(result.stdout) as AgenticEvaluationResult
    };
  }

  return {
    ok: false,
    error: `Agentic evaluation failed. ${failures.join(" | ")}`
  };
}
