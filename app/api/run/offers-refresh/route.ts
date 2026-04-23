import { NextResponse } from "next/server";
import { spawnPythonTask } from "@/src/services/runtime/python-task-runner";
import { createRuntimeTask } from "@/src/services/runtime/task-store";

export async function POST() {
  const task = createRuntimeTask({
    kind: "offers_refresh",
    title: "Rafraichissement des offres"
  });

  spawnPythonTask(task, "scripts/python/run_pipeline_task.py", ["--task-id", task.id]);

  return NextResponse.json(
    {
      taskId: task.id
    },
    { status: 202 }
  );
}
