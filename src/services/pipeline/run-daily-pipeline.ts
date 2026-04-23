import { runPythonPipeline } from "@/src/services/runtime/python-runner";

export async function runDailyPipeline() {
  const result = runPythonPipeline();

  return {
    status: "ok",
    generated_at: result.generated_at,
    feed_date: result.feed_date,
    stats: result.stats
  };
}
