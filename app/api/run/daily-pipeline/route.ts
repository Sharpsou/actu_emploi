import { NextResponse } from "next/server";
import { runDailyPipeline } from "@/src/services/pipeline/run-daily-pipeline";

export async function POST() {
  const result = await runDailyPipeline();

  return NextResponse.json(result);
}
