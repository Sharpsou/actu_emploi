import { analyzeCandidateDocument } from "@/src/services/profile/analyze-candidate-document";
import { evaluateDocumentTextQuality } from "@/src/services/profile/evaluate-document-text-quality";
import { getStoredCandidateDocuments } from "@/src/services/runtime/local-store";

export function getCandidateDocuments() {
  return getStoredCandidateDocuments().map((document) => {
    const extractionMethod =
      typeof document.parsedJson.extraction_method === "string" ? document.parsedJson.extraction_method : undefined;
    const quality = evaluateDocumentTextQuality({
      content: document.contentText,
      extractionMethod
    });

    if (!quality.ok) {
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

    return {
      ...document,
      parsedJson:
        document.parsedJson.extraction_status === "done"
          ? document.parsedJson
          : {
              ...document.parsedJson,
              ...analyzeCandidateDocument(document.contentText)
            }
    };
  });
}
