import { beforeEach, describe, expect, it, vi } from "vitest";

const addCandidateDocument = vi.fn();
const purgeCandidateDocumentData = vi.fn();
const refreshAgenticMatchesForExistingJobs = vi.fn();
const readCandidateDocumentFormData = vi.fn();

vi.mock("@/src/services/profile/add-candidate-document", () => ({
  addCandidateDocument
}));

vi.mock("@/src/services/profile/purge-candidate-document-data", () => ({
  purgeCandidateDocumentData
}));

vi.mock("@/src/services/agents/refresh-agentic-matches", () => ({
  refreshAgenticMatchesForExistingJobs
}));

vi.mock("@/src/services/profile/read-candidate-document-input", () => ({
  readCandidateDocumentFormData
}));

describe("POST /api/profile/documents", () => {
  beforeEach(() => {
    addCandidateDocument.mockReset();
    purgeCandidateDocumentData.mockReset();
    refreshAgenticMatchesForExistingJobs.mockReset();
    readCandidateDocumentFormData.mockReset();
  });

  it("returns 201 for a valid JSON payload", async () => {
    addCandidateDocument.mockReturnValue({
      ok: true,
      value: { id: "doc-1", documentType: "cv" }
    });
    refreshAgenticMatchesForExistingJobs.mockReturnValue({
      ok: true,
      jobsRefreshed: 2,
      refreshedAt: "2026-04-26T09:00:00.000Z"
    });

    const { POST } = await import("@/app/api/profile/documents/route");
    const request = new Request("http://localhost:3000/api/profile/documents", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        document_type: "cv",
        source_filename: "cv.txt",
        content_text: "SQL"
      })
    });

    const response = await POST(request as never);

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      id: "doc-1",
      documentType: "cv",
      agenticRefresh: {
        ok: true,
        jobsRefreshed: 2,
        refreshedAt: "2026-04-26T09:00:00.000Z"
      }
    });
  });

  it("returns 400 when multipart parsing fails", async () => {
    readCandidateDocumentFormData.mockResolvedValue({
      ok: false,
      error: "Le formulaire d'import est incomplet."
    });

    const { POST } = await import("@/app/api/profile/documents/route");
    const formData = new FormData();
    const request = new Request("http://localhost:3000/api/profile/documents", {
      method: "POST",
      body: formData
    });

    const response = await POST(request as never);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Le formulaire d'import est incomplet."
    });
  });

  it("purges candidate document data", async () => {
    purgeCandidateDocumentData.mockReturnValue({
      deletedDocuments: 1,
      deletedAgentRuns: 2,
      invalidatedJobs: 3,
      invalidatedFeedItems: 4
    });

    const { DELETE } = await import("@/app/api/profile/documents/route");
    const response = DELETE();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      deletedDocuments: 1,
      deletedAgentRuns: 2,
      invalidatedJobs: 3,
      invalidatedFeedItems: 4
    });
  });
});
