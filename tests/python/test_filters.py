from __future__ import annotations

import unittest

from actu_emploi_pipeline.filters import should_keep_job
from actu_emploi_pipeline.models import CandidateProfile, NormalizedJob


def build_profile() -> CandidateProfile:
    return CandidateProfile(
        id="profile-main",
        target_roles=["Data Analyst", "Data Scientist", "Data Engineer", "Analytics Engineer"],
        preferred_skills=["SQL", "Python", "Power BI", "ETL", "dbt"],
        excluded_keywords=["SAP", "ERP"],
        preferred_locations=["Paris", "Remote France"],
        notes="",
        updated_at="2026-04-22T00:00:00Z",
    )


def build_job(title: str, description: str) -> NormalizedJob:
    return NormalizedJob(
        id="job-1",
        source="France Travail",
        source_job_id="1",
        canonical_job_key="job-1",
        title=title,
        company_name="Example",
        location_text="Paris",
        remote_mode="onsite",
        contract_type="CDI",
        seniority_text="2 a 4 ans",
        description_text=description,
        published_at="2026-04-22",
        skills_detected=[],
    )


class FilterRulesTest(unittest.TestCase):
    def setUp(self) -> None:
        self.profile = build_profile()

    def test_keeps_core_data_roles(self) -> None:
        job = build_job("Data Engineer", "Python SQL Airflow pipelines ETL")
        self.assertTrue(should_keep_job(job, self.profile))

    def test_keeps_adjacent_bi_role(self) -> None:
        job = build_job("Responsable applicatif architecture data et BI", "SQL reporting power bi")
        self.assertTrue(should_keep_job(job, self.profile))

    def test_rejects_data_center_roles(self) -> None:
        job = build_job("Responsable Solutions Techniques - Data Centers", "CVC batiment maintenance")
        self.assertFalse(should_keep_job(job, self.profile))

    def test_rejects_dpo_roles(self) -> None:
        job = build_job("DPO (Data Protection Officer)", "Conformite RGPD et protection des donnees")
        self.assertFalse(should_keep_job(job, self.profile))

    def test_rejects_master_data_roles(self) -> None:
        job = build_job("Responsable Master Data", "Gouvernance de referentiel produit sans stack analytique")
        self.assertFalse(should_keep_job(job, self.profile))

    def test_rejects_pure_nosql_roles(self) -> None:
        job = build_job("Data Engineer", "MongoDB Cassandra DynamoDB only")
        self.assertFalse(should_keep_job(job, self.profile))


if __name__ == "__main__":
    unittest.main()
