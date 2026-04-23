# Cadrage produit

## 1. Probleme a resoudre

La recherche d'emploi data demande de :

- surveiller beaucoup d'offres
- evaluer rapidement si elles correspondent au profil
- comprendre les competences qui bloquent
- savoir comment combler chaque manque de facon concrete

L'objectif du produit est de transformer cette veille en un fil d'actualite personnalise et actionnable.

## 2. Proposition de valeur

Chaque jour, l'utilisateur recoit :

- les meilleures offres alignees avec son profil
- les competences les plus souvent demandees mais encore fragiles
- des explications courtes sur les notions a maitriser
- des idees de POC ou mini projets pour prouver sa capacite rapidement

Le produit ne se limite donc pas a recommander des annonces. Il aide aussi a progresser vers les annonces visees.

## 3. Cas d'usage principal

### Entrants

- flux d'offres d'emploi
- CV
- lettre de motivation
- preferences de filtrage

### Sortants

- classement des offres par proximite
- justification du score
- liste des competences manquantes
- categorisation du manque :
  - theorique
  - pratique
  - outil
- suggestion d'action associee :
  - theorie : definition + exemple
  - pratique : POC concret a realiser
  - outil : mini implementation ou equivalent gratuit

## 4. Regles metier initiales

### Profils cibles

- Data Analyst
- Data Scientist
- Data Engineer

### Signaux positifs

- SQL
- Python
- ETL / ELT
- modelisation de donnees
- BI
- statistiques
- machine learning si coherent avec le profil
- cloud data selon niveau de complexite

### Signaux de rejet ou de baisse de score

- ERP tres specialises
- SAP si central dans l'offre
- stacks trop eloignees des roles data cibles
- annonces focalisees sur de l'administration applicative plutot que sur la data

Important : un filtre strict sur certains mots-cle peut produire des faux negatifs. Pour le MVP, mieux vaut utiliser une logique de penalite que d'exclusion totale, sauf cas explicitement bloques.

## 5. Modele de scoring propose

Score global sur 100, compose de :

- `score_role` sur 25
  - proximite du titre de poste avec les roles cibles
- `score_skills_match` sur 35
  - competences presentes dans l'offre et retrouvees dans le CV/LM
- `score_stack_fit` sur 15
  - adequation des outils et technos
- `score_seniority` sur 10
  - ecart entre l'experience demandee et le profil
- `score_penalties` sur -20 a 0
  - penalites pour SAP, ERP tres specifiques, ou techno trop hors cible
- `score_preference` sur 15
  - bonus selon preferences utilisateur

### Explication du score

Chaque offre doit afficher :

- pourquoi elle est bien classee
- ce qui manque
- ce qui est bloquant
- ce qui est recuperable rapidement

## 6. Analyse des competences manquantes

Le systeme compare :

- competences detectees dans l'offre
- competences prouvees par le CV
- competences suggerees par la lettre de motivation

Puis il affecte chaque manque a une categorie.

### A. Theorique

Definition :
La notion semble demandee mais l'utilisateur ne montre pas encore une maitrise claire du concept.

Sortie attendue :

- definition simple
- pourquoi c'est utile
- exemple pratique court

Exemples :

- partitionnement de donnees
- validation croisee
- dimensionnement d'un entrepot de donnees

### B. Pratique

Definition :
La competence est connue en theorie, mais l'offre attend une preuve d'execution.

Sortie attendue :

- idee de POC
- etapes minimales
- livrables GitHub
- jeu de donnees public conseille

Exemples :

- pipeline ETL avec orchestration
- dashboard KPI complet
- modele de prevision avec suivi des metriques

### C. Outil

Definition :
L'annonce exige un logiciel, service ou framework peu ou pas maitrise.

Sortie attendue :

- equivalent gratuit si outil payant
- mini cas d'usage reproductible
- preuve possible dans un repo

Exemples :

- `Airflow` ou equivalent leger
- `Snowflake` remplace pour apprentissage par `DuckDB` + `dbt`
- `Power BI` remplace partiellement par `Metabase` ou `Apache Superset`

## 7. Fil d'actualite quotidien

L'interface web doit fonctionner comme un flux editorial.

### Types de cartes

- `Offre`
  - titre
  - entreprise
  - source
  - score
  - resume
  - competences manquantes

- `Competence`
  - competence observee dans plusieurs offres
  - importance
  - tendance de demande
  - niveau estime actuel

- `Notion`
  - definition simple
  - exemple d'usage
  - lien avec des offres concretes

