import { afterEach, describe, expect, it, vi } from "vitest";

const analyzeCandidateDocument = vi.fn();
const appendStoredCandidateDocument = vi.fn();

vi.mock("@/src/services/profile/analyze-candidate-document", () => ({
  analyzeCandidateDocument
}));

vi.mock("@/src/services/runtime/local-store", () => ({
  appendStoredCandidateDocument
}));

describe("addCandidateDocument", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    analyzeCandidateDocument.mockReset();
    appendStoredCandidateDocument.mockReset();
  });

  it("rejects an invalid payload", async () => {
    const { addCandidateDocument } = await import("@/src/services/profile/add-candidate-document");

    expect(addCandidateDocument({ document_type: "cv" })).toEqual({
      ok: false,
      error: "Payload invalide pour le document candidat."
    });
  });

  it("analyzes and persists a valid payload", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-23T10:15:00.000Z"));

    analyzeCandidateDocument.mockReturnValue({
      extraction_status: "done",
      analysis_mode: "agentic_baseline",
      summary: "resume",
      detected_skills: ["SQL"]
    });
    appendStoredCandidateDocument.mockImplementation((document) => document);

    const { addCandidateDocument } = await import("@/src/services/profile/add-candidate-document");
    const result = addCandidateDocument({
      document_type: "cv",
      source_filename: "cv.txt",
      content_text: "SQL et Python",
      import_mode: "text",
      extraction_method: "manual_text"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected valid result");
    }

    expect(analyzeCandidateDocument).toHaveBeenCalledWith("SQL et Python", {
      documentType: "cv",
      sourceFilename: "cv.txt",
      extractionMethod: "manual_text"
    });
    expect(appendStoredCandidateDocument).toHaveBeenCalledTimes(1);
    expect(result.value).toMatchObject({
      id: "doc-1776939300000",
      documentType: "cv",
      sourceFilename: "cv.txt",
      createdAt: "2026-04-23T10:15:00.000Z"
    });
    expect(result.value.parsedJson).toMatchObject({
      extraction_status: "done",
      analysis_mode: "agentic_baseline",
      import_mode: "text",
      extraction_method: "manual_text",
      content_length: 13
    });
  });
});
