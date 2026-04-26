# Specification technique V1

## 1. Objectif

Cette specification transforme le cadrage produit en plan de construction concret pour un MVP
developpe d'abord en local, puis deployee sur `Render`.

Important :

- ce document decrit a la fois la cible V1 et la direction d'architecture
- l'implementation locale actuelle reste plus legere sur certains points, notamment le stockage runtime encore base sur des fichiers JSON partages dans `data/runtime/`
- quand la cible V1 et l'etat local different, la cible reste `PostgreSQL + Render`, tandis que l'etat d'execution detaille est suivi en interne

Le MVP doit permettre de :

- collecter des offres depuis `France Travail` et `Jooble`
- stocker une version brute puis normalisee des offres
- calculer un score explicable par rapport a un profil cible
- identifier des competences manquantes
- afficher un feed web simple et utile

Etat de focalisation actuel :

- zone prioritaire `Nantes` et `Saint-Nazaire`
- preference produit pour les offres avec teletravail partiel ou mode hybride
- connecteur `France Travail` appuye sur des codes de commune stables pour ces zones : `44109` et `44184`

## 2. Principes de construction

Principes retenus pour la V1 :

- developpement `local-first`
- architecture simple a un seul projet web
- logique metier separee des routes HTTP
- scoring explicable regle par regle
- idempotence des imports quotidiens
- stockage `PostgreSQL` compatible local et `Render Postgres`

Hypotheses de V1 :

- un seul utilisateur au MVP
- import manuel du CV et de la lettre
- pas d'authentification dans la premiere version
- pas de recommandation en temps reel
- premiere analyse documentaire visible dans l'app web

## 3. Stack retenue

### Web et API

- `Next.js`
- `TypeScript`
- App Router pour les pages
- Route Handlers pour l'API simple

Pourquoi :

- un seul codebase pour l'interface et l'API
- simple a executer en local
- deploiement facile sur `Render Web Service`

### Base de donnees

- `PostgreSQL`

Mode local recommande :

- `PostgreSQL` local via Docker ou installation locale

Mode cible :

- `Render Postgres`

Etat local actuel :

- le projet garde deja une migration initiale `PostgreSQL`
- mais le runtime local principal du MVP lit et ecrit encore surtout dans `data/runtime/` pour accelerer les iterations sur le web, l'import profil et le pipeline Python
- cette simplification ne change pas la cible V1, elle sert de stockage de travail local avant le branchement complet sur la base

### Scoring et traitement

Option V1 retenue :

- garder `Next.js` et `TypeScript` pour l'application web, les routes API et l'orchestration locale
- autoriser des scripts `Python` pour l'analyse de texte, l'extraction de competences et le scoring si cela simplifie la logique
- conserver des entrees et sorties stables entre les modules `TypeScript` et `Python`

Pourquoi :

- le cadrage produit reste respecte
- le web et l'API restent simples a demarrer
- les traitements metier peuvent evoluer sans forcer une architecture separee trop tot

### Execution planifiee

En local :

- execution manuelle via script ou commande npm
- relance possible aussi depuis l'interface web via `POST /api/run/daily-pipeline`
- relance possible aussi depuis l'interface web via `POST /api/run/offers-refresh`
- l'accueil du web peut relancer le pipeline automatiquement au chargement pour afficher un etat frais sans commande terminal supplementaire
- les runs longs locaux peuvent etre suivis via des statuts de taches stockes dans `data/runtime/tasks/`

En production :

- `Render Cron Job`

## 4. Architecture cible

### Vue logique

1. Un job de collecte recupere les offres.
2. Les payloads sont stockes dans `jobs_raw`.
3. Une phase de normalisation alimente `jobs_normalized`.
4. Le profil candidat est importe et structure.
5. Le moteur de scoring produit `job_matches` et `skill_gaps`, avec prise en compte de la localisation prioritaire et de la preference teletravail.
6. Le generateur de feed produit `daily_feed_items`.
7. L'application web lit ces donnees et affiche le flux.

### Decoupage applicatif recommande

Structure logique recommandee :

- `app/`
  - pages web
  - route handlers API
