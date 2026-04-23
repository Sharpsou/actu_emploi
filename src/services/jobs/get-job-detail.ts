import type { JobDetail } from "@/src/domain/types";
import { getJobDetailFromStore } from "@/src/services/runtime/local-store";

export function getJobDetail(jobId: string): JobDetail | null {
  return getJobDetailFromStore(jobId);
}
