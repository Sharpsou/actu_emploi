import { analyzeCandidateDocument } from "@/src/services/profile/analyze-candidate-document";
import { evaluateDocumentTextQuality } from "@/src/services/profile/evaluate-document-text-quality";
import { getStoredCandidateDocuments, saveStoredCandidateDocuments } from "@/src/services/runtime/local-store";

const CURRENT_ANALYSIS_VERSION = "agentic_pipeline_v2";

export function getCandidateDocuments() {
  let changed = false;
  const documents = getStoredCandidateDocuments().map((document) => {
    const extractionMethod =
      typeof document.parsedJson.extraction_method === "string" ? document.parsedJson.extraction_method : undefined;
    const quality = evaluateDocumentTextQuality({
      content: document.contentText,
      extractionMethod
    });

    if (!quality.ok) {
      changed = true;
      return {
        ...document,
        parsedJson: {
          ...document.parsedJson,
          extraction_status: "invalid",
          extraction_warning: quality.reason,
          detected_skills: [],
          detected_roles: [],
          detected_locations: [],
          summary: "Extraction PDF invalide: document ignore pour eviter une analyse trompeuse."
        }
      };
    }

    const isAgenticAnalysis =
      document.parsedJson.extraction_status === "done" &&
      document.parsedJson.analysis_mode === "agentic_baseline" &&
      document.parsedJson.analysis_version === CURRENT_ANALYSIS_VERSION;

    const nextDocument = {
      ...document,
      parsedJson:
        isAgenticAnalysis
          ? document.parsedJson
          : {
              ...document.parsedJson,
              ...analyzeCandidateDocument(document.contentText, {
                documentType: document.documentType,
                sourceFilename: document.sourceFilename,
                extractionMethod
              })
            }
    };

    if (nextDocument.parsedJson !== document.parsedJson) {
      changed = true;
    }

    return nextDocument;
  });

  if (changed) {
    saveStoredCandidateDocuments(documents);
  }

  return documents;
}
