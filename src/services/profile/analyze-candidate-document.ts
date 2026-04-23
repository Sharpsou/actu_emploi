const SKILL_ALIASES: Record<string, string[]> = {
  SQL: ["sql", "postgresql", "mysql"],
  Python: ["python", "pandas", "pyspark"],
  "Power BI": ["power bi", "powerbi"],
  ETL: ["etl", "elt", "pipeline", "pipelines"],
  Modelisation: ["modelisation", "modeling", "schema en etoile"],
  Dashboarding: ["dashboard", "dashboards", "tableau de bord", "tableaux de bord", "reporting", "kpi"],
  "Machine Learning": ["machine learning", "ml", "scikit-learn"],
  Airflow: ["airflow"],
  dbt: ["dbt"],
  Databricks: ["databricks"]
};

const ROLE_ALIASES: Record<string, string[]> = {
  "Data Analyst": ["data analyst", "analyste data"],
  "Data Scientist": ["data scientist", "data science"],
  "Data Engineer": ["data engineer", "ingenieur data", "ingénieur data"],
  "Analytics Engineer": ["analytics engineer", "bi engineer"]
};

const LOCATION_ALIASES: Record<string, string[]> = {
  Nantes: ["nantes"],
  "Saint-Nazaire": ["saint-nazaire", "saint nazaire"],
  "Loire-Atlantique": ["loire-atlantique", "loire atlantique"],
  Remote: ["remote", "teletravail", "télétravail", "hybride", "hybrid"]
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function buildSummary(content: string) {
  return content.replace(/\s+/g, " ").trim().slice(0, 220);
}

function detectAliases(text: string, aliasesByKey: Record<string, string[]>) {
  const normalized = normalizeText(text);

  return Object.entries(aliasesByKey)
    .filter(([, aliases]) => aliases.some((alias) => normalized.includes(normalizeText(alias))))
    .map(([key]) => key)
    .sort();
}

export function analyzeCandidateDocument(content: string) {
  const normalized = normalizeText(content);
  const detectedSkills = detectAliases(content, SKILL_ALIASES);
  const detectedRoles = detectAliases(content, ROLE_ALIASES);
  const detectedLocations = detectAliases(content, LOCATION_ALIASES);
  const mentionsRemote =
    normalized.includes("teletravail") ||
    normalized.includes("remote") ||
    normalized.includes("hybride") ||
    normalized.includes("hybrid");

  return {
    extraction_status: "done",
    summary: buildSummary(content),
    detected_skills: detectedSkills,
    detected_roles: detectedRoles,
    detected_locations: detectedLocations,
    mentions_teletravail: mentionsRemote,
    profile_signals: {
      skills_count: detectedSkills.length,
      roles_count: detectedRoles.length,
      locations_count: detectedLocations.length
    }
  };
}
