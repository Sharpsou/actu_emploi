SKILL_ALIASES: dict[str, set[str]] = {
    "SQL": {"sql", "postgresql", "mysql", "requete"},
    "Python": {"python", "pandas", "pyspark"},
    "Power BI": {"power bi", "powerbi"},
    "Airflow": {"airflow", "apache airflow"},
    "dbt": {"dbt", "data build tool"},
    "ETL": {"etl", "elt", "pipeline", "data engineering", "preparer la donnee", "preparation de donnees"},
    "Modelisation": {
        "modelisation",
        "modelisation dimensionnelle",
        "structuration de la donnee",
        "data modeling",
        "schema en etoile",
        "star schema",
    },
    "Dashboarding": {"dashboard", "dashboards", "reporting", "tableau de bord", "tableaux de bord", "kpi"},
    "Machine Learning": {"machine learning", "ml", "scikit-learn"},
    "Snowflake": {"snowflake"},
    "Databricks": {"databricks"},
    "DuckDB": {"duckdb"},
}

TOOL_SKILLS = {"Airflow", "dbt", "Power BI", "Snowflake", "Databricks", "DuckDB"}
THEORETICAL_SKILLS = {"Modelisation", "Machine Learning"}
