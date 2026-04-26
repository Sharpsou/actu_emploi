import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const tasksDir = path.join(process.cwd(), "data", "runtime", "tasks");

function readTasks() {
  if (!fs.existsSync(tasksDir)) {
    return [];
  }

  return fs
    .readdirSync(tasksDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      const filePath = path.join(tasksDir, name);
      try {
        return { filePath, task: JSON.parse(fs.readFileSync(filePath, "utf8")) };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function isAlive(pid) {
  if (!pid) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function stopPid(pid) {
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true
    });
    return;
  }
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // Already stopped.
  }
}

function writeTask(filePath, task) {
  fs.writeFileSync(filePath, `${JSON.stringify(task, null, 2)}\n`, "utf8");
}

function status() {
  const tasks = readTasks()
    .map(({ task }) => task)
    .filter((task) => task.status === "queued" || task.status === "running")
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  if (tasks.length === 0) {
    console.log("Aucune tache runtime active.");
    return;
  }

  for (const task of tasks) {
    const alive = isAlive(task.processPid);
    console.log(`${task.id} | ${task.kind} | ${task.status} | pid=${task.processPid ?? "?"} | alive=${alive}`);
    console.log(`  ${task.currentStep}`);
  }
}

function stop() {
  let stopped = 0;

  for (const item of readTasks()) {
    const { filePath, task } = item;
    if (task.status !== "queued" && task.status !== "running") {
      continue;
    }

    if (isAlive(task.processPid)) {
      stopPid(task.processPid);
      stopped += 1;
    }

    writeTask(filePath, {
      ...task,
      status: "failed",
      currentStep: "Arrete",
      finishedAt: new Date().toISOString(),
      error: "Tache arretee manuellement.",
      logs: [...(Array.isArray(task.logs) ? task.logs : []), "Tache arretee manuellement."]
    });
  }

  console.log(stopped > 0 ? `${stopped} tache(s) runtime arretee(s).` : "Aucune tache runtime active a arreter.");
}

const command = process.argv[2] || "status";

if (command === "status") {
  status();
} else if (command === "stop") {
  stop();
} else {
  console.error(`Commande inconnue: ${command}`);
  process.exit(1);
}