- `Projet`
  - mini POC recommande
  - duree estimee
  - outils
  - donnees publiques conseillees
  - livrables attendus

### Logique de priorisation

Le flux du jour doit melanger :

- nouveaute des offres
- proximite avec le profil
- recurrence d'une competence manquante
- facilite a combler le manque
- impact estime sur l'employabilite

## 8. Architecture MVP proposee

Decision de cadrage :
Le MVP sera heberge en `100% Render`.

Important :

- le developpement initial peut etre realise entierement en local
- l'application web, l'API, le scoring et les tests peuvent etre verifies avant tout deploiement
- `Render` reste la cible d'hebergement du MVP, pas un prerequis pour commencer le developpement

### Backend

- API web simple
- application backend deployee sur `Render Web Service`
- tache quotidienne de collecte via `Render Cron Job`
- moteur de normalisation
- moteur de scoring
- moteur d'analyse des ecarts
- generateur de recommandations

### Frontend

- frontend servi depuis le meme projet Render pour limiter la complexite
- page de login plus tard
- au MVP : interface simple avec feed filtre
- filtres par role, score, type de carte, source

### Stockage

Base cible :

- `Render Postgres`

Tables principales :

- `jobs_raw`
- `jobs_normalized`
- `skills_catalog`
- `candidate_profile`
- `candidate_documents`
- `job_matches`
- `skill_gaps`
- `daily_feed_items`

## 9. Pipeline de donnees

1. Collecte des offres via APIs.
2. Sauvegarde brute.
3. Normalisation :
   - titre
   - entreprise
   - localisation
   - description
   - competences detectees
4. Dedoublonnage.
5. Scoring vs profil candidat.
6. Extraction des manques.
7. Generation des cartes du feed.

## 10. Choix techniques recommandes pour commencer

Stack retenue pour le MVP :

- `Render Web Service` pour l'application
- `Render Cron Job` pour le batch quotidien
- `Render Postgres` pour la base de donnees
- `Next.js` pour le web
- routes serveur `Next.js` ou `FastAPI` pour l'API
- `PostgreSQL` pour le MVP
- `Python` pour l'analyse de texte et le scoring
- planification quotidienne via Render

Pourquoi ce choix :

- une seule plateforme d'hebergement
- exploitation simple
- deploiement web + batch + base dans le meme environnement
- cout maitrise pour un projet personnel

Budget cible :

- `7 USD/mois` en version minimale durable :
  - `Render Cron Job` : minimum `1 USD/mois`
  - `Render Postgres Basic-256mb` : `6 USD/mois`
  - `Render Web Service Free` si l'on accepte la mise en veille
- `14 USD/mois` en version plus confortable :
  - `Render Web Service Starter` : `7 USD/mois`
  - `Render Cron Job` : minimum `1 USD/mois`
  - `Render Postgres Basic-256mb` : `6 USD/mois`

Recommendation initiale :

- commencer avec `Web Service Free` si l'app reste un usage personnel
- passer en `Starter` si le temps de reveil devient genant

## 11. Points de vigilance

- conditions d'utilisation des APIs
- quota et pagination
- qualite variable des descriptions d'offres
- faux positifs sur l'extraction de competences
- ne pas sur-vendre un niveau de maitrise inexistant
- expliquer clairement qu'une recommandation n'est pas une garantie d'embauche
- le `Render Web Service Free` se met en veille apres inactivite
- le `Render Postgres Free` n'est pas retenu car il expire apres 30 jours

## 12. Ordre de construction recommande

### Phase 1

- initialiser le projet en local
- brancher les 2 sources
- stocker les offres dans une base de travail compatible avec `PostgreSQL`
- dedoublonner
- afficher une liste simple

Puis :

- preparer le deploiement sur Render
- brancher `Render Postgres`
- configurer les services cibles

### Phase 2

- importer CV + lettre
- definir le profil utilisateur normalise
- scorer les offres

### Phase 3

- analyser les competences manquantes
- produire notions et projets

### Phase 4

- construire le feed quotidien type actualite
- ajouter filtres et explications
- brancher le `Render Cron Job` de production

## 13. Definition d'un bon MVP

Le MVP est reussi si, chaque matin, l'utilisateur peut :

- voir 10 a 30 offres pertinentes triees
- comprendre pourquoi elles sont pertinentes
- identifier 3 a 5 lacunes prioritaires
- recevoir 1 a 3 actions concretes pour progresser
