from __future__ import annotations

import re
import unicodedata

from actu_emploi_pipeline.skills_catalog import SKILL_ALIASES


def normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return normalized.lower().replace("'", "'")


def _alias_matches(lowered_text: str, alias: str) -> bool:
    normalized_alias = normalize_text(alias).strip()
    if not normalized_alias:
        return False
    pattern = r"(?<![a-z0-9])" + re.escape(normalized_alias).replace(r"\ ", r"\s+") + r"(?![a-z0-9])"
    return re.search(pattern, lowered_text) is not None


def extract_skills(text: str) -> list[str]:
    lowered = normalize_text(text)
    detected: list[str] = []

    for canonical_name, aliases in SKILL_ALIASES.items():
        if any(_alias_matches(lowered, alias) for alias in aliases):
            detected.append(canonical_name)

    return sorted(set(detected))
