import { afterEach, describe, expect, it, vi } from "vitest";

const getStoredCandidateDocuments = vi.fn();
const saveStoredCandidateDocuments = vi.fn();

vi.mock("@/src/services/runtime/local-store", () => ({
  getStoredCandidateDocuments,
  saveStoredCandidateDocuments
}));

describe("updateCandidateDocumentSkill", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    getStoredCandidateDocuments.mockReset();
    saveStoredCandidateDocuments.mockReset();
  });

  it("adds and traces a manually corrected detected skill", async () => {
    getStoredCandidateDocuments.mockReturnValue([
      {
        id: "doc-1",
        documentType: "cv",
        sourceFilename: "cv.txt",
        contentText: "SQL",
        parsedJson: {
          detected_skills: ["SQL"],
          skill_signals: []
        },
        createdAt: "2026-04-26T08:00:00.000Z"
      }
    ]);
    saveStoredCandidateDocuments.mockImplementation((documents) => documents);

    const { updateCandidateDocumentSkill } = await import("@/src/services/profile/update-candidate-document-skill");
    const result = updateCandidateDocumentSkill({
      document_id: "doc-1",
      skill_name: "Communication",
      action: "add"
    });

    expect(result.ok).toBe(true);
    expect(saveStoredCandidateDocuments).toHaveBeenCalledWith([
      expect.objectContaining({
        parsedJson: expect.objectContaining({
          detected_skills: ["Communication", "SQL"],
          manual_skill_overrides: {
            added: ["Communication"],
            removed: []
          },
          skill_signals: [
            expect.objectContaining({
              skill_name: "Communication",
              source: "manual_correction",
              confidence_score: 100
            })
          ]
        })
      })
    ]);
  });

  it("removes a detected skill case-insensitively", async () => {
    getStoredCandidateDocuments.mockReturnValue([
      {
        id: "doc-1",
        documentType: "cv",
        sourceFilename: "cv.txt",
        contentText: "SQL",
        parsedJson: {
          detected_skills: ["Python", "SQL"],
          skill_signals: [{ skill_name: "SQL", source: "profile", evidence_text: "SQL", confidence_score: 82 }]
        },
        createdAt: "2026-04-26T08:00:00.000Z"
      }
    ]);
    saveStoredCandidateDocuments.mockImplementation((documents) => documents);

    const { updateCandidateDocumentSkill } = await import("@/src/services/profile/update-candidate-document-skill");
    const result = updateCandidateDocumentSkill({
      document_id: "doc-1",
      skill_name: "sql",
      action: "remove"
    });

    expect(result.ok).toBe(true);
    expect(saveStoredCandidateDocuments).toHaveBeenCalledWith([
      expect.objectContaining({
        parsedJson: expect.objectContaining({
          detected_skills: ["Python"],
          manual_skill_overrides: {
            added: [],
            removed: ["sql"]
          },
          skill_signals: []
        })
      })
    ]);
  });
});
