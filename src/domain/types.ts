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
};
