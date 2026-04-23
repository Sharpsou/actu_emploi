import { listJobMatches, listJobsNormalized, replaceFeedItems } from "@/src/db/mock-store";
import type { DailyFeedItem } from "@/src/domain/types";

export function buildDailyFeed(date: string) {
  const jobs = listJobsNormalized();
  const matches = listJobMatches().sort((left, right) => right.scoreGlobal - left.scoreGlobal);

  const topOfferItems: DailyFeedItem[] = matches.slice(0, 2).map((match, index) => {
    const job = jobs.find((item) => item.id === match.jobId);

    if (!job) {
      throw new Error(`Missing normalized job for ${match.jobId}`);
    }

    return {
      id: `feed-auto-offre-${index + 1}`,
      feedDate: date,
      kind: "offre",
      relatedJobId: job.id,
      relatedJobMatchId: match.id,
      title: `${job.title} - ${job.companyName}`,
      summary: match.explanation.strengths.join(", "),
      score: match.scoreGlobal,
      rank: index + 1,
      source: job.source,
      tags: [...match.matchedSkills.slice(0, 3), ...match.missingSkills.slice(0, 2)],
      payload: {
        explanation: match.explanation
      },
      createdAt: `${date}T06:45:00.000Z`
    };
  });

  const generated: DailyFeedItem[] = [
    ...topOfferItems,
    {
      id: "feed-auto-competence-1",
      feedDate: date,
      kind: "competence",
      title: "Airflow consolide sa place dans les offres data modernes",
      summary: "Le signal revient regulierement des qu'une equipe parle d'orchestration ou de fiabilite de pipelines.",
      score: 72,
      rank: 3,
      tags: ["outil", "orchestration", "impact eleve"],
      payload: {
        observedAcrossJobs: ["job-002"]
      },
      createdAt: `${date}T06:45:30.000Z`
    },
    {
      id: "feed-auto-notion-1",
      feedDate: date,
      kind: "notion",
      title: "Clarifier la difference entre ELT et ETL",
      summary: "Une notion utile pour expliquer les choix de stack dans les entretiens data engineering ou analytics engineering.",
      score: 66,
      rank: 4,
      tags: ["theorique", "pipeline", "entretien"],
      payload: {
        linkedSkills: ["ELT", "dbt"]
      },
      createdAt: `${date}T06:46:00.000Z`
    },
    {
      id: "feed-auto-projet-1",
      feedDate: date,
      kind: "projet",
      title: "POC dbt + DuckDB + dashboard Metabase",
      summary: "Une preuve simple pour montrer transformation, modelisation et restitution dans un seul repo.",
      score: 70,
      rank: 5,
      tags: ["pratique", "dbt", "portfolio"],
      payload: {
        deliverables: ["repo", "README", "capture dashboard"]
      },
      createdAt: `${date}T06:46:30.000Z`
    }
  ];

  replaceFeedItems(generated);
  return generated;
}
