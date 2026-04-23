import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { inflateSync } from "node:zlib";
import { evaluateDocumentTextQuality } from "@/src/services/profile/evaluate-document-text-quality";
import { getPythonCandidates } from "@/src/services/runtime/python-executable";

export type PdfTextExtractionResult = {
  content: string;
  extractionMethod: string;
};

function decodeUtf16Be(buffer: Buffer) {
  if (buffer.length < 2) {
    return "";
  }

  const evenLength = buffer.length - (buffer.length % 2);
  const swapped = Buffer.alloc(evenLength);

  for (let index = 0; index < evenLength; index += 2) {
    swapped[index] = buffer[index + 1];
    swapped[index + 1] = buffer[index];
  }

  return swapped.toString("utf16le");
}

function decodePdfLiteralString(literal: string) {
  let output = "";

  for (let index = 1; index < literal.length - 1; index += 1) {
    const current = literal[index];

    if (current !== "\\") {
      output += current;
      continue;
    }

    const next = literal[index + 1];
    if (!next) {
      break;
    }

    index += 1;

    if (/[0-7]/.test(next)) {
      let octal = next;

      for (let offset = 0; offset < 2; offset += 1) {
        const candidate = literal[index + 1];
        if (!candidate || !/[0-7]/.test(candidate)) {
          break;
        }

        octal += candidate;
        index += 1;
      }

      output += String.fromCharCode(Number.parseInt(octal, 8));
      continue;
    }

    switch (next) {
      case "n":
        output += "\n";
        break;
      case "r":
        output += "\r";
        break;
      case "t":
        output += "\t";
        break;
      case "b":
        output += "\b";
        break;
      case "f":
        output += "\f";
        break;
      case "(":
      case ")":
      case "\\":
        output += next;
        break;
      case "\n":
        break;
      case "\r":
        if (literal[index + 1] === "\n") {
          index += 1;
        }
        break;
      default:
        output += next;
        break;
    }
  }

  return output;
}

function decodePdfHexString(token: string) {
  const clean = token.slice(1, -1).replace(/\s+/g, "");

  if (clean.length === 0) {
    return "";
  }

  const normalized = clean.length % 2 === 0 ? clean : `${clean}0`;
  const buffer = Buffer.from(normalized, "hex");

  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return decodeUtf16Be(buffer.subarray(2));
  }

  const zeroHighBytes = buffer.length > 2 && buffer.every((value, index) => (index % 2 === 0 ? value === 0 : true));
  if (zeroHighBytes) {
    return decodeUtf16Be(buffer);
  }

  return buffer.toString("latin1");
}

function decodePdfTextToken(token: string) {
  if (token.startsWith("(") && token.endsWith(")")) {
    return decodePdfLiteralString(token);
  }

  if (token.startsWith("<") && token.endsWith(">")) {
    return decodePdfHexString(token);
  }

  return "";
}

function normalizePdfText(value: string) {
  return value
    .replace(/\u0000/g, " ")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => /[\p{L}]{2,}/u.test(line))
    .join("\n");
}

function readTextOperators(content: string) {
  const collected: string[] = [];
  const sections = [...content.matchAll(/BT([\s\S]*?)ET/g)].map((match) => match[1]);
  const blocks = sections.length > 0 ? sections : [content];

  for (const block of blocks) {
    for (const arrayMatch of block.matchAll(/\[(.*?)\]\s*TJ/gs)) {
      for (const tokenMatch of arrayMatch[1].matchAll(/(\((?:\\.|[^\\()])*\)|<[0-9A-Fa-f\s]+>)/g)) {
        const value = decodePdfTextToken(tokenMatch[1]).trim();
        if (value) {
          collected.push(value);
        }
      }
    }

    for (const tokenMatch of block.matchAll(/(\((?:\\.|[^\\()])*\)|<[0-9A-Fa-f\s]+>)\s*(?:Tj|'|")/g)) {
      const value = decodePdfTextToken(tokenMatch[1]).trim();
      if (value) {
        collected.push(value);
      }
    }
  }

  return collected;
}

function extractStreamText(binary: string) {
  const values: string[] = [];

  for (const match of binary.matchAll(/<<(.*?)>>\s*stream\r?\n([\s\S]*?)endstream/gs)) {
    const dictionary = match[1];
    const rawStream = Buffer.from(match[2], "latin1");
    const candidates: Buffer[] = [];

    if (dictionary.includes("/FlateDecode")) {
      try {
        candidates.push(inflateSync(rawStream));
      } catch {
        candidates.push(rawStream);
      }
    } else {
      candidates.push(rawStream);
    }

    for (const candidate of candidates) {
      const decoded = candidate.toString("latin1");
      values.push(...readTextOperators(decoded));
    }
  }

  return values;
}

function extractTextFromPdfBufferHeuristic(buffer: Buffer) {
  const binary = buffer.toString("latin1");
  const values = [...extractStreamText(binary), ...readTextOperators(binary)];
  const uniqueValues = Array.from(new Set(values.map((value) => normalizePdfText(value)).filter(Boolean)));
  return normalizePdfText(uniqueValues.join("\n"));
}

async function tryExtractTextFromPdfWithPdfJs(buffer: Buffer): Promise<PdfTextExtractionResult | null> {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const pdfJsRoot = path.join(process.cwd(), "node_modules", "pdfjs-dist");
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      disableFontFace: true,
      stopAtErrors: false,
      cMapUrl: `${pathToFileURL(path.join(pdfJsRoot, "cmaps")).href}/`,
      cMapPacked: true,
      standardFontDataUrl: `${pathToFileURL(path.join(pdfJsRoot, "standard_fonts")).href}/`
    });
    const document = await loadingTask.promise;
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const lines: string[] = [];
      let currentLine: string[] = [];
      let lastY: number | null = null;

      for (const item of textContent.items) {
        if (!("str" in item) || typeof item.str !== "string") {
          continue;
        }

        const fragment = item.str.trim();
        if (!fragment) {
          continue;
        }

        const y = Array.isArray(item.transform) && typeof item.transform[5] === "number" ? item.transform[5] : null;
        const shouldBreak = y !== null && lastY !== null && Math.abs(y - lastY) > 3;

        if (shouldBreak && currentLine.length > 0) {
          lines.push(currentLine.join(" "));
          currentLine = [];
        }

        currentLine.push(fragment);
        lastY = y;

        if (item.hasEOL) {
          lines.push(currentLine.join(" "));
          currentLine = [];
          lastY = null;
        }
      }

      if (currentLine.length > 0) {
        lines.push(currentLine.join(" "));
      }

      const pageText = normalizePdfText(lines.join("\n"));
      if (pageText) {
        pages.push(pageText);
      }

      page.cleanup();
    }

    await loadingTask.destroy();
    const content = normalizePdfText(pages.join("\n\n"));
    if (!content) {
      return null;
    }

    return {
      content,
      extractionMethod: "pdf_js_text"
    };
  } catch {
    return null;
  }
}

