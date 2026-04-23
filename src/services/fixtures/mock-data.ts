import { buildScoreExplanation, computeGlobalScore } from "@/src/domain/scoring";
import type {
  CandidateDocument,
  CandidateProfile,
  DailyFeedItem,
  JobMatch,
  NormalizedJob,
  RawJobRecord,
  SkillCatalogEntry,
  SkillGap
} from "@/src/domain/types";

export const rawJobsFixture: RawJobRecord[] = [
  {
    id: "raw-ft-001",
    source: "France Travail",
    sourceJobId: "FT-44711",
    fetchedAt: "2026-04-22T05:40:00.000Z",
    payloadJson: { title: "Data Analyst", stack: ["SQL", "Power BI", "Python"] },
    checksum: "ft-44711-a"
  },
  {
    id: "raw-jo-001",
    source: "Jooble",
    sourceJobId: "JBL-982",
    fetchedAt: "2026-04-22T05:43:00.000Z",
    payloadJson: { title: "Analytics Engineer", stack: ["SQL", "dbt", "Airflow"] },
    checksum: "jbl-982-a"
  }
];

export const jobsNormalizedFixture: NormalizedJob[] = [
  {
    id: "job-001",
    rawJobId: "raw-ft-001",
    sourceJobId: "FT-44711",
    canonicalJobKey: "data-analyst-nantes-bi",
    source: "France Travail",
    title: "Data Analyst",
    companyName: "Atos",
    locationText: "Nantes",
    remoteMode: "hybrid",
    contractType: "CDI",
    seniorityText: "2 a 4 ans",
    descriptionText:
      "Offre orientee SQL, Power BI et analyse produit avec une composante Python legere. L'equipe cherche un profil capable de transformer les besoins metier en tableaux de bord et analyses explicables.",
    skillsDetected: ["SQL", "Power BI", "Python", "Modelisation", "Dashboarding"],
    publishedAt: "2026-04-21",
    normalizedAt: "2026-04-22T05:45:00.000Z"
  },
  {
    id: "job-002",
    rawJobId: "raw-jo-001",
    sourceJobId: "JBL-982",
    canonicalJobKey: "analytics-engineer-remote-dbt",
    source: "Jooble",
    title: "Analytics Engineer",
    companyName: "North Metrics",
    locationText: "Remote France",
    remoteMode: "remote",
    contractType: "CDI",
    seniorityText: "3 a 5 ans",
    descriptionText:
      "Poste data proche de l'analytics engineering avec SQL avance, dbt, Airflow et une forte culture des pipelines et des modeles de donnees.",
    skillsDetected: ["SQL", "dbt", "Airflow", "Python", "ELT", "Data Modeling"],
    publishedAt: "2026-04-22",
    normalizedAt: "2026-04-22T05:47:00.000Z"
  }
];

export const candidateProfileFixture: CandidateProfile = {
  id: "profile-main",
  targetRoles: ["Data Analyst", "Analytics Engineer", "Data Engineer"],
  preferredSkills: ["SQL", "Python", "Power BI", "ETL", "Modelisation"],
  excludedKeywords: ["SAP", "ERP"],
  preferredLocations: ["Nantes", "Saint-Nazaire"],
  preferRemoteFriendly: true,
  notes:
    "Profil cible data avec forte appétence SQL et BI, progression active sur l'orchestration et la modelisation analytique.",
  updatedAt: "2026-04-22T06:00:00.000Z"
};

export const candidateDocumentsFixture: CandidateDocument[] = [
  {
    id: "doc-001",
    documentType: "cv",
    sourceFilename: "cv-data-2026.txt",
    contentText: "SQL, Python, ETL, dashboards, statistiques, Power BI.",
    parsedJson: {
      skills: ["SQL", "Python", "ETL", "Power BI", "Statistiques"]
    },
    createdAt: "2026-04-21T19:00:00.000Z"
  },
  {
    id: "doc-002",
    documentType: "lettre",
    sourceFilename: "lettre-candidature.txt",
    contentText: "Interet pour la data, la BI et l'industrialisation de pipelines simples.",
    parsedJson: {
      themes: ["BI", "Pipelines", "Data"]
    },
    createdAt: "2026-04-21T19:12:00.000Z"
  }
];

export const skillCatalogFixture: SkillCatalogEntry[] = [
  {
    id: "skill-001",
    skillName: "SQL",
    skillCategory: "tech",
    aliases: ["postgresql", "mysql", "requete sql"],
    isActive: true
  },
  {
    id: "skill-002",
    skillName: "Airflow",
    skillCategory: "tool",
    aliases: ["apache airflow"],
    isActive: true
  },
  {
    id: "skill-003",
    skillName: "dbt",
    skillCategory: "tool",
    aliases: ["data build tool"],
    isActive: true
  }
];

