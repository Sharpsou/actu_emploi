from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path

from pypdf import PdfReader


def normalize_text(value: str) -> str:
    return value.replace("\x00", "").replace("\r\n", "\n").replace("\r", "\n").strip()


def evaluate_candidate_quality(content: str) -> tuple[bool, int]:
    content_length = len(content)
    suspicious_count = len(re.findall(r"[\x00-\x1F\x7F-\x9FÃ‚Ãƒï¿½]", content))
    suspicious_ratio = suspicious_count / content_length if content_length else 1
    normalized = unicodedata.normalize("NFKD", content).encode("ascii", "ignore").decode("ascii")
    normalized = re.sub(r"[^A-Za-z\s]", " ", normalized)
    natural_words = [word for word in re.findall(r"[A-Za-z]{4,}", normalized) if re.search(r"[aeiou]", word, flags=re.IGNORECASE)]
    score = (1_000_000 if content_length >= 80 and suspicious_ratio <= 0.08 and len(natural_words) >= 10 else 0)
    score += len(natural_words) * 1000 + content_length - round(suspicious_ratio * 10_000)
    return score >= 1_000_000, score


def extract_page_text(page: object, extraction_mode: str | None) -> str:
    if extraction_mode is None:
        text = page.extract_text() or ""
    else:
        text = page.extract_text(extraction_mode=extraction_mode) or ""
    return normalize_text(text)


def extract_pdf_text(pdf_path: Path) -> dict[str, object]:
    reader = PdfReader(str(pdf_path))
    candidates: list[dict[str, object]] = []

    for extraction_mode, method in [(None, "pypdf"), ("layout", "pypdf_layout")]:
        pages: list[str] = []
        for page in reader.pages:
            try:
                text = extract_page_text(page, extraction_mode)
            except TypeError:
                text = ""
            if text:
                pages.append(text)

        content = "\n\n".join(pages).strip()
        if content:
            _, score = evaluate_candidate_quality(content)
            candidates.append(
                {
                    "content": content,
                    "page_count": len(reader.pages),
                    "extraction_method": method,
                    "score": score,
                }
            )

    if not candidates:
        return {
            "content": "",
            "page_count": len(reader.pages),
            "extraction_method": "pypdf",
        }

    best = max(candidates, key=lambda candidate: int(candidate["score"]))
    return {
        "content": best["content"],
        "page_count": best["page_count"],
        "extraction_method": best["extraction_method"],
    }


def main() -> int:
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Missing PDF path"}, ensure_ascii=False))
        return 1

    pdf_path = Path(sys.argv[1]).resolve()

    if not pdf_path.exists():
        print(json.dumps({"error": f"PDF not found: {pdf_path}"}, ensure_ascii=False))
        return 1

    try:
        payload = extract_pdf_text(pdf_path)
    except Exception as error:  # pragma: no cover - defensive wrapper
        print(json.dumps({"error": str(error)}, ensure_ascii=False))
        return 1

    print(json.dumps(payload, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
