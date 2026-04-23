import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function getBundledPythonPath() {
  return path.join(
    os.homedir(),
    ".cache",
    "codex-runtimes",
    "codex-primary-runtime",
    "dependencies",
    "python",
    "python.exe"
  );
}

export function getPythonCandidates() {
  const projectRoot = process.cwd();
  const configured = process.env.PYTHON_EXECUTABLE;
  const candidates = [
    configured,
    getBundledPythonPath(),
    path.join(projectRoot, ".venv", "Scripts", "python.exe"),
    path.join(projectRoot, ".venv", "bin", "python"),
    "python"
  ].filter((value): value is string => Boolean(value));

  return candidates.filter((candidate, index) => {
    if (index === candidates.length - 1 && candidate === "python") {
      return true;
    }

    return fs.existsSync(candidate);
  });
}