- `src/domain/`
  - types metier
  - regles de scoring
  - regles de categorisation des manques
- `src/services/`
  - collecte
  - normalisation
  - dedoublonnage
  - generation du feed
- `src/python/` ou `scripts/python/`
  - extraction
  - scoring
  - traitements batch isoles
- `src/db/`
  - schema
  - acces base
  - migrations
- `src/config/`
  - variables d'environnement
- `scripts/`
  - execution locale des jobs

## 5. Workflow local-first

Ordre recommande pour le developpement :

1. monter l'application web avec des donnees fixture
2. creer le schema `PostgreSQL` local
3. implementer le pipeline `raw -> normalized`
4. implementer le scoring explicable
5. generer le feed quotidien
6. brancher les routes API
7. seulement ensuite preparer le deploiement `Render`

Commandes cibles de travail local :

- lancement web local
- lancement des migrations
- import d'un jeu d'offres exemple
- execution manuelle du batch quotidien
- reset de la base de dev

La convention exacte des commandes sera fixee avec le code, mais la spec impose cette separation.

## 6. Schema de donnees V1

### `jobs_raw`

But :

- conserver la reponse brute de la source
- permettre audit et replay

Champs minimaux :

- `id`
- `source`
- `source_job_id`
- `fetched_at`
- `payload_json`
- `checksum`

Contraintes :

- index sur `source`, `source_job_id`
- unicite recommandee sur `source`, `source_job_id`, `checksum`

### `jobs_normalized`

But :

- stocker une representation unifiee de l'offre

Champs minimaux :

- `id`
- `raw_job_id`
- `canonical_job_key`
- `title`
- `company_name`
- `location_text`
- `remote_mode`
- `contract_type`
- `seniority_text`
- `description_text`
- `skills_detected_json`
- `published_at`
- `normalized_at`

Contraintes :

- index sur `canonical_job_key`
- index sur `published_at`

### `candidate_profile`

But :

- stocker le profil cible structure

Champs minimaux :

- `id`
- `target_roles_json`
- `preferred_skills_json`
- `excluded_keywords_json`
- `preferred_locations_json`
- `prefer_remote_friendly`
- `notes`
- `updated_at`

### `candidate_documents`

But :

- conserver les imports manuels utilisateur
- memoriser une analyse documentaire simple exploitable par le feed et le scoring

Champs minimaux :

- `id`
- `document_type`
- `source_filename`
- `content_text`
- `parsed_json`
- `created_at`

### `skills_catalog`

But :

- normaliser les competences et synonymes

Champs minimaux :

- `id`
- `skill_name`
- `skill_category`
- `aliases_json`
- `is_active`

### `job_matches`

But :

- stocker le score d'une offre pour un profil

Champs minimaux :

- `id`
- `job_id`
- `candidate_profile_id`
- `score_global`
- `score_role`
- `score_skills_match`
- `score_stack_fit`
- `score_seniority`
- `score_penalties`
- `score_preference`
- `explanation_json`
- `matched_skills_json`
- `missing_skills_json`
- `computed_at`

Contraintes :

- index sur `job_id`
- index sur `score_global desc`

### `skill_gaps`

But :

- stocker les manques identifies par offre

Champs minimaux :

- `id`
- `job_match_id`
- `skill_name`
- `gap_type`
- `importance_score`
- `rationale_text`
- `suggested_action_json`

Valeurs de `gap_type` :

- `theorique`
- `pratique`
- `outil`

### `daily_feed_items`

But :

- alimenter directement le feed affiche

Champs minimaux :

- `id`
- `feed_date`
- `item_kind`
- `related_job_id`
- `related_job_match_id`
- `title`
- `summary`
- `score`
- `payload_json`
- `rank`
- `created_at`

Valeurs de `item_kind` :

- `offre`
- `competence`
- `notion`
- `projet`

## 7. Endpoints API V1

### `GET /api/health`

But :

- verifier que l'application repond

Reponse :

- statut simple
- version applicative

### `GET /api/feed?date=YYYY-MM-DD`

But :

- recuperer le feed du jour

Reponse :

- liste ordonnee de `daily_feed_items`

