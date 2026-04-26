import {
  clearProfileDerivedPipelineOutput,
  clearStoredAgentRuns,
  clearStoredCandidateDocuments
} from "@/src/services/runtime/local-store";

export type PurgeCandidateDocumentDataResult = {
  deletedDocuments: number;
  deletedAgentRuns: number;
  invalidatedJobs: number;
  invalidatedFeedItems: number;
};

export function purgeCandidateDocumentData(): PurgeCandidateDocumentDataResult {
  const deletedDocuments = clearStoredCandidateDocuments();
  const deletedAgentRuns = clearStoredAgentRuns();
  const invalidated = clearProfileDerivedPipelineOutput();

  return {
    deletedDocuments,
    deletedAgentRuns,
    invalidatedJobs: invalidated.previousJobsCount,
    invalidatedFeedItems: invalidated.previousFeedItemsCount
  };
}
