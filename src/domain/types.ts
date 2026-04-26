export type JobSource = "France Travail" | "Jooble";
export type RemoteMode = "remote" | "hybrid" | "onsite";
export type GapType = "theorique" | "pratique" | "outil";
export type FeedItemKind = "offre" | "competence" | "notion" | "projet";
export type CandidateDocumentType = "cv" | "lettre";

export type ScoreExplanation = {
  strengths: string[];
  missingSkills: string[];
  penalties: string[];
  quickWins: string[];
  blockingPoints: string[];
};

export type RawJobRecord = {
  id: string;
  source: JobSource;
  sourceJobId: string;
  fetchedAt: string;
  payloadJson: Record<string, unknown>;
  checksum: string;
};

export type NormalizedJob = {
  id: string;
  rawJobId: string;
  sourceJobId: string;
  canonicalJobKey: string;
  source: JobSource;
  title: string;
  companyName: string;
  locationText: string;
  remoteMode: RemoteMode;
  contractType: string;
  seniorityText: string;
  descriptionText: string;
  skillsDetected: string[];
  publishedAt: string;
  normalizedAt: string;
  detailUrl?: string;
};

export type CandidateProfile = {
  id: string;
  targetRoles: string[];
  preferredSkills: string[];
  excludedKeywords: string[];
  preferredLocations: string[];
  preferRemoteFriendly?: boolean;
  notes: string;
  updatedAt: string;
};

export type CandidateDocument = {
  id: string;
  documentType: CandidateDocumentType;
  sourceFilename: string;
  contentText: string;
  parsedJson: Record<string, unknown>;
  createdAt: string;
};

export type SkillCatalogEntry = {
  id: string;
  skillName: string;
  skillCategory: "role" | "tech" | "tool" | "method";
  aliases: string[];
  isActive: boolean;
};

export type JobMatch = {
  id: string;
  jobId: string;
  candidateProfileId: string;
  scoreGlobal: number;
  scoreRole: number;
  scoreSkillsMatch: number;
  scoreStackFit: number;
  scoreSeniority: number;
  scorePenalties: number;
  scorePreference: number;
  explanation: ScoreExplanation;
  matchedSkills: string[];
  missingSkills: string[];
  computedAt: string;
};

export type SuggestedAction = {
  title: string;
  format: string;
  deliverable: string;
  description?: string;
  example?: string;
  freeAlternative?: string;
  publicDataIdea?: string;
};

export type SkillGap = {
  id: string;
  jobMatchId: string;
  skillName: string;
  gapType: GapType;
  importanceScore: number;
  rationaleText: string;
  suggestedAction: SuggestedAction;
};

export type SkillSignal = {
  skillName: string;
  source: string;
  evidenceText: string;
  confidenceScore: number;
};

export type AgenticEntityAnalysis = {
  entityKind: string;
  summary: string;
  skills: string[];
  skillSignals: SkillSignal[];
  agentTrace: string[];
};

export type SkillConfrontation = {
  skillName: string;
  status: "acquis" | "survol" | "formation" | "mini_projet";
  effortLevel: "aucun" | "leger" | "court" | "pratique";
  rationaleText: string;
  suggestedAction: SuggestedAction;
};

export type AgenticMatchAnalysis = {
  profileAnalysis: AgenticEntityAnalysis;
  jobAnalysis: AgenticEntityAnalysis;
  confrontations: SkillConfrontation[];
  miniProjectCandidates: SuggestedAction[];
};

export type PrecomputedAgenticAnalysis = {
  status: string;
  confidenceScore: number;
  humanReviewRequired: boolean;
  computedAt: string;
  analysis: AgenticMatchAnalysis;
};

export type AgentTask = {
  id: string;
  agentName: string;
  modelName: string;
  status: string;
  inputJson: Record<string, unknown>;
  outputJson: Record<string, unknown>;
  confidenceScore: number;
  latencyMs: number;
  errorText?: string | null;
};

export type McpCall = {
  id: string;
  runId: string;
  taskId?: string | null;
  serverName: string;
  toolName: string;
  inputJson: Record<string, unknown>;
  outputJson: Record<string, unknown>;
  permissionStatus: string;
  latencyMs: number;
  createdAt: string;
};

export type AgentRun = {
  id: string;
  jobId: string;
  userRequest: string;
  status: string;
  confidenceScore: number;
  humanReviewRequired: boolean;
  createdAt: string;
  completedAt?: string | null;
  result: Record<string, unknown>;
  tasks: AgentTask[];
  mcpCalls: McpCall[];
};

export type DailyFeedItem = {
  id: string;
  feedDate: string;
  kind: FeedItemKind;
  relatedJobId?: string;
  relatedJobMatchId?: string;
  title: string;
  summary: string;
  score: number;
  rank: number;
  source?: JobSource;
  tags: string[];
  payload: Record<string, unknown>;
  createdAt: string;
};

export type JobDetail = {
  job: NormalizedJob;
  match: JobMatch;
  gaps: SkillGap[];
  agenticAnalysis?: PrecomputedAgenticAnalysis;
};