### `GET /api/jobs?min_score=...&role=...&source=...`

But :

- lister les meilleures offres filtrees

Reponse :

- offres normalisees avec score resume

### `GET /api/jobs/:id`

But :

- afficher le detail d'une offre et son explication

Reponse :

- offre normalisee
- score detaille
- competences manquantes
- actions recommandees

### `POST /api/profile/documents`

But :

- importer CV ou lettre au MVP, soit par texte colle soit par upload fichier simple
- corriger ensuite les competences detectees quand l'utilisateur identifie un faux positif ou un oubli

Payload :

- `document_type`
- `content_text` si saisie manuelle
- `source_filename`

Formats MVP :

- `CV` : `PDF`, `TXT` ou `Markdown`
- `Lettre` : `TXT`, `Markdown` ou texte colle

Precision implementation actuelle :

- pour les PDF, l'extraction locale essaie maintenant `pdf.js`, puis `pypdf`, puis un fallback heuristique
- la meilleure extraction est retenue selon des metriques de lisibilite
- les PDF scannes ou tres image peuvent encore necessiter une etape OCR ulterieure ou un collage manuel

Transport accepte :

- `application/json` pour le texte brut
- `multipart/form-data` pour l'upload de fichier

### `GET /api/profile`

But :

- lire le profil structure courant

### `POST /api/profile`

But :

- ajouter une competence manuelle au profil cible

### `PATCH /api/profile/documents/skills`

But :

- ajouter ou retirer une competence detectee sur un document candidat
- conserver la correction dans `manual_skill_overrides`
- mettre a jour les signaux exploites par le profil consolide

### `POST /api/run/daily-pipeline`

But :

- declencher manuellement le batch quotidien en local ou en environnement restreint

Important :

- cet endpoint peut rester desactive en production publique
- en local, il remplace le cron pendant le developpement

### `POST /api/run/offers-refresh`

But :

- lancer un rafraichissement asynchrone des offres depuis l'accueil sans bloquer la requete web

Reponse :

- `202 Accepted` avec un `taskId`

Implementation locale actuelle :

- la route cree une tache locale dans `data/runtime/tasks/`
- elle lance ensuite un script Python detache qui met a jour le statut et reecrit le snapshot runtime

### `GET /api/tasks/:id`

But :

- suivre l'etat d'une tache locale de pipeline

Reponse :

- statut `queued`, `running`, `completed` ou `failed`
- etape courante, logs et resultat resume si disponible

## 8. Algorithme de scoring V1

Le scoring reste regle par regle et explicable.

### `score_role` sur 25

Heuristique :

- `25` si le titre correspond clairement a un role cible
- `15` a `20` si le titre est proche
- `5` a `10` si le titre est seulement adjacent
- `0` si le role est trop eloigne

### `score_skills_match` sur 35

Heuristique :

- extraire les competences de l'offre
- comparer au CV, a la lettre et au catalogue interne
- calculer un ratio de couverture

Formule simple :

- `score_skills_match = 35 * taux_de_couverture`

### `score_stack_fit` sur 15

Heuristique :

- verifier l'adequation des outils et technos
- valoriser SQL, Python, ETL, BI, modelisation, cloud data raisonnable

### `score_seniority` sur 10

Heuristique :

- `10` si le niveau semble aligne
- `5` a `8` si l'ecart est recuperable
- `0` a `4` si l'ecart est trop fort

### `score_penalties` sur `-20` a `0`

Heuristique :

- penaliser `SAP`, `ERP` tres specialises, ou stacks tres eloignees
- ne pas exclure brutalement sauf cas explicitement bloques

### `score_preference` sur 15

Heuristique :

- bonus selon preferences de role, localisation, type de contrat ou source
- bonus renforce si l'offre est a `Nantes` ou `Saint-Nazaire` et propose `remote` ou `hybrid`
- bonus intermediaire si l'offre est dans la bonne zone mais reste `onsite`

### Calcul final

`score_global = score_role + score_skills_match + score_stack_fit + score_seniority + score_penalties + score_preference`

### Explication du score

Chaque score doit produire une structure exploitable par l'UI :

