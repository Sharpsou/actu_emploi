from __future__ import annotations

from typing import Protocol

from actu_emploi_pipeline.models import CandidateProfile, SourceJobPayload


class JobSourceConnector(Protocol):
    source_name: str

    def fetch_jobs(self, profile: CandidateProfile | None = None) -> list[SourceJobPayload]:
        ...
