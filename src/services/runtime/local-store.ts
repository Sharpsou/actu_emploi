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
import { getJobDetailUrl } from "@/src/services/jobs/get-job-detail-url";
import type {
  AgentRun,
  AgenticEntityAnalysis,
  AgenticMatchAnalysis,
  CandidateDocument,
  CandidateProfile,
  DailyFeedItem,
  JobMatch,
  JobSource,
  NormalizedJob,
  PrecomputedAgenticAnalysis,
  SkillGap,
  SkillSignal,
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
    detail_url?: string | null;
  };
  gaps: PythonSkillGap[];
  agentic_analysis?: PythonPrecomputedAgenticAnalysis;
};

type PythonSkillSignal = {
  skill_name: string;
  source: string;
  evidence_text: string;
  confidence_score: number;
};

type PythonAgenticEntityAnalysis = {
  entity_kind: string;
  summary: string;
  skills: string[];
  skill_signals: PythonSkillSignal[];
  agent_trace: string[];
};

type PythonSkillConfrontation = {
  skill_name: string;
  status: "acquis" | "survol" | "formation" | "mini_projet";
  effort_level: "aucun" | "leger" | "court" | "pratique";
  rationale_text: string;
  suggested_action: PythonSuggestedAction;
};

type PythonAgenticMatchAnalysis = {
  profile_analysis: PythonAgenticEntityAnalysis;
  job_analysis: PythonAgenticEntityAnalysis;
  confrontations: PythonSkillConfrontation[];
  mini_project_candidates: PythonSuggestedAction[];
};

