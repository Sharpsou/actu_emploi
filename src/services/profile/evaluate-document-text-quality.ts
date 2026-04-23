type DocumentTextQualityInput = {
  content: string;
  extractionMethod?: string;
};

export type DocumentTextQualityResult = {
  ok: boolean;
  reason?: string;
  metrics: {
    contentLength: number;
    suspiciousRatio: number;
    longWordCount: number;
    naturalWordCount: number;
  };
};

function countMatches(value: string, pattern: RegExp) {
  return (value.match(pattern) ?? []).length;
}

function isPdfExtractionMethod(extractionMethod?: string) {
  return typeof extractionMethod === "string" && extractionMethod.toLowerCase().includes("pdf");
}

export function evaluateDocumentTextQuality({
  content,
  extractionMethod
}: DocumentTextQualityInput): DocumentTextQualityResult {
  const contentLength = content.length;
  const suspiciousCount = countMatches(content, /[\u0000-\u001F\u007F-\u009FÂÃ�]/g);
  const suspiciousRatio = contentLength > 0 ? suspiciousCount / contentLength : 1;
  const normalized = content
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z\s]/g, " ");
  const longWords = normalized.match(/[A-Za-z]{4,}/g) ?? [];
  const naturalWords = longWords.filter((word) => /[aeiou]/i.test(word));

  if (contentLength < 80) {
    return {
      ok: false,
      reason: "Le texte extrait est trop court pour analyser le document.",
      metrics: {
        contentLength,
        suspiciousRatio,
        longWordCount: longWords.length,
        naturalWordCount: naturalWords.length
      }
    };
  }

  if (isPdfExtractionMethod(extractionMethod)) {
    if (suspiciousRatio > 0.08) {
      return {
        ok: false,
        reason: "Le texte extrait du PDF semble corrompu ou mal decode.",
        metrics: {
          contentLength,
          suspiciousRatio,
          longWordCount: longWords.length,
          naturalWordCount: naturalWords.length
        }
      };
    }

    if (naturalWords.length < 10) {
      return {
        ok: false,
        reason: "Le PDF ne contient pas assez de texte lisible pour une analyse fiable.",
        metrics: {
          contentLength,
          suspiciousRatio,
          longWordCount: longWords.length,
          naturalWordCount: naturalWords.length
        }
      };
    }
  }

  return {
    ok: true,
    metrics: {
      contentLength,
      suspiciousRatio,
      longWordCount: longWords.length,
      naturalWordCount: naturalWords.length
    }
  };
}
