import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
let child = null;
let cleaningUp = false;

function runNodeScript(scriptPath, args = []) {
  spawnSync(process.execPath, [path.join(projectRoot, scriptPath), ...args], {
    cwd: projectRoot,
    stdio: "inherit",
    windowsHide: true
  });
}

function stopChild() {
  if (!child?.pid) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      cwd: projectRoot,
      stdio: "ignore",
      windowsHide: true
    });
    return;
  }

  try {
    child.kill("SIGTERM");
  } catch {
    // Already stopped.
  }
}

function cleanup(exitCode = 0) {
  if (cleaningUp) {
    return;
  }

  cleaningUp = true;
  console.log("\nArret de l'app: nettoyage des taches agentiques et du LLM...");
  stopChild();
  runNodeScript("scripts/runtime-tasks.mjs", ["stop"]);
  runNodeScript("scripts/llm-runtime.mjs", ["stop"]);
  process.exit(exitCode);
}

if (!fs.existsSync(nextBin)) {
  console.error(`Next introuvable: ${nextBin}`);
  process.exit(1);
}

child = spawn(process.execPath, [nextBin, "dev"], {
  cwd: projectRoot,
  stdio: "inherit",
  windowsHide: true
});

process.on("SIGINT", () => cleanup(0));
process.on("SIGTERM", () => cleanup(0));
process.on("SIGHUP", () => cleanup(0));

child.on("exit", (code, signal) => {
  if (cleaningUp) {
    return;
  }
  if (signal) {
    cleanup(0);
    return;
  }
  process.exit(code ?? 0);
});
