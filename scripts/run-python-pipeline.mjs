import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const scriptPath = path.join(projectRoot, "scripts", "python", "run_sample_pipeline.py");
const envFilePath = path.join(projectRoot, ".env");

function readDotEnv(filePath) {
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

const dotEnv = readDotEnv(envFilePath);

function getPythonCandidates() {
  const configured = process.env.PYTHON_EXECUTABLE;
  return [
    configured,
    path.join(projectRoot, ".venv", "Scripts", "python.exe"),
    path.join(projectRoot, ".venv", "bin", "python"),
    "python"
  ].filter(Boolean);
}

if (!fs.existsSync(scriptPath)) {
  throw new Error(`Missing python script: ${scriptPath}`);
}

let lastFailure = "No Python candidate was available.";

for (const executable of getPythonCandidates()) {
  const result = spawnSync(executable, [scriptPath], {
    cwd: projectRoot,
    env: {
      ...dotEnv,
      ...process.env,
      PYTHONIOENCODING: "utf-8"
    },
    encoding: "utf8",
    stdio: "inherit",
    windowsHide: true
  });

  if (result.error) {
    lastFailure = `${executable}: ${result.error.message}`;
    continue;
  }

  if (result.status !== 0) {
    lastFailure = `${executable}: exited with status ${result.status}`;
    continue;
  }

  process.exit(0);
}

throw new Error(lastFailure);
