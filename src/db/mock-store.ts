import {
  candidateDocumentsFixture,
  candidateProfileFixture,
  dailyFeedFixture,
  jobMatchesFixture,
  jobsNormalizedFixture,
  rawJobsFixture,
  skillCatalogFixture,
  skillGapsFixture
} from "@/src/services/fixtures/mock-data";
import type {
  CandidateDocument,
  CandidateProfile,
  DailyFeedItem,
  JobMatch,
  NormalizedJob,
  RawJobRecord,
  SkillCatalogEntry,
  SkillGap
} from "@/src/domain/types";

const rawJobs: RawJobRecord[] = [...rawJobsFixture];
const jobsNormalized: NormalizedJob[] = [...jobsNormalizedFixture];
const candidateDocuments: CandidateDocument[] = [...candidateDocumentsFixture];
const candidateProfile: CandidateProfile = { ...candidateProfileFixture };
const skillCatalog: SkillCatalogEntry[] = [...skillCatalogFixture];
const jobMatches: JobMatch[] = [...jobMatchesFixture];
const skillGaps: SkillGap[] = [...skillGapsFixture];
let dailyFeedItems: DailyFeedItem[] = [...dailyFeedFixture];

export function listRawJobs() {
  return rawJobs;
}

export function listJobsNormalized() {
  return jobsNormalized;
}

export function listJobMatches() {
  return jobMatches;
}

export function listSkillGaps() {
  return skillGaps;
}

export function listFeedItems() {
  return dailyFeedItems;
}

export function replaceFeedItems(nextItems: DailyFeedItem[]) {
  dailyFeedItems = [...nextItems];
}

export function getCandidateProfileRecord() {
  return candidateProfile;
}

export function listCandidateDocuments() {
  return candidateDocuments;
}

export function insertCandidateDocument(document: CandidateDocument) {
  candidateDocuments.unshift(document);
  return document;
}

export function listSkillCatalog() {
  return skillCatalog;
}
