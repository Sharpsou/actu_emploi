import { NextResponse } from "next/server";
import { readRuntimeTask } from "@/src/services/runtime/task-store";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const task = readRuntimeTask(id);

  if (!task) {
    return NextResponse.json(
      {
        error: "Tache introuvable."
      },
      { status: 404 }
    );
  }

  return NextResponse.json(task);
}
