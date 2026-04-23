import path from "node:path";
import { z } from "zod";
import { extractTextFromPdfBuffer } from "@/src/services/profile/extract-pdf-text";
import { evaluateDocumentTextQuality } from "@/src/services/profile/evaluate-document-text-quality";

const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024;
const supportedTextExtensions = new Set([".txt", ".md", ".markdown"]);
const supportedPdfExtensions = new Set([".pdf"]);

const formMetaSchema = z.object({
  document_type: z.enum(["cv", "lettre"]),
  source_filename: z.string().optional(),
  content_text: z.string().optional()
});

export type CandidateDocumentInput = {
  document_type: "cv" | "lettre";
  source_filename: string;
  content_text: string;
  import_mode: "text" | "file";
  source_mime_type?: string;
  extraction_method: string;
};

type CandidateDocumentInputResult =
  | { ok: true; value: CandidateDocumentInput }
  | { ok: false; error: string };

function normalizeDocumentText(value: string) {
  return value
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildTextModeFilename(documentType: "cv" | "lettre", sourceFilename?: string) {
  const fallback = documentType === "cv" ? "cv-manuel.txt" : "lettre-motivation.txt";
  const normalized = sourceFilename?.trim();
  return normalized && normalized.length > 0 ? normalized : fallback;
}

async function readFileContent(file: File) {
  const extension = path.extname(file.name).toLowerCase();
  const mimeType = file.type || undefined;

  if (file.size === 0) {
    throw new Error("Le fichier selectionne est vide.");
  }

  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    throw new Error("Le fichier depasse la limite de 5 Mo du MVP.");
  }

  if (supportedTextExtensions.has(extension) || mimeType?.startsWith("text/")) {
    const content = normalizeDocumentText(await file.text());
    return {
      content,
      extractionMethod: extension === ".md" || extension === ".markdown" ? "markdown_file" : "text_file",
      mimeType
    };
  }

  if (supportedPdfExtensions.has(extension) || mimeType === "application/pdf") {
    const buffer = Buffer.from(await file.arrayBuffer());
    const extracted = await extractTextFromPdfBuffer(buffer);
    const content = normalizeDocumentText(extracted.content);
    const quality = evaluateDocumentTextQuality({
      content,
      extractionMethod: extracted.extractionMethod
    });

    if (!quality.ok) {
      throw new Error(
        "Le PDF a bien ete recu, mais son texte n'a pas pu etre extrait proprement. Essaie un PDF texte, une exportation differente, ou colle le contenu."
      );
    }

    return {
      content,
      extractionMethod: extracted.extractionMethod,
      mimeType: mimeType ?? "application/pdf"
    };
  }

  throw new Error("Format non supporte. Utilise un PDF, un TXT ou un fichier Markdown.");
}

export async function readCandidateDocumentFormData(formData: FormData): Promise<CandidateDocumentInputResult> {
  const rawDocumentType = formData.get("document_type");
  const rawSourceFilename = formData.get("source_filename");
  const rawContentText = formData.get("content_text");

  const parsed = formMetaSchema.safeParse({
    document_type: typeof rawDocumentType === "string" ? rawDocumentType : undefined,
    source_filename: typeof rawSourceFilename === "string" ? rawSourceFilename : undefined,
    content_text: typeof rawContentText === "string" ? rawContentText : undefined
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Le formulaire d'import est incomplet."
    };
  }

  const fileEntry = formData.get("document_file");
  if (fileEntry instanceof File && fileEntry.size > 0) {
    try {
      const extracted = await readFileContent(fileEntry);

      return {
        ok: true,
        value: {
          document_type: parsed.data.document_type,
          source_filename: fileEntry.name,
          content_text: extracted.content,
          import_mode: "file",
          source_mime_type: extracted.mimeType,
          extraction_method: extracted.extractionMethod
        }
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Impossible de lire le fichier charge."
      };
    }
  }

  const contentText = normalizeDocumentText(parsed.data.content_text ?? "");
  if (!contentText) {
    return {
      ok: false,
      error: "Ajoute un fichier ou colle le contenu du document."
    };
  }

  return {
    ok: true,
    value: {
      document_type: parsed.data.document_type,
      source_filename: buildTextModeFilename(parsed.data.document_type, parsed.data.source_filename),
      content_text: contentText,
      import_mode: "text",
      extraction_method: "manual_text"
    }
  };
}
