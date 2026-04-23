from __future__ import annotations

import re
import unicodedata


def _is_pdf_extraction_method(extraction_method: str | None) -> bool:
    return isinstance(extraction_method, str) and "pdf" in extraction_method.lower()


def evaluate_document_text_quality(content: str, extraction_method: str | None = None) -> tuple[bool, str | None]:
    content_length = len(content)
    suspicious_count = len(re.findall(r"[\x00-\x1F\x7F-\x9FÂÃ�]", content))
    suspicious_ratio = suspicious_count / content_length if content_length else 1
    normalized = unicodedata.normalize("NFKD", content).encode("ascii", "ignore").decode("ascii")
    normalized = re.sub(r"[^A-Za-z\s]", " ", normalized)
    long_words = re.findall(r"[A-Za-z]{4,}", normalized)
    natural_words = [word for word in long_words if re.search(r"[aeiou]", word, flags=re.IGNORECASE)]

    if content_length < 80:
        return False, "Le texte extrait est trop court pour analyser le document."

    if _is_pdf_extraction_method(extraction_method):
        if suspicious_ratio > 0.08:
            return False, "Le texte extrait du PDF semble corrompu ou mal decode."
        if len(natural_words) < 10:
            return False, "Le PDF ne contient pas assez de texte lisible pour une analyse fiable."

    return True, None
