import type { JobMatch, ScoreExplanation } from "@/src/domain/types";

export function buildScoreExplanation(input: {
  strengths: string[];
  missingSkills: string[];
  penalties: string[];
  quickWins: string[];
  blockingPoints: string[];
}): ScoreExplanation {
  return {
    strengths: input.strengths,
    missingSkills: input.missingSkills,
    penalties: input.penalties,
    quickWins: input.quickWins,
    blockingPoints: input.blockingPoints
  };
}

export function computeGlobalScore(match: Omit<JobMatch, "scoreGlobal">) {
  return (
    match.scoreRole +
    match.scoreSkillsMatch +
    match.scoreStackFit +
    match.scoreSeniority +
    match.scorePenalties +
    match.scorePreference
  );
}
