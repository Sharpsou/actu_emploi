import { afterEach, describe, expect, it, vi } from "vitest";

const clearStoredCandidateDocuments = vi.fn();
const clearStoredAgentRuns = vi.fn();
const clearProfileDerivedPipelineOutput = vi.fn();

vi.mock("@/src/services/runtime/local-store", () => ({
  clearStoredCandidateDocuments,
  clearStoredAgentRuns,
  clearProfileDerivedPipelineOutput
}));

describe("purgeCandidateDocumentData", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearStoredCandidateDocuments.mockReset();
    clearStoredAgentRuns.mockReset();
    clearProfileDerivedPipelineOutput.mockReset();
  });

  it("clears documents, agent runs and profile-derived pipeline output", async () => {
    clearStoredCandidateDocuments.mockReturnValue(2);
    clearStoredAgentRuns.mockReturnValue(3);
    clearProfileDerivedPipelineOutput.mockReturnValue({
      previousJobsCount: 5,
      previousFeedItemsCount: 7
    });

    const { purgeCandidateDocumentData } = await import("@/src/services/profile/purge-candidate-document-data");
    const result = purgeCandidateDocumentData();

    expect(result).toEqual({
      deletedDocuments: 2,
      deletedAgentRuns: 3,
      invalidatedJobs: 5,
      invalidatedFeedItems: 7
    });
  });
});
