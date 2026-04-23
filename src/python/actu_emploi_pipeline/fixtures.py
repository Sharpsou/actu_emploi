from __future__ import annotations

from actu_emploi_pipeline.models import CandidateProfile, SourceJobPayload


def build_fixture_profile() -> CandidateProfile:
    return CandidateProfile(
        id="profile-main",
        target_roles=["Data Analyst", "Data Scientist", "Analytics Engineer", "Data Engineer"],
        preferred_skills=["SQL", "Python", "Power BI", "ETL", "Modelisation", "dbt"],
        excluded_keywords=["SAP", "ERP"],
        preferred_locations=["Nantes", "Saint-Nazaire"],
        prefer_remote_friendly=True,
        notes=(
            "Profil data cible avec base SQL et BI solide, priorite sur Nantes "
            "ou Saint-Nazaire avec teletravail ou hybride."
        ),
        updated_at="2026-04-22T06:00:00.000Z",
    )


def build_fixture_jobs() -> list[SourceJobPayload]:
    return [
        SourceJobPayload(
            source="France Travail",
            source_job_id="FT-44711",
            title="Data Analyst",
            company_name="Atos",
            location_text="Nantes",
            remote_mode="hybrid",
            contract_type="CDI",
            seniority_text="2 a 4 ans",
            description_text=(
                "SQL, Power BI, Python, modelisation dimensionnelle et dashboarding "
                "pour des equipes produit a Nantes avec 2 jours de teletravail."
            ),
            published_at="2026-04-21",
            payload_json={"origin": "fixture"},
        ),
        SourceJobPayload(
            source="France Travail",
            source_job_id="FT-44712",
            title="Data Engineer",
            company_name="Externatic",
            location_text="Saint-Nazaire",
            remote_mode="hybrid",
            contract_type="CDI",
            seniority_text="3 a 5 ans",
            description_text=(
                "Python, ETL, Airflow, Databricks et qualite de donnees pour des "
                "pipelines de production en mode hybride."
            ),
            published_at="2026-04-22",
            payload_json={"origin": "fixture"},
        ),
        SourceJobPayload(
            source="France Travail",
            source_job_id="FT-44713",
            title="Data Scientist",
            company_name="Studio Canopee",
            location_text="Nantes",
            remote_mode="remote",
            contract_type="CDI",
            seniority_text="2 a 4 ans",
            description_text=(
                "Python, SQL, machine learning, experimentation et dashboarding "
                "pour un poste data science a Nantes avec teletravail."
            ),
            published_at="2026-04-22",
            payload_json={"origin": "fixture"},
        ),
        SourceJobPayload(
            source="Jooble",
            source_job_id="JBL-982",
            title="Analytics Engineer",
            company_name="North Metrics",
            location_text="Remote France",
            remote_mode="remote",
            contract_type="CDI",
            seniority_text="3 a 5 ans",
            description_text=(
                "SQL, dbt, Airflow, ELT, data modeling et Python pour une stack "
                "analytics engineering moderne."
            ),
            published_at="2026-04-22",
            payload_json={"origin": "fixture"},
        ),
    ]
