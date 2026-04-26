import fs from "node:fs";
import path from "node:path";

export type RuntimeTaskStatus = "queued" | "running" | "completed" | "failed";

export type RuntimeTask = {
  id: string;
  kind: "offers_refresh" | "agentic_analysis";
  title: string;
  status: RuntimeTaskStatus;
  currentStep: string;
  logs: string[];
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  processPid?: number;
  result?: Record<string, unknown>;
  error?: string;
  metadata?: Record<string, unknown>;
};

const runtimeTasksDir = path.join(process.cwd(), "data", "runtime", "tasks");

function ensureRuntimeTasksDir() {
  fs.mkdirSync(runtimeTasksDir, { recursive: true });
}

function taskPath(taskId: string) {
  return path.join(runtimeTasksDir, `${taskId}.json`);
}

export function createRuntimeTask(input: Pick<RuntimeTask, "kind" | "title"> & { metadata?: Record<string, unknown> }) {
  ensureRuntimeTasksDir();
  const now = new Date().toISOString();
  const task: RuntimeTask = {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: input.kind,
    title: input.title,
    status: "queued",
    currentStep: "En attente...",
    logs: [],
    createdAt: now,
    metadata: input.metadata
  };

  fs.writeFileSync(taskPath(task.id), `${JSON.stringify(task, null, 2)}\n`, "utf8");
  return task;
}

export function readRuntimeTask(taskId: string) {
  ensureRuntimeTasksDir();
  const filePath = taskPath(taskId);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as RuntimeTask;
  } catch {
    return null;
  }
}

export function attachRuntimeTaskProcess(taskId: string, processPid: number | undefined) {
  if (!processPid) {
    return;
  }

  const task = readRuntimeTask(taskId);
  if (!task) {
    return;
  }

  fs.writeFileSync(taskPath(task.id), `${JSON.stringify({ ...task, processPid }, null, 2)}\n`, "utf8");
}