type PythonPrecomputedAgenticAnalysis = {
  status: string;
  confidence_score: number;
  human_review_required: boolean;
  computed_at: string;
  analysis: PythonAgenticMatchAnalysis;
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

type PythonAgentRun = {
  id: string;
  job_id: string;
  user_request: string;
  status: string;
  confidence_score: number;
  human_review_required: boolean;
  created_at: string;
  completed_at?: string | null;
  result: Record<string, unknown>;
  tasks: Array<{
    id: string;
    agent_name: string;
    model_name: string;
    status: string;
    input_json: Record<string, unknown>;
    output_json: Record<string, unknown>;
    confidence_score: number;
    latency_ms: number;
    error_text?: string | null;
  }>;
  mcp_calls: Array<{
    id: string;
    run_id: string;
    task_id?: string | null;
    server_name: string;
    tool_name: string;
    input_json: Record<string, unknown>;
    output_json: Record<string, unknown>;
    permission_status: string;
    latency_ms: number;
    created_at: string;
  }>;
};

const runtimeDirPath = path.join(process.cwd(), "data", "runtime");
const candidateProfilePath = path.join(runtimeDirPath, "candidate-profile.json");
const candidateDocumentsPath = path.join(runtimeDirPath, "candidate-documents.json");
const pipelineOutputPath = path.join(runtimeDirPath, "pipeline-output.json");
const agentRunsDirPath = path.join(runtimeDirPath, "agent-runs");

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
    sourceJobId: job.source_job_id,
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
    normalizedAt,
    detailUrl: getJobDetailUrl({
      source: job.source,
      sourceJobId: job.source_job_id,
      detailUrl: job.detail_url
    })
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

function mapSkillSignal(signal: PythonSkillSignal): SkillSignal {
  return {
    skillName: signal.skill_name,
    source: signal.source,
    evidenceText: signal.evidence_text,
    confidenceScore: signal.confidence_score
  };
}

function mapAgenticEntityAnalysis(analysis: PythonAgenticEntityAnalysis): AgenticEntityAnalysis {
  return {
    entityKind: analysis.entity_kind,
    summary: analysis.summary,
    skills: analysis.skills,
    skillSignals: analysis.skill_signals.map(mapSkillSignal),
    agentTrace: analysis.agent_trace
  };
}

function mapAgenticMatchAnalysis(analysis: PythonAgenticMatchAnalysis): AgenticMatchAnalysis {
  return {
    profileAnalysis: mapAgenticEntityAnalysis(analysis.profile_analysis),
    jobAnalysis: mapAgenticEntityAnalysis(analysis.job_analysis),
    confrontations: analysis.confrontations.map((item) => ({
      skillName: item.skill_name,
      status: item.status,
      effortLevel: item.effort_level,
      rationaleText: item.rationale_text,
      suggestedAction: mapSuggestedAction(item.suggested_action)
    })),
    miniProjectCandidates: analysis.mini_project_candidates.map(mapSuggestedAction)
  };
}

function mapPrecomputedAgenticAnalysis(analysis: PythonPrecomputedAgenticAnalysis): PrecomputedAgenticAnalysis {
  return {
    status: analysis.status,
    confidenceScore: analysis.confidence_score,
    humanReviewRequired: analysis.human_review_required,
    computedAt: analysis.computed_at,
    analysis: mapAgenticMatchAnalysis(analysis.analysis)
  };
}

function mapAgentRun(run: PythonAgentRun): AgentRun {
  return {
    id: run.id,
    jobId: run.job_id,
    userRequest: run.user_request,
    status: run.status,
    confidenceScore: run.confidence_score,
    humanReviewRequired: run.human_review_required,
    createdAt: run.created_at,
    completedAt: run.completed_at,
    result: run.result,
    tasks: run.tasks.map((task) => ({
      id: task.id,
      agentName: task.agent_name,
      modelName: task.model_name,
      status: task.status,
      inputJson: task.input_json,
      outputJson: task.output_json,
      confidenceScore: task.confidence_score,
      latencyMs: task.latency_ms,
      errorText: task.error_text
    })),
    mcpCalls: run.mcp_calls.map((call) => ({
      id: call.id,
      runId: call.run_id,
      taskId: call.task_id,
      serverName: call.server_name,
      toolName: call.tool_name,
      inputJson: call.input_json,
      outputJson: call.output_json,
      permissionStatus: call.permission_status,
      latencyMs: call.latency_ms,
      createdAt: call.created_at
    }))
  };
}

export function getStoredCandidateProfile() {
  return readJsonFile(candidateProfilePath, candidateProfileFixture);
}

export function saveStoredCandidateProfile(profile: CandidateProfile) {
  writeJsonFile(candidateProfilePath, profile);
  return profile;
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

export function saveStoredCandidateDocuments(documents: CandidateDocument[]) {
  writeJsonFile(candidateDocumentsPath, documents);
  return documents;
}

export function clearStoredCandidateDocuments() {
  const previousCount = getStoredCandidateDocuments().length;
  writeJsonFile(candidateDocumentsPath, []);
  return previousCount;
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
  const items =
    output.feed_items.length > 0 || output.generated_at
      ? output.feed_items.map(mapFeedItem)
      : dailyFeedFixture;

  return items
    .filter((item) => item.feedDate === date)
    .sort((left, right) => left.rank - right.rank);
}

export function getTopJobMatchesFromStore() {
  const output = getPipelineOutput();

  if (output.jobs.length === 0 && !output.generated_at) {
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

  if (output.jobs.length === 0 && !output.generated_at) {
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
    gaps: scoredJob.gaps.map(mapSkillGap),
    agenticAnalysis: scoredJob.agentic_analysis
      ? mapPrecomputedAgenticAnalysis(scoredJob.agentic_analysis)
      : undefined
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

export function getAgentRunsFromStore() {
  ensureRuntimeDir();

  if (!fs.existsSync(agentRunsDirPath)) {
    return [];
  }

  return fs.readdirSync(agentRunsDirPath)
    .filter((filename) => filename.endsWith(".json"))
    .map((filename) => {
      const filePath = path.join(agentRunsDirPath, filename);
      return JSON.parse(fs.readFileSync(filePath, "utf8")) as PythonAgentRun;
    })
    .map(mapAgentRun)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function getAgentRunFromStore(runId: string) {
  const filePath = path.join(agentRunsDirPath, `${runId}.json`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  return mapAgentRun(JSON.parse(fs.readFileSync(filePath, "utf8")) as PythonAgentRun);
}

export function clearStoredAgentRuns() {
  ensureRuntimeDir();

  if (!fs.existsSync(agentRunsDirPath)) {
    return 0;
  }

  const filenames = fs.readdirSync(agentRunsDirPath).filter((filename) => filename.endsWith(".json"));
  for (const filename of filenames) {
    fs.unlinkSync(path.join(agentRunsDirPath, filename));
  }

  return filenames.length;
}

export function clearProfileDerivedPipelineOutput() {
  const output = getPipelineOutput();
  const previousJobsCount = output.jobs.length;
  const previousFeedItemsCount = output.feed_items.length;
  const now = new Date().toISOString();

  writeJsonFile<PythonPipelineOutput>(pipelineOutputPath, {
    ...output,
    generated_at: now,
    profile: null,
    documents: [],
    stats: {
      ...output.stats,
      filtered_jobs: 0,
      scored_jobs: 0
    },
    jobs: [],
    feed_items: []
  });

  return {
    previousJobsCount,
    previousFeedItemsCount
  };
}
