from __future__ import annotations

from actu_emploi_pipeline.models import CandidateProfile, NormalizedJob


NOSQL_KEYWORDS = {"nosql", "mongodb", "cassandra", "dynamodb", "neo4j", "hbase"}
ERP_KEYWORDS = {"sap", "erp", "oracle ebs"}
CORE_STACK_KEYWORDS = {
    "sql",
    "python",
    "power bi",
    "tableau",
    "etl",
    "elt",
    "airflow",
    "dbt",
    "data pipeline",
    "data warehouse",
    "bigquery",
    "snowflake",
    "machine learning",
    "dashboard",
    "reporting",
    "visualisation",
    "modélisation",
    "modelisation",
}
TARGET_ROLE_PHRASES = {
    "data analyst",
    "analyste data",
    "data engineer",
    "ingénieur data",
    "ingenieur data",
    "data scientist",
    "data science",
    "analytics engineer",
    "bi engineer",
    "business intelligence engineer",
    "business intelligence analyst",
    "bi analyst",
    "developpeur data",
    "développeur data",
    "data developer",
    "ingénieur ia & data",
    "ingenieur ia & data",
    "machine learning engineer",
    "ml engineer",
    "recherche data science",
    "architecture data",
}
ADJACENT_TITLE_PHRASES = {
    "analytics engineer",
    "bi engineer",
    "business intelligence engineer",
    "business intelligence analyst",
    "bi analyst",
    "developpeur data",
    "développeur data",
    "data developer",
    "ingénieur ia & data",
    "ingenieur ia & data",
    "machine learning engineer",
    "ml engineer",
    "recherche data science",
    "architecture data",
}
HARD_REJECT_PHRASES = {
    "data center",
    "data centres",
    "data centers",
    "dpo",
    "data protection officer",
    "protection des donnees",
    "protection des données",
    "juriste",
    "compliance",
    "conformite",
    "conformité",
    "legal",
    "master data",
    "gestionnaire de donnees produits",
    "gestionnaire de données produits",
    "bureau d'etudes",
    "bureau d’études",
    "bureau detudes",
    "cvcd",
    "cvc",
    "cfo / cfa",
    "cfo/cfa",
    "moex",
    "maintenance",
    "solutions techniques",
}
INFRA_CONTEXT_KEYWORDS = {
    "data center",
    "batiment",
    "bâtiment",
    "facility",
    "construction",
    "electricite",
    "électricité",
    "cvc",
    "cvcd",
    "cfo",
    "cfa",
    "maintenance",
    "chantier",
    "genie climatique",
    "génie climatique",
}


def normalize_text(value: str) -> str:
    lowered = value.lower()
    return (
        lowered.replace("é", "e")
        .replace("è", "e")
        .replace("ê", "e")
        .replace("à", "a")
        .replace("ù", "u")
        .replace("î", "i")
        .replace("ï", "i")
        .replace("ô", "o")
        .replace("ö", "o")
        .replace("ç", "c")
        .replace("’", "'")
    )


def job_search_text(job: NormalizedJob) -> str:
    return normalize_text(" ".join([job.title, job.description_text, job.company_name]))


def has_core_stack_signal(job: NormalizedJob) -> bool:
    lowered = job_search_text(job)
    if any(skill in {"SQL", "Python", "Power BI", "Airflow", "dbt", "ETL", "Modelisation", "Machine Learning"} for skill in job.skills_detected):
        return True
    return any(keyword in lowered for keyword in CORE_STACK_KEYWORDS)


def has_hard_rejection_signal(job: NormalizedJob) -> bool:
    lowered = job_search_text(job)
    return any(phrase in lowered for phrase in HARD_REJECT_PHRASES)


def role_match_strength(job: NormalizedJob, profile: CandidateProfile) -> int:
    title = normalize_text(job.title)
    target_roles = {normalize_text(role) for role in profile.target_roles}

    if title in target_roles:
        return 3
    if any(role in title or title in role for role in target_roles):
        return 3
    if any(phrase in title for phrase in TARGET_ROLE_PHRASES):
        return 2
    if "data" in title and has_core_stack_signal(job) and not _looks_like_infra_or_legal(job):
        return 1
    return 0


def _looks_like_infra_or_legal(job: NormalizedJob) -> bool:
    lowered = job_search_text(job)
    return any(keyword in lowered for keyword in INFRA_CONTEXT_KEYWORDS) or any(
        phrase in lowered for phrase in {"dpo", "juriste", "protection des donnees", "protection des données"}
    )


def _is_pure_nosql_job(job: NormalizedJob) -> bool:
    lowered = job_search_text(job)
    has_nosql = any(keyword in lowered for keyword in NOSQL_KEYWORDS)
    has_sql = "sql" in lowered
    return has_nosql and not has_sql


def _is_specific_erp_job(job: NormalizedJob) -> bool:
    lowered = job_search_text(job)
    return any(keyword in lowered for keyword in ERP_KEYWORDS)


def should_keep_job(job: NormalizedJob, profile: CandidateProfile) -> bool:
    if has_hard_rejection_signal(job):
        return False
    if _is_specific_erp_job(job):
        return False
    if _is_pure_nosql_job(job):
        return False
    return role_match_strength(job, profile) > 0
