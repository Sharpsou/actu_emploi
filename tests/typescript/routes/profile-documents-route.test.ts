import { describe, expect, it, vi } from "vitest";

const addCandidateDocument = vi.fn();
const readCandidateDocumentFormData = vi.fn();

vi.mock("@/src/services/profile/add-candidate-document", () => ({
  addCandidateDocument
}));

vi.mock("@/src/services/profile/read-candidate-document-input", () => ({
  readCandidateDocumentFormData
}));

describe("POST /api/profile/documents", () => {
  it("returns 201 for a valid JSON payload", async () => {
    addCandidateDocument.mockReturnValue({
      ok: true,
      value: { id: "doc-1", documentType: "cv" }
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
    await expect(response.json()).resolves.toEqual({ id: "doc-1", documentType: "cv" });
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
});
