import { spawnSync } from "node:child_process";
import path from "node:path";
import { getPythonCandidates } from "@/src/services/runtime/python-executable";

const ANALYSIS_VERSION = "agentic_pipeline_v2";

const SKILL_ALIASES: Record<string, string[]> = {
  API: ["api", "apis", "rest api", "api rest"],
  Azure: ["azure", "microsoft azure"],
  "Deep Learning": ["deep learning", "keras", "tensorflow", "reseau de neurones", "réseau de neurones"],
  Docker: ["docker", "dockerise", "dockerisé", "dockerisee", "dockerisée", "conteneurisation", "containerisation"],
  Excel: ["excel", "microsoft excel", "tableur"],
  FastAPI: ["fastapi", "fast api"],
  Hadoop: ["hadoop", "hdfs"],
  R: ["r", "langage r", "r studio", "rstudio"],
  SAS: ["sas", "sas enterprise guide"],
  Streamlit: ["streamlit"],
  SQL: ["sql", "postgresql", "mysql"],
  Python: ["python", "pandas", "pyspark", "scikit-learn", "scikit learn", "numpy", "matplotlib", "seaborn"],
  "Power BI": ["power bi", "powerbi"],
  ETL: ["etl", "elt", "pipeline", "pipelines"],
  Modelisation: ["modelisation", "modeling", "schema en etoile"],
  Dashboarding: ["dashboard", "dashboards", "tableau de bord", "tableaux de bord", "reporting", "kpi"],
  "Machine Learning": ["machine learning", "ml", "scikit-learn"],
  Airflow: ["airflow"],
  dbt: ["dbt"],
  Databricks: ["databricks"],
  Snowflake: ["snowflake"],
  DuckDB: ["duckdb"],
  Communication: ["communication", "communiquer", "presentation", "presenter", "restitution", "restituer"],
  Vulgarisation: ["vulgarisation", "vulgariser", "pedagogie", "expliquer simplement", "documentation"],
  Collaboration: ["collaboration", "collaborer", "travail en equipe", "equipes metier", "stakeholders"],
  Autonomie: ["autonomie", "autonome", "initiative", "proactif", "proactive"],
  Rigueur: ["rigueur", "rigoureux", "qualite de donnees", "controle qualite", "fiabilisation"],
  "Problem solving": ["problem solving", "resolution de probleme", "analyse de probleme", "troubleshooting"],
  "Gestion de projet": ["gestion de projet", "pilotage", "coordination", "priorisation", "cadrage"],
  "Anglais professionnel": ["anglais", "english", "international", "documentation anglaise"]
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

function buildEvidence(content: string, skill: string) {
  const compact = content.replace(/\s+/g, " ").trim();
  const index = normalizeText(compact).indexOf(normalizeText(skill));

  if (index < 0) {
    return compact.slice(0, 120);
  }

  return compact.slice(Math.max(index - 50, 0), Math.min(index + skill.length + 70, compact.length)).trim();
}

function detectAliases(text: string, aliasesByKey: Record<string, string[]>) {
  const normalized = normalizeText(text);

  return Object.entries(aliasesByKey)
    .filter(([, aliases]) => aliases.some((alias) => aliasMatches(normalized, alias)))
    .map(([key]) => key)
    .sort();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function aliasMatches(normalizedText: string, alias: string) {
  const normalizedAlias = normalizeText(alias).trim();
  if (!normalizedAlias) {
    return false;
  }

  const pattern = `(?<![a-z0-9])${escapeRegExp(normalizedAlias).replace(/\\ /g, "\\s+")}(?![a-z0-9])`;
  return new RegExp(pattern).test(normalizedText);
}

type CandidateDocumentAnalysisInput = {
  documentType?: "cv" | "lettre";
  sourceFilename?: string;
  extractionMethod?: string;
};

function analyzeCandidateDocumentWithPython(content: string, input: CandidateDocumentAnalysisInput = {}) {
  const scriptPath = path.join(process.cwd(), "scripts", "python", "analyze_candidate_document_text.py");
  const payload = JSON.stringify({
    content_text: content,
    document_type: input.documentType ?? "cv",
    source_filename: input.sourceFilename ?? "document",
    extraction_method: input.extractionMethod ?? "manual_text"
  });

  for (const executable of getPythonCandidates()) {
    const result = spawnSync(executable, [scriptPath], {
      cwd: process.cwd(),
      input: payload,
      encoding: "utf8",
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8"
      },
      windowsHide: true,
      timeout: 30_000
    });

    if (result.error || result.status !== 0) {
      continue;
    }

    try {
      const parsed = JSON.parse(result.stdout) as Record<string, unknown>;
      if (parsed.extraction_status === "done" && Array.isArray(parsed.detected_skills)) {
        return parsed;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function analyzeCandidateDocumentLocally(content: string) {
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
    analysis_mode: "agentic_baseline",
    analysis_version: ANALYSIS_VERSION,
    agent_trace: ["cv-skill-extractor", "profile-signal-controller"],
    summary: buildSummary(content),
    detected_skills: detectedSkills,
    skill_signals: detectedSkills.map((skill) => ({
      skill_name: skill,
      source: "profile",
      evidence_text: buildEvidence(content, skill),
      confidence_score: 82
    })),
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

export function analyzeCandidateDocument(content: string, input: CandidateDocumentAnalysisInput = {}) {
  return analyzeCandidateDocumentWithPython(content, input) ?? analyzeCandidateDocumentLocally(content);
}
