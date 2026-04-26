import { NextResponse } from "next/server";
import { getJobDetail } from "@/src/services/jobs/get-job-detail";
import { spawnPythonTask } from "@/src/services/runtime/python-task-runner";
import { createRuntimeTask } from "@/src/services/runtime/task-store";

type AgenticAnalysisRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: AgenticAnalysisRouteProps) {
  const { id } = await params;

  if (!getJobDetail(id)) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  try {
    const task = createRuntimeTask({
      kind: "agentic_analysis",
      title: "Analyse agentique CV/offre",
      metadata: { jobId: id }
    });
    spawnPythonTask(task, "scripts/python/run_agentic_job_match_task.py", ["--task-id", task.id, "--job-id", id]);

    if (request.headers.get("accept")?.includes("text/html")) {
      return NextResponse.redirect(new URL("/agents", request.url), 303);
    }
    return NextResponse.json({ taskId: task.id }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Agentic analysis failed"
      },
      { status: 500 }
    );
  }
}
