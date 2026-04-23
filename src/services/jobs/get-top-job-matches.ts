import type { JobDetail, JobSource } from "@/src/domain/types";
import { getTopJobMatchesFromStore } from "@/src/services/runtime/local-store";

type GetTopJobMatchesInput = {
  minScore?: number;
  role?: string;
  source?: string;
};

export function getTopJobMatches({ minScore = 0, role, source }: GetTopJobMatchesInput) {
  return getTopJobMatchesFromStore()
    .filter((item) => item.match.scoreGlobal >= minScore)
    .filter((item) => !role || item.job.title.toLowerCase().includes(role.toLowerCase()))
    .filter((item) => !source || item.job.source === (source as JobSource))
    .sort((left, right) => right.match.scoreGlobal - left.match.scoreGlobal);
}

export function toJobDetailSnapshot(detail: JobDetail) {
  return {
    id: detail.job.id,
    title: detail.job.title,
    source: detail.job.source,
    score: detail.match.scoreGlobal,
    explanation: detail.match.explanation
  };
}