const matchBase: Omit<JobMatch, "scoreGlobal">[] = [
  {
    id: "match-001",
    jobId: "job-001",
    candidateProfileId: "profile-main",
    scoreRole: 24,
    scoreSkillsMatch: 28,
    scoreStackFit: 12,
    scoreSeniority: 8,
    scorePenalties: 0,
    scorePreference: 10,
    explanation: buildScoreExplanation({
      strengths: ["SQL fort", "BI presente", "Stack proche du profil"],
      missingSkills: ["Modelisation dimensionnelle"],
      penalties: [],
      quickWins: ["Renforcer storytelling dashboard", "Ajouter un cas produit"],
      blockingPoints: []
    }),
    matchedSkills: ["SQL", "Power BI", "Python"],
    missingSkills: ["Modelisation dimensionnelle"],
    computedAt: "2026-04-22T06:05:00.000Z"
  },
  {
    id: "match-002",
    jobId: "job-002",
    candidateProfileId: "profile-main",
    scoreRole: 20,
    scoreSkillsMatch: 24,
    scoreStackFit: 13,
    scoreSeniority: 7,
    scorePenalties: 0,
    scorePreference: 12,
    explanation: buildScoreExplanation({
      strengths: ["SQL avance", "Remote France", "Orientation data pipeline"],
      missingSkills: ["Airflow", "dbt avance"],
      penalties: [],
      quickWins: ["POC ELT avec dbt", "Mini orchestration locale"],
      blockingPoints: ["Experience Airflow peu visible"]
    }),
    matchedSkills: ["SQL", "Python", "ELT"],
    missingSkills: ["Airflow", "dbt"],
    computedAt: "2026-04-22T06:10:00.000Z"
  }
];

export const jobMatchesFixture: JobMatch[] = matchBase.map((item) => ({
  ...item,
  scoreGlobal: computeGlobalScore(item)
}));

export const skillGapsFixture: SkillGap[] = [
  {
    id: "gap-001",
    jobMatchId: "match-001",
    skillName: "Modelisation dimensionnelle",
    gapType: "theorique",
    importanceScore: 82,
    rationaleText:
      "La competences apparait dans les missions BI mais n'est pas encore prouvee clairement dans le profil importe.",
    suggestedAction: {
      title: "Synthese schema en etoile",
      format: "note + mini schema",
      deliverable: "README avec exemple de modele analytique"
    }
  },
  {
    id: "gap-002",
    jobMatchId: "match-002",
    skillName: "Airflow",
    gapType: "outil",
    importanceScore: 90,
    rationaleText:
      "L'annonce attend une orchestration visible des pipelines alors que le profil montre surtout de l'ETL sans orchestrateur nomme.",
    suggestedAction: {
      title: "Pipeline ETL orchestre localement",
      format: "mini projet",
      deliverable: "repo avec DAG simple ou equivalent local"
    }
  },
  {
    id: "gap-003",
    jobMatchId: "match-002",
    skillName: "dbt",
    gapType: "pratique",
    importanceScore: 74,
    rationaleText:
      "Le vocabulaire analytique est proche, mais il manque une preuve explicite d'implementation d'un modele analytics engineering.",
    suggestedAction: {
      title: "POC dbt sur DuckDB",
      format: "atelier guide",
      deliverable: "repo dbt avec sources, models et docs"
    }
  }
];

export const dailyFeedFixture: DailyFeedItem[] = [
  {
    id: "feed-001",
    feedDate: "2026-04-22",
    kind: "offre",
    relatedJobId: "job-001",
    relatedJobMatchId: "match-001",
    title: "Data Analyst - Studio Sigma",
    summary: "Offre BI solide, bonne proximite de stack, manque principal sur la modelisation.",
    score: 82,
    rank: 1,
    source: "France Travail",
    tags: ["SQL", "Power BI", "Modelisation"],
    payload: {
      why: ["SQL fort", "BI presente"],
      missingSkills: ["Modelisation dimensionnelle"]
    },
    createdAt: "2026-04-22T06:30:00.000Z"
  },
  {
    id: "feed-002",
    feedDate: "2026-04-22",
    kind: "offre",
    relatedJobId: "job-002",
    relatedJobMatchId: "match-002",
    title: "Analytics Engineer - North Metrics",
    summary: "Tres belle cible de progression avec remote France et signaux forts sur SQL/ELT.",
    score: 76,
    rank: 2,
    source: "Jooble",
    tags: ["Airflow", "dbt", "ELT"],
    payload: {
      why: ["Remote France", "Orientation pipeline"],
      missingSkills: ["Airflow", "dbt"]
    },
    createdAt: "2026-04-22T06:31:00.000Z"
  },
  {
    id: "feed-003",
    feedDate: "2026-04-22",
    kind: "competence",
    title: "Airflow revient souvent dans les annonces data pipeline",
    summary: "Observe dans plusieurs offres de la journee, avec un impact direct sur l'employabilite data engineering.",
    score: 74,
    rank: 3,
    tags: ["outil", "orchestration", "priorite haute"],
    payload: {
      occurrences: 6,
      estimatedLevel: "faible"
    },
    createdAt: "2026-04-22T06:32:00.000Z"
  },
  {
    id: "feed-004",
    feedDate: "2026-04-22",
    kind: "notion",
    title: "Revoir la modelisation dimensionnelle",
    summary: "Notion recurrente pour relier besoins BI, tables de faits et dimensions reutilisables.",
    score: 68,
    rank: 4,
    tags: ["theorique", "BI", "schema en etoile"],
    payload: {
      quickDefinition: "Organiser les donnees autour de faits et dimensions pour l'analyse."
    },
    createdAt: "2026-04-22T06:33:00.000Z"
  },
  {
    id: "feed-005",
    feedDate: "2026-04-22",
    kind: "projet",
    title: "Construire un mini pipeline ELT local",
    summary: "Projet de 2 jours pour prouver SQL, transformations et orchestration legere sur donnees publiques.",
    score: 71,
    rank: 5,
    tags: ["POC", "dbt", "DuckDB"],
    payload: {
      estimatedDuration: "2 jours",
      deliverables: ["repo GitHub", "README", "capture dashboard"]
    },
    createdAt: "2026-04-22T06:34:00.000Z"
  }
];
