import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { getPythonCandidates } from "@/src/services/runtime/python-executable";

const projectRoot = process.cwd();
const scriptPath = path.join(projectRoot, "scripts", "python", "run_sample_pipeline.py");

export function runPythonPipeline() {
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Python pipeline script missing: ${scriptPath}`);
  }

  const failures: string[] = [];

  for (const executable of getPythonCandidates()) {
    const result = spawnSync(executable, [scriptPath], {
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

    return JSON.parse(result.stdout);
  }

  throw new Error(`Python pipeline failed. ${failures.join(" | ")}`);
}
