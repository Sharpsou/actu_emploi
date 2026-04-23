import fs from "node:fs";
import path from "node:path";
import {
  candidateDocumentsFixture,
  candidateProfileFixture,
  dailyFeedFixture,
  jobMatchesFixture,
  jobsNormalizedFixture,
  skillGapsFixture
} from "@/src/services/fixtures/mock-data";
import type {
  CandidateDocument,
  DailyFeedItem,
  JobMatch,
  JobSource,
  NormalizedJob,
  SkillGap,
  SuggestedAction
} from "@/src/domain/types";

type PythonSuggestedAction = {
  title: string;
  format: string;
  deliverable: string;
  description?: string;
  example?: string;
  free_alternative?: string | null;
  public_data_idea?: string | null;
};

type PythonSkillGap = {
  id: string;
  job_match_id: string;
  skill_name: string;
  gap_type: "theorique" | "pratique" | "outil";
  importance_score: number;
  rationale_text: string;
  suggested_action: PythonSuggestedAction;
};

type PythonScoredJob = {
  id: string;
  candidate_profile_id: string;
  computed_at: string;
  score_global: number;
  score_role: number;
  score_skills_match: number;
  score_stack_fit: number;
  score_seniority: number;
  score_penalties: number;
  score_preference: number;
  explanation: {
    strengths: string[];
    missing_skills: string[];
    penalties: string[];
    quick_wins: string[];
    blocking_points: string[];
  };
  matched_skills: string[];
  missing_skills: string[];
  job: {
    id: string;
    source: JobSource;
    source_job_id: string;
    canonical_job_key: string;
    title: string;
    company_name: string;
    location_text: string;
    remote_mode: "remote" | "hybrid" | "onsite";
    contract_type: string;
    seniority_text: string;
    description_text: string;
    published_at: string;
    skills_detected: string[];
  };
  gaps: PythonSkillGap[];
};

type PythonFeedItem = {
  id: string;
  feed_date: string;
  kind: "offre" | "competence" | "notion" | "projet";
  related_job_id?: string;
  related_job_match_id?: string;
  title: string;
  summary: string;
  score: number;
  rank: number;
  source?: JobSource;
  tags: string[];
  payload: Record<string, unknown>;
  created_at: string;
};

type PythonPipelineOutput = {
  generated_at: string | null;
  feed_date: string;
  profile: Record<string, unknown> | null;
  documents: Record<string, unknown>[];
  stats: Record<string, number>;
  source_runs: Array<{
    source: string;
    status: string;
    reason?: string;
    error?: string;
    jobs_fetched?: number;
  }>;
  jobs: PythonScoredJob[];
  feed_items: PythonFeedItem[];
};

const runtimeDirPath = path.join(process.cwd(), "data", "runtime");
const candidateProfilePath = path.join(runtimeDirPath, "candidate-profile.json");
const candidateDocumentsPath = path.join(runtimeDirPath, "candidate-documents.json");
const pipelineOutputPath = path.join(runtimeDirPath, "pipeline-output.json");

