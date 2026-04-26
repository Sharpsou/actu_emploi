import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { getPythonCandidates } from "@/src/services/runtime/python-executable";

const projectRoot = process.cwd();
const scriptPath = path.join(projectRoot, "scripts", "python", "refresh_agentic_matches.py");

export type RefreshAgenticMatchesResult = {
  ok: boolean;
  jobsRefreshed: number;
  refreshedAt?: string;
  error?: string;
};

type PythonRefreshResult = {
  refreshed_at: string;
  jobs_refreshed: number;
};

export function refreshAgenticMatchesForExistingJobs(): RefreshAgenticMatchesResult {
  if (!fs.existsSync(scriptPath)) {
    return {
      ok: false,
      jobsRefreshed: 0,
      error: `Agentic refresh script missing: ${scriptPath}`
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

    const payload = JSON.parse(result.stdout) as PythonRefreshResult;
    return {
      ok: true,
      jobsRefreshed: payload.jobs_refreshed,
      refreshedAt: payload.refreshed_at
    };
  }

  return {
    ok: false,
    jobsRefreshed: 0,
    error: `Agentic refresh failed. ${failures.join(" | ")}`
  };
}