function tryExtractTextFromPdfWithPython(buffer: Buffer): PdfTextExtractionResult | null {
  const projectRoot = process.cwd();
  const tmpDir = path.join(projectRoot, "data", "runtime", "tmp");
  const scriptPath = path.join(projectRoot, "scripts", "python", "extract_pdf_text.py");

  if (!fs.existsSync(scriptPath)) {
    return null;
  }

  fs.mkdirSync(tmpDir, { recursive: true });
  const tempFilePath = path.join(tmpDir, `upload-${Date.now()}-${process.pid}.pdf`);

  try {
    fs.writeFileSync(tempFilePath, buffer);

    for (const executable of getPythonCandidates()) {
      const result = spawnSync(executable, [scriptPath, tempFilePath], {
        cwd: projectRoot,
        env: {
          ...process.env,
          PYTHONIOENCODING: "utf-8"
        },
        encoding: "utf8"
      });

      if (result.error || result.status !== 0) {
        continue;
      }

      const parsed = JSON.parse(result.stdout) as { content?: string; extraction_method?: string };
      if (typeof parsed.content === "string" && parsed.content.trim().length > 0) {
        return {
          content: normalizePdfText(parsed.content),
          extractionMethod:
            typeof parsed.extraction_method === "string" && parsed.extraction_method.trim().length > 0
              ? parsed.extraction_method
              : "pypdf"
        };
      }
    }
  } catch {
    return null;
  } finally {
    try {
      fs.unlinkSync(tempFilePath);
    } catch {
      // Ignore temp cleanup errors.
    }
  }

  return null;
}

export function selectBestPdfExtractionCandidate(candidates: PdfTextExtractionResult[]) {
  let selected: { candidate: PdfTextExtractionResult; score: number } | null = null;
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const content = candidate.content.trim();
    if (!content) {
      continue;
    }

    const dedupeKey = `${candidate.extractionMethod}:${content}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);

    const quality = evaluateDocumentTextQuality({
      content,
      extractionMethod: candidate.extractionMethod
    });
    const score =
      (quality.ok ? 1_000_000 : 0) +
      quality.metrics.naturalWordCount * 1000 +
      quality.metrics.contentLength -
      Math.round(quality.metrics.suspiciousRatio * 10_000);

    if (!selected || score > selected.score) {
      selected = {
        candidate: {
          content,
          extractionMethod: candidate.extractionMethod
        },
        score
      };
    }
  }

  return selected?.candidate ?? null;
}

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<PdfTextExtractionResult> {
  const pdfJsExtracted = await tryExtractTextFromPdfWithPdfJs(buffer);
  const pythonExtracted = tryExtractTextFromPdfWithPython(buffer);
  const heuristicExtracted: PdfTextExtractionResult = {
    content: extractTextFromPdfBufferHeuristic(buffer),
    extractionMethod: "pdf_text_stream"
  };

  const selected = selectBestPdfExtractionCandidate(
    [pdfJsExtracted, pythonExtracted, heuristicExtracted].filter((candidate): candidate is PdfTextExtractionResult =>
      Boolean(candidate)
    )
  );

  return selected ?? heuristicExtracted;
}