function ensureRuntimeDir() {
  fs.mkdirSync(runtimeDirPath, { recursive: true });
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  ensureRuntimeDir();

  if (!fs.existsSync(filePath)) {
    writeJsonFile(filePath, fallback);
    return fallback;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJsonFile<T>(filePath: string, data: T) {
  ensureRuntimeDir();
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function mapSuggestedAction(action: PythonSuggestedAction): SuggestedAction {
  return {
    title: action.title,
    format: action.format,
    deliverable: action.deliverable,
    description: action.description,
    example: action.example,
    freeAlternative: action.free_alternative ?? undefined,
    publicDataIdea: action.public_data_idea ?? undefined
  };
}

function mapNormalizedJob(job: PythonScoredJob["job"], normalizedAt: string): NormalizedJob {
  return {
    id: job.id,
    rawJobId: `raw-${job.source_job_id.toLowerCase()}`,
    canonicalJobKey: job.canonical_job_key,
    source: job.source,
    title: job.title,
    companyName: job.company_name,
    locationText: job.location_text,
    remoteMode: job.remote_mode,
    contractType: job.contract_type,
    seniorityText: job.seniority_text,
    descriptionText: job.description_text,
    skillsDetected: job.skills_detected,
    publishedAt: job.published_at,
    normalizedAt
  };
}

function mapJobMatch(job: PythonScoredJob): JobMatch {
  return {
    id: job.id,
    jobId: job.job.id,
    candidateProfileId: job.candidate_profile_id,
    scoreGlobal: job.score_global,
    scoreRole: job.score_role,
    scoreSkillsMatch: job.score_skills_match,
    scoreStackFit: job.score_stack_fit,
    scoreSeniority: job.score_seniority,
    scorePenalties: job.score_penalties,
    scorePreference: job.score_preference,
    explanation: {
      strengths: job.explanation.strengths,
      missingSkills: job.explanation.missing_skills,
      penalties: job.explanation.penalties,
      quickWins: job.explanation.quick_wins,
      blockingPoints: job.explanation.blocking_points
    },
    matchedSkills: job.matched_skills,
    missingSkills: job.missing_skills,
    computedAt: job.computed_at
  };
}

function mapSkillGap(gap: PythonSkillGap): SkillGap {
  return {
    id: gap.id,
    jobMatchId: gap.job_match_id,
    skillName: gap.skill_name,
    gapType: gap.gap_type,
    importanceScore: gap.importance_score,
    rationaleText: gap.rationale_text,
    suggestedAction: mapSuggestedAction(gap.suggested_action)
  };
}

function mapFeedItem(item: PythonFeedItem): DailyFeedItem {
  return {
    id: item.id,
    feedDate: item.feed_date,
    kind: item.kind,
    relatedJobId: item.related_job_id,
    relatedJobMatchId: item.related_job_match_id,
    title: item.title,
    summary: item.summary,
    score: item.score,
    rank: item.rank,
    source: item.source,
    tags: item.tags,
    payload: item.payload,
    createdAt: item.created_at
  };
}

export function getStoredCandidateProfile() {
  return readJsonFile(candidateProfilePath, candidateProfileFixture);
}

export function getStoredCandidateDocuments() {
  return readJsonFile(candidateDocumentsPath, candidateDocumentsFixture);
}

export function appendStoredCandidateDocument(document: CandidateDocument) {
  const documents = getStoredCandidateDocuments();
  documents.unshift(document);
  writeJsonFile(candidateDocumentsPath, documents);
  return document;
}

export function getPipelineOutput() {
  return readJsonFile<PythonPipelineOutput>(pipelineOutputPath, {
    generated_at: null,
    feed_date: "2026-04-22",
    profile: null,
    documents: [],
    stats: {
      raw_jobs: 0,
      normalized_jobs: 0,
      filtered_jobs: 0,
      scored_jobs: 0
    },
    source_runs: [],
    jobs: [],
    feed_items: []
  });
}

export function getDailyFeedFromStore(date: string) {
  const output = getPipelineOutput();
  const items = output.feed_items.length > 0 ? output.feed_items.map(mapFeedItem) : dailyFeedFixture;

  return items
    .filter((item) => item.feedDate === date)
    .sort((left, right) => left.rank - right.rank);
}

export function getTopJobMatchesFromStore() {
  const output = getPipelineOutput();

  if (output.jobs.length === 0) {
    return jobMatchesFixture.map((match) => {
      const job = jobsNormalizedFixture.find((item) => item.id === match.jobId);
      return job ? { job, match } : null;
    }).filter((item): item is { job: NormalizedJob; match: JobMatch } => Boolean(item));
  }

  return output.jobs.map((job) => ({
    job: mapNormalizedJob(job.job, output.generated_at ?? new Date().toISOString()),
    match: mapJobMatch(job)
  }));
}

export function getJobDetailFromStore(jobId: string) {
  const output = getPipelineOutput();

  if (output.jobs.length === 0) {
    const job = jobsNormalizedFixture.find((item) => item.id === jobId);
    const match = jobMatchesFixture.find((item) => item.jobId === jobId);

    if (!job || !match) {
      return null;
    }

    return {
      job,
      match,
      gaps: skillGapsFixture.filter((item) => item.jobMatchId === match.id)
    };
  }

  const scoredJob = output.jobs.find((item) => item.job.id === jobId);

  if (!scoredJob) {
    return null;
  }

  return {
    job: mapNormalizedJob(scoredJob.job, output.generated_at ?? new Date().toISOString()),
    match: mapJobMatch(scoredJob),
    gaps: scoredJob.gaps.map(mapSkillGap)
  };
}

export function getRuntimeStats() {
  return getPipelineOutput().stats;
}

export function getPipelineGeneratedAt() {
  return getPipelineOutput().generated_at;
}

export function getPipelineSourceRuns() {
  return getPipelineOutput().source_runs;
}
