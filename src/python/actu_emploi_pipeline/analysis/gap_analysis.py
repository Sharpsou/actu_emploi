from __future__ import annotations

from actu_emploi_pipeline.models import CandidateProfile, NormalizedJob, SkillGap, SuggestedAction
from actu_emploi_pipeline.skills_catalog import SOFT_SKILLS, THEORETICAL_SKILLS, TOOL_SKILLS


def categorize_gap(skill_name: str) -> str:
    if skill_name in SOFT_SKILLS:
        return "pratique"
    if skill_name in TOOL_SKILLS:
        return "outil"
    if skill_name in THEORETICAL_SKILLS:
        return "theorique"
    return "pratique"


def build_suggested_action(skill_name: str, gap_type: str) -> SuggestedAction:
    project_templates: dict[str, SuggestedAction] = {
        "Docker": SuggestedAction(
            title="Dockeriser un mini dashboard data",
            format="mini projet deployable",
            deliverable="repo avec Dockerfile, compose.yaml, README et capture de l'app lancee",
            description="Construire une petite app Streamlit ou FastAPI qui lit un CSV open data et l'executer dans un conteneur reproductible.",
            example="API FastAPI /health + /metrics sur un jeu de donnees emploi, lancee via docker compose.",
            public_data_idea="Offres France Travail exportees, open data transport Nantes ou donnees INSEE locales.",
        ),
        "Airflow": SuggestedAction(
            title="Orchestrer un pipeline quotidien avec Airflow",
            format="mini pipeline",
            deliverable="DAG Airflow avec extraction, transformation, controle qualite et export parquet",
            description="Montrer une orchestration simple mais realiste: collecte, nettoyage, controles et generation d'un artefact exploitable.",
            example="DAG quotidien qui recupere un CSV open data, calcule 3 indicateurs et produit un rapport Markdown.",
            free_alternative="Prefect",
            public_data_idea="Open data transport, energie ou emploi.",
        ),
        "dbt": SuggestedAction(
            title="Construire un mini modele analytique dbt",
            format="projet analytics engineering",
            deliverable="repo dbt avec sources, staging, mart, tests et documentation generee",
            description="Prouver la modelisation analytique avec des tests de qualite et une documentation claire.",
            example="Modele offres -> entreprises -> competences avec mart d'analyse des tendances.",
            public_data_idea="Snapshot d'offres ou donnees publiques INSEE/transport.",
        ),
        "Power BI": SuggestedAction(
            title="Publier un tableau de bord decisionnel Power BI",
            format="dashboard commente",
            deliverable="fichier PBIX ou captures + dictionnaire des mesures DAX",
            description="Montrer la capacite a transformer un besoin metier en indicateurs lisibles et actionnables.",
            example="Dashboard marche emploi data: volume d'offres, top competences, remote, zones.",
            free_alternative="Metabase ou Looker Studio",
            public_data_idea="Offres d'emploi exportees et donnees geographiques locales.",
        ),
        "Machine Learning": SuggestedAction(
            title="Comparer deux modeles ML sur un cas metier simple",
            format="notebook reproductible",
            deliverable="notebook + README avec baseline, metriques et limites",
            description="Prouver la demarche ML: formulation, split, baseline, evaluation, interpretation et prudence.",
            example="Classifier des offres par famille data a partir du titre et de la description.",
            public_data_idea="Descriptions d'offres collectees ou dataset public de texte court.",
        ),
        "Communication": SuggestedAction(
            title="Rediger une note decisionnelle data d'une page",
            format="note metier",
            deliverable="README avec contexte, recommandation, graphique et decision proposee",
            description="Prouver la capacite a transformer une analyse en message clair pour un public non technique.",
            example="Synthese des competences data les plus demandees a Nantes avec 3 recommandations d'apprentissage.",
            public_data_idea="Offres d'emploi data locales ou open data economique.",
        ),
        "Vulgarisation": SuggestedAction(
            title="Expliquer un pipeline data a un public metier",
            format="fiche pedagogique",
            deliverable="schema simple + glossaire + exemple avant/apres",
            description="Montrer que tu sais rendre un sujet technique comprehensible et utile.",
            example="Expliquer ETL, qualite de donnees et scoring d'offres sans jargon inutile.",
        ),
        "Collaboration": SuggestedAction(
            title="Simuler un cadrage avec parties prenantes",
            format="mini cadrage produit/data",
            deliverable="brief avec objectifs, questions, risques, decisions et prochaines actions",
            description="Prouver la capacite a cadrer un besoin data avec des interlocuteurs metier.",
            example="Cadrage d'un dashboard de suivi des offres et competences prioritaires.",
        ),
        "Autonomie": SuggestedAction(
            title="Mener une analyse data de bout en bout",
            format="mini projet autonome",
            deliverable="repo avec problematique, choix techniques, scripts, resultats et limites",
            description="Montrer que tu sais transformer une question floue en livrable exploitable sans guidage constant.",
            example="Identifier 3 tendances du marche emploi data local et documenter les arbitrages realises.",
            public_data_idea="Offres d'emploi locales, open data INSEE ou donnees transport Nantes.",
        ),
        "Rigueur": SuggestedAction(
            title="Ajouter une couche qualite a un pipeline data",
            format="mini projet qualite",
            deliverable="tests de donnees + rapport d'anomalies + README des controles",
            description="Prouver la fiabilisation: valeurs manquantes, doublons, formats, coherence et seuils d'alerte.",
            example="Pipeline CSV -> nettoyage -> tests -> rapport Markdown des anomalies detectees.",
            public_data_idea="Jeu de donnees public avec dates, lieux et categories.",
        ),
        "Problem solving": SuggestedAction(
            title="Diagnostiquer une anomalie dans un jeu de donnees",
            format="cas d'enquete data",
            deliverable="notebook ou README avec hypotheses, tests, conclusion et correction proposee",
            description="Rendre visible la demarche: isoler le probleme, verifier les causes, choisir une correction.",
            example="Expliquer pourquoi un KPI varie brutalement apres ingestion de nouvelles donnees.",
        ),
        "Gestion de projet": SuggestedAction(
            title="Planifier un livrable data en mini roadmap",
            format="plan projet",
            deliverable="backlog priorise, jalons, risques, criteres d'acceptation et definition of done",
            description="Montrer le pilotage concret d'un sujet data, de la demande initiale au livrable mesurable.",
            example="Roadmap deux semaines pour livrer un dashboard de suivi des competences demandees.",
        ),
        "Anglais professionnel": SuggestedAction(
            title="Documenter un projet data en anglais",
            format="documentation bilingue",
            deliverable="README anglais + resume francais + glossaire metier/technique",
            description="Prouver l'aisance professionnelle avec une documentation claire, utile et relisible.",
            example="README anglais d'un pipeline data avec setup, usage, data dictionary et limitations.",
        ),
    }
    if skill_name in project_templates:
        return project_templates[skill_name]

    if gap_type == "theorique":
        return SuggestedAction(
            title=f"Revoir les fondamentaux de {skill_name}",
            format="note de synthese",
            deliverable="README court avec definition, exemple et schema",
            description=f"Clarifier {skill_name} avec une definition courte, les principes cles et un mini cas d'usage data.",
            example=f"Documenter un exemple simple de {skill_name} applique a un pipeline analytics ou BI.",
        )
    if gap_type == "outil":
        free_alternative = "DuckDB" if skill_name == "Snowflake" else "Prefect" if skill_name == "Airflow" else None
        return SuggestedAction(
            title=f"Monter un mini cas d'usage {skill_name}",
            format="mini implementation",
            deliverable="repo avec README et preuve d'execution",
            description=f"Mettre en place rapidement {skill_name} sur un cas de donnees publiques avec une preuve de fonctionnement.",
            example=f"Construire un flux minimal autour de {skill_name} puis publier les captures et commandes d'execution.",
            free_alternative=free_alternative,
            public_data_idea="Jeu de donnees transport, energie ou emploi en open data.",
        )
    return SuggestedAction(
        title=f"Prouver {skill_name} par un POC",
        format="mini projet",
        deliverable="repo GitHub avec etapes, code et resultat",
        description=f"Montrer une implementation concretement executable de {skill_name} dans un repo simple.",
        example=f"Realiser un POC focalise sur {skill_name} avec README, scripts et resultat visible.",
        public_data_idea="Utiliser une source open data simple pour produire un cas reproductible.",
    )


def analyze_skill_gaps(job: NormalizedJob, profile: CandidateProfile, job_match_id: str) -> list[SkillGap]:
    profile_skills = {skill.lower() for skill in profile.preferred_skills}
    missing = [skill for skill in job.skills_detected if skill.lower() not in profile_skills]

    gaps: list[SkillGap] = []
    for index, skill in enumerate(missing, start=1):
        gap_type = categorize_gap(skill)
        importance = 78 if gap_type == "outil" else 70
        gaps.append(
            SkillGap(
                id=f"{job_match_id}-gap-{index}",
                job_match_id=job_match_id,
                skill_name=skill,
                gap_type=gap_type,
                importance_score=importance,
                rationale_text=(
                    f"{skill} apparait dans l'offre comme signal utile "
                    "mais n'est pas encore etabli clairement dans le profil cible."
                ),
                suggested_action=build_suggested_action(skill, gap_type),
            )
        )

    return gaps
