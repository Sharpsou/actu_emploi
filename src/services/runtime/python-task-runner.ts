import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { getPythonCandidates } from "@/src/services/runtime/python-executable";
import type { RuntimeTask } from "@/src/services/runtime/task-store";

function resolveScriptPath(scriptRelativePath: string) {
  return path.join(process.cwd(), scriptRelativePath);
}

function readDotEnv(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        const key = line.slice(0, separatorIndex).trim();
        const rawValue = line.slice(separatorIndex + 1).trim();
        const value =
          (rawValue.startsWith("\"") && rawValue.endsWith("\"")) ||
          (rawValue.startsWith("'") && rawValue.endsWith("'"))
            ? rawValue.slice(1, -1)
            : rawValue;
        return [key, value];
      })
  );
}

export function spawnPythonTask(task: RuntimeTask, scriptRelativePath: string, args: string[], envOverrides?: Record<string, string>) {
  const scriptPath = resolveScriptPath(scriptRelativePath);
  const dotEnv = readDotEnv(path.join(process.cwd(), ".env"));

  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Python task script missing: ${scriptPath}`);
  }

  const pythonExecutable = getPythonCandidates()[0];
  if (!pythonExecutable) {
    throw new Error("Aucun executable Python disponible pour lancer la tache.");
  }

  const child = spawn(pythonExecutable, [scriptPath, ...args], {
    cwd: process.cwd(),
    env: {
      ...dotEnv,
      ...process.env,
      PYTHONIOENCODING: "utf-8",
      ...envOverrides
    },
    stdio: "ignore",
    detached: true,
    windowsHide: true
  });

  child.unref();
}
