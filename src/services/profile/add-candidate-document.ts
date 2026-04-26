import { z } from "zod";
import type { CandidateDocument } from "@/src/domain/types";
import { analyzeCandidateDocument } from "@/src/services/profile/analyze-candidate-document";
import { appendStoredCandidateDocument } from "@/src/services/runtime/local-store";

const candidateDocumentSchema = z.object({
  document_type: z.enum(["cv", "lettre"]),
  source_filename: z.string().min(1),
  content_text: z.string().min(1),
  import_mode: z.enum(["text", "file"]).optional(),
  source_mime_type: z.string().min(1).optional(),
  extraction_method: z.string().min(1).optional()
});

type AddCandidateDocumentResult =
  | { ok: true; value: CandidateDocument }
  | { ok: false; error: string };

export function addCandidateDocument(input: unknown): AddCandidateDocumentResult {
  const parsed = candidateDocumentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Payload invalide pour le document candidat."
    };
  }

  const now = new Date().toISOString();
  const document: CandidateDocument = {
    id: `doc-${Date.now()}`,
    documentType: parsed.data.document_type,
    sourceFilename: parsed.data.source_filename,
    contentText: parsed.data.content_text,
    parsedJson: {
      ...analyzeCandidateDocument(parsed.data.content_text, {
        documentType: parsed.data.document_type,
        sourceFilename: parsed.data.source_filename,
        extractionMethod: parsed.data.extraction_method ?? "manual_text"
      }),
      import_mode: parsed.data.import_mode ?? "text",
      source_mime_type: parsed.data.source_mime_type,
      extraction_method: parsed.data.extraction_method ?? "manual_text",
      content_length: parsed.data.content_text.length
    },
    createdAt: now
  };

  return {
    ok: true,
    value: appendStoredCandidateDocument(document)
  };
}
