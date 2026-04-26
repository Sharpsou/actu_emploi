import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ollamaExe =
  process.env.OLLAMA_EXECUTABLE ||
  path.join(process.env.LOCALAPPDATA || "", "AMD", "AI_Bundle", "Ollama", "ollama.exe");

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

const dotEnv = readDotEnv(path.join(process.cwd(), ".env"));
const model = process.env.LIGHTWEIGHT_LLM_MODEL || dotEnv.LIGHTWEIGHT_LLM_MODEL || "qwen2.5:3b";

function run(args, stdio = "inherit") {
  const result = spawnSync(ollamaExe, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio,
    windowsHide: true
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  return result;
}

function stop() {
  run(["stop", model]);
}

function ps() {
  run(["ps"]);
}

const command = process.argv[2] || "ps";

if (command === "stop") {
  stop();
} else if (command === "ps") {
  ps();
} else {
  console.error(`Commande inconnue: ${command}`);
  process.exit(1);
}
