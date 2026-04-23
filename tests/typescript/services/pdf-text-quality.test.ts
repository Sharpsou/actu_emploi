import { describe, expect, it } from "vitest";
import { evaluateDocumentTextQuality } from "@/src/services/profile/evaluate-document-text-quality";
import { selectBestPdfExtractionCandidate } from "@/src/services/profile/extract-pdf-text";

describe("evaluateDocumentTextQuality", () => {
  it("treats modern pdf extraction methods as pdf content", () => {
    const content =
      "Data scientist avec experience Python, SQL, machine learning, visualisation, pipelines de donnees et experimentation produit a Nantes.";

    expect(
      evaluateDocumentTextQuality({
        content,
        extractionMethod: "pdf_js_text"
      }).ok
    ).toBe(true);
  });
});

describe("selectBestPdfExtractionCandidate", () => {
  it("prefers the most readable candidate over a corrupted one", () => {
    const selected = selectBestPdfExtractionCandidate([
      {
        extractionMethod: "pdf_text_stream",
        content:
          "*2 ?DQ?CP Ã‚Â§Ã‚Â³Ãƒâ€|Ã‚â€žÃ‚\u009ddk HM [as:>JU[l Ã‚Â®Ã‚ÂºÃƒ\x9d NScx qxÃ‚â‚¬Ã‚â„¢"
      },
      {
        extractionMethod: "pdf_js_text",
        content:
          "Data Scientist avec experience Python, SQL, machine learning, experimentation et dashboards a Nantes."
      }
    ]);

    expect(selected).toMatchObject({
      extractionMethod: "pdf_js_text"
    });
    expect(selected?.content).toContain("Data Scientist");
  });
});
