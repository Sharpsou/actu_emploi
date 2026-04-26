from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any, Protocol

from actu_emploi_pipeline.analysis.hardware import HardwareAcceleration, detect_hardware_acceleration
from actu_emploi_pipeline.settings import get_settings
from actu_emploi_pipeline.skills_catalog import SKILL_ALIASES


ALLOWED_GAP_STATUSES = {"acquis", "survol", "formation", "mini_projet"}
ALLOWED_EFFORT_LEVELS = {"aucun", "leger", "court", "pratique"}
UNKNOWN_SKILL_MIN_CONFIDENCE = 78
SKILL_NAME_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 .+#/-]{1,48}$")


@dataclass(frozen=True, slots=True)
class LlmSkillCandidate:
    skill_name: str
    evidence_text: str
    confidence_score: int


@dataclass(frozen=True, slots=True)
class LlmGapDecision:
    skill_name: str
    status: str
    effort_level: str
    rationale_text: str
    confidence_score: int


class LightweightLlmClient(Protocol):
    model_name: str
    device_kind: str

    def health_check(self) -> dict[str, object]:
        ...

    def extract_skills(self, *, entity_kind: str, text: str) -> list[LlmSkillCandidate]:
        ...

    def classify_gaps(self, *, profile_skills: list[str], job_skills: list[str]) -> list[LlmGapDecision]:
        ...


class NullLightweightLlmClient:
    model_name = "none"
    device_kind = "cpu"

    def health_check(self) -> dict[str, object]:
        return {"enabled": False, "reachable": False, "reason": "disabled"}

    def extract_skills(self, *, entity_kind: str, text: str) -> list[LlmSkillCandidate]:
        return []

    def classify_gaps(self, *, profile_skills: list[str], job_skills: list[str]) -> list[LlmGapDecision]:
        return []


def _compact(value: str, limit: int = 6000) -> str:
    return " ".join(value.split())[:limit]


def _json_from_response(payload: dict[str, Any]) -> dict[str, Any]:
    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        return {}

    message = choices[0].get("message") if isinstance(choices[0], dict) else None
    content = message.get("content") if isinstance(message, dict) else None
    if not isinstance(content, str):
        return {}

    content = content.strip()
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", content, re.DOTALL)
        if fenced:
            try:
                parsed = json.loads(fenced.group(1))
            except json.JSONDecodeError:
                parsed = None
        else:
            start = content.find("{")
            end = content.rfind("}")
            parsed = None
            if start >= 0 and end > start:
                try:
                    parsed = json.loads(content[start : end + 1])
                except json.JSONDecodeError:
                    parsed = None
        if parsed is None:
            return {}

    return parsed if isinstance(parsed, dict) else {}


def _bounded_int(value: object, default: int) -> int:
    if isinstance(value, int):
        return max(0, min(100, value))
    return default


