from __future__ import annotations

import unicodedata

from actu_emploi_pipeline.skills_catalog import SKILL_ALIASES


def normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return normalized.lower().replace("’", "'")


def extract_skills(text: str) -> list[str]:
    lowered = normalize_text(text)
    detected: list[str] = []

    for canonical_name, aliases in SKILL_ALIASES.items():
        if any(normalize_text(alias) in lowered for alias in aliases):
            detected.append(canonical_name)

    return sorted(set(detected))