- `strengths`
- `missing_skills`
- `penalties`
- `quick_wins`
- `blocking_points`

## 9. Regles de skill gaps

Pour chaque competence manquante :

- `theorique` si la notion semble absente ou fragile
- `pratique` si la notion semble connue mais sans preuve d'execution
- `outil` si un logiciel ou service specifique manque

Chaque gap doit produire :

- une raison courte
- un niveau d'importance
- une action recommandee

Etat local actuel :

- les soft skills explicites sont classees comme gaps pratiques
- les competences outil ou pratique connues peuvent produire un mini-projet dedie plutot qu'une consigne generique
- les suggestions privilegient des livrables verifiables : repo, README, dashboard, notebook, rapport qualite, note decisionnelle ou cadrage projet

## 10. Generation du feed quotidien

Le feed du jour doit contenir un melange :

- d'offres a fort score
- de competences recurrentes
- de notions a revoir
- de projets concrets a realiser

Regle simple de priorisation V1 :

- 50% `offre`
- 20% `competence`
- 15% `notion`
- 15% `projet`

Le detail fin pourra etre ajuste apres observation reelle.

Etat local actuel :

- le web affiche d'abord les `feed_items` produits par le pipeline Python quand ils existent
- le generateur TypeScript historique reste surtout une solution de secours ou de transition
- en pratique, la composition exacte du feed observe depend donc aujourd'hui du resultat du pipeline local plus que d'une repartition statique stricte

## 11. Ecrans principaux V1

### Ecran 1 : Feed quotidien

Contenu :

- en-tete avec date du jour
- bouton de bascule `theme clair / theme sombre` memorise localement
- filtres simples : role, score mini, type de carte, source
- liste de cartes ordonnee

### Ecran 2 : Detail d'une offre

Contenu :

- resume de l'offre
- score global
- decomposition du score
- competences manquantes
- actions recommandees

### Ecran 3 : Import profil

Contenu :

- zone d'import CV
- zone d'import lettre
- chargement fichier ou collage manuel selon le document
- resume du profil extrait
- affichage des skills, roles et zones detectees dans les documents charges

Etat local actuel :

- les documents sont aujourd'hui resumes et qualifies via une analyse agentique baseline locale, deterministe et explicable
- les offres sont analysees avec la meme logique agentique baseline au moment de la normalisation avant scoring
- les competences detectees par document sont editables depuis l'interface profil
- les analyses longues exposent une popup de progression avec les etapes et logs intra-tache

## 12. Maquettes textuelles

### Feed quotidien

```text
+-------------------------------------------------------------+
| Actu Emploi - Feed du jour                                  |
| [Role] [Score mini] [Type] [Source]                         |
+-------------------------------------------------------------+
| Offre - Data Analyst - Score 78                             |
| Entreprise X - France Travail                               |
| Pourquoi: SQL fort, BI present, stack proche                |
| Manques: Airflow, modelisation dimensionnelle               |
+-------------------------------------------------------------+
| Competence - Airflow                                        |
| Observee dans 6 offres cette semaine                        |
| Niveau estime: faible | Impact: eleve                       |
+-------------------------------------------------------------+
| Projet - Pipeline ETL local                                 |
| Duree estimee: 2 jours                                      |
| Livrables: repo GitHub + README + dashboard                 |
+-------------------------------------------------------------+
```

### Detail offre

```text
Titre | Entreprise | Source | Score global

Sous-scores:
- role
- skills match
- stack fit
- seniority
- penalties
- preference

Ce qui aide
Ce qui manque
Ce qui bloque
Ce qui est recuperable vite
```

## 13. Non-objectifs V1

Ne pas faire en premiere iteration :

- authentification
- multi-utilisateur
- automatisation de candidature
- tableaux de bord complexes
- architecture multi-services

## 14. Definition de termine V1

La V1 est suffisante si :

- un developpeur peut lancer l'application en local
- un jeu d'offres test peut etre importe
- le pipeline quotidien peut etre execute manuellement
- le feed affiche des cartes coherentes
- le score est explicable et lisible
- la meme base de donnees peut ensuite etre branchee sur `Render`