def _valid_skill_name(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    normalized = " ".join(value.strip().split())
    if not normalized or not SKILL_NAME_PATTERN.match(normalized):
        return None
    return normalized


class OpenAICompatibleLightweightLlmClient:
    def __init__(
        self,
        *,
        endpoint_url: str,
        model_name: str,
        timeout_seconds: int,
        hardware: HardwareAcceleration,
        keep_alive: str,
    ) -> None:
        self.endpoint_url = endpoint_url
        self.model_name = model_name
        self.timeout_seconds = timeout_seconds
        self.hardware = hardware
        self.device_kind = hardware.device_kind
        self.keep_alive = keep_alive

    def _chat_json(self, system_prompt: str, user_payload: dict[str, Any]) -> dict[str, Any]:
        enriched_payload = {
            **user_payload,
            "runtime": {
                "device_hint": self.hardware.device_kind,
                "device_name": self.hardware.device_name,
                "backend_hint": self.hardware.backend_hint,
            },
        }
        body = json.dumps(
            {
                "model": self.model_name,
                "temperature": 0,
                "stream": False,
                "response_format": {"type": "json_object"},
                "keep_alive": self.keep_alive,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": json.dumps(enriched_payload, ensure_ascii=False)},
                ],
            },
            ensure_ascii=False,
        ).encode("utf-8")
        request = urllib.request.Request(
            self.endpoint_url,
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                return _json_from_response(json.loads(response.read().decode("utf-8")))
        except (OSError, urllib.error.URLError, json.JSONDecodeError):
            return {}

    def health_check(self) -> dict[str, object]:
        response = self._chat_json(
            "Retourne uniquement ce JSON exact: {\"ok\":true}",
            {"probe": "health_check"},
        )
        return {
            "enabled": True,
            "reachable": response.get("ok") is True,
            "model_name": self.model_name,
            "device_kind": self.device_kind,
            "endpoint_url": self.endpoint_url,
        }

    def extract_skills(self, *, entity_kind: str, text: str) -> list[LlmSkillCandidate]:
        response = self._chat_json(
            (
                "Tu es un petit agent d'extraction de competences. "
                "Retourne uniquement du JSON valide. Priorise le catalogue fourni, "
                "mais tu peux ajouter une competence hors catalogue si elle est explicitement presente "
                "dans le texte et utile pour le matching. Les noms propres de technos, frameworks, clouds, "
                "bibliotheques, langages, outils BI, outils data, bases de donnees et formats de deploiement "
                "doivent etre extraits meme s'ils ne sont pas dans le catalogue. Exemples hors catalogue valides: "
                "Streamlit, FastAPI, Docker, Git, GitHub, Tableau, Looker. N'invente rien. Schema: "
                '{"skills":[{"skill_name":"SQL","evidence_text":"...","confidence_score":80}]}'
            ),
            {
                "entity_kind": entity_kind,
                "catalog": sorted(SKILL_ALIASES.keys()),
                "text": _compact(text),
            },
        )
        raw_skills = response.get("skills")
        if not isinstance(raw_skills, list):
            return []

        candidates: list[LlmSkillCandidate] = []
        for item in raw_skills:
            if not isinstance(item, dict):
                continue
            skill_name = _valid_skill_name(item.get("skill_name"))
            evidence_text = item.get("evidence_text")
            confidence_score = _bounded_int(item.get("confidence_score"), 70)
            if not skill_name or not isinstance(evidence_text, str) or not evidence_text.strip():
                continue
            if skill_name not in SKILL_ALIASES and confidence_score < UNKNOWN_SKILL_MIN_CONFIDENCE:
                continue
            candidates.append(
                LlmSkillCandidate(
                    skill_name=skill_name,
                    evidence_text=evidence_text.strip()[:240],
                    confidence_score=confidence_score,
                )
            )
        return candidates

    def classify_gaps(self, *, profile_skills: list[str], job_skills: list[str]) -> list[LlmGapDecision]:
        response = self._chat_json(
            (
                "Tu es un petit agent de classification d'ecarts CV/offre. "
                "Retourne uniquement du JSON valide. Classe chaque competence demandee. "
                "Statuts autorises: acquis, survol, formation, mini_projet. "
                "Efforts autorises: aucun, leger, court, pratique. Schema: "
                '{"decisions":[{"skill_name":"Airflow","status":"formation","effort_level":"court","rationale_text":"...","confidence_score":75}]}'
            ),
            {
                "profile_skills": profile_skills,
                "job_skills": job_skills,
            },
        )
        raw_decisions = response.get("decisions")
        if not isinstance(raw_decisions, list):
            return []

        job_skill_set = set(job_skills)
        decisions: list[LlmGapDecision] = []
        for item in raw_decisions:
            if not isinstance(item, dict):
                continue
            skill_name = item.get("skill_name")
            status = item.get("status")
            effort_level = item.get("effort_level")
            rationale_text = item.get("rationale_text")
            if (
                skill_name not in job_skill_set
                or status not in ALLOWED_GAP_STATUSES
                or effort_level not in ALLOWED_EFFORT_LEVELS
                or not isinstance(rationale_text, str)
            ):
                continue
            decisions.append(
                LlmGapDecision(
                    skill_name=skill_name,
                    status=status,
                    effort_level=effort_level,
                    rationale_text=rationale_text.strip()[:280],
                    confidence_score=_bounded_int(item.get("confidence_score"), 70),
                )
            )
        return decisions


def build_lightweight_llm_client() -> LightweightLlmClient:
    settings = get_settings()
    if not settings.lightweight_llm_enabled:
        return NullLightweightLlmClient()

    hardware = detect_hardware_acceleration()
    device = settings.lightweight_llm_device.lower()
    if device == "cpu":
        hardware = HardwareAcceleration(detected=False, device_kind="cpu", device_name=None, backend_hint=None)
    if device == "amd-gpu" and hardware.device_kind != "amd-gpu":
        return NullLightweightLlmClient()

    endpoint_url = settings.lightweight_llm_endpoint_url
    if hardware.device_kind == "amd-gpu" and settings.lightweight_llm_amd_endpoint_url:
        endpoint_url = settings.lightweight_llm_amd_endpoint_url

    return OpenAICompatibleLightweightLlmClient(
        endpoint_url=endpoint_url,
        model_name=settings.lightweight_llm_model,
        timeout_seconds=settings.lightweight_llm_timeout_seconds,
        hardware=hardware,
        keep_alive=settings.lightweight_llm_keep_alive,
    )
