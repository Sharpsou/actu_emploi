# Actu Emploi

Application de veille emploi personnalisee pour les profils data.

## Objectif

Construire un produit capable d'analyser le marche de l'emploi data pour :

- faire ressortir les offres les plus pertinentes
- identifier les competences manquantes
- mettre en lumiere les technologies les plus demandees
- transformer ces ecarts en actions concretes : notions a revoir, competences a acquerir et mini projets a realiser

Le systeme s'appuie sur les offres du marche, le CV, la lettre de motivation et un referentiel de competences ciblees.

## Vision produit

`Actu Emploi` est pense comme un flux quotidien de veille et de progression.

L'idee n'est pas seulement de recommander des annonces, mais de rendre visible :

- pourquoi une offre est pertinente
- ce qui manque pour mieux y correspondre
- ce qui peut etre travaille rapidement

Le produit explore aussi une logique d'agent pour analyser plus finement le profil candidat et les offres afin d'ameliorer la pertinence du matching et de l'analyse des ecarts.

## Ce que le projet demontre

Ce projet montre ma capacite a :

- cadrer un produit a partir d'un besoin concret de marche
- transformer des offres d'emploi en signal exploitable
- relier analyse metier, logique de scoring et experience utilisateur
- utiliser l'IA comme levier de production tout en gardant le controle sur les decisions
- construire rapidement un MVP avec des outils et des standards actuels

## Cible initiale

Profils :

- Data Analyst
- Data Scientist
- Data Engineer

Zone de recherche prioritaire actuelle :

- Nantes
- Saint-Nazaire
- avec preference pour les offres `hybrid` ou `remote`

Exclusions souhaitees :

- offres purement noSQL quand elles s'eloignent du coeur data vise
- offres ERP trop specialisees
- stacks proprietaires tres specifiques comme SAP si elles ne correspondent pas au projet de carriere

## Fonctionnement attendu

1. Recuperer les offres chaque jour.
2. Normaliser et dedoublonner les annonces.
3. Filtrer les offres selon le profil cible, la zone prioritaire et la preference teletravail.
4. Comparer les offres au CV et a la lettre de motivation.
5. Produire un score de proximite pour chaque offre.
6. Detecter les competences manquantes.
7. Classer chaque manque en `theorique`, `pratique` ou `outil`.
8. Generer une action concrete pour combler chaque manque.
9. Afficher le tout dans un fil d'actualite web.

## MVP recommande

Le MVP reste volontairement simple :

- ingestion `France Travail`
- ajout de `Jooble` uniquement via API officielle stable
- import manuel du CV en PDF ou texte
- import manuel de la lettre de motivation en texte, Markdown ou collage
- extraction simple des competences depuis les offres
- premiere analyse locale du CV et de la lettre visible dans l'app web
- alignement CV/lettre et offres via un pipeline Python a regles explicables
- scoring de pertinence des offres
- analyse des ecarts de competences
- deploiement `100% Render`
- feed quotidien web avec 4 types de cartes :
  - offre
  - competence
  - notion
  - projet

## Documents utiles

- [IA et methode de travail](D:/prog/actu_emploi/docs/ai-workflow.md)
- [Cadrage produit](D:/prog/actu_emploi/docs/cadrage-produit.md)
- [Backlog MVP](D:/prog/actu_emploi/docs/backlog-mvp.md)
- [Specification technique V1](D:/prog/actu_emploi/docs/spec-technique-v1.md)

## Skills projet

Le projet embarque des skills repo-local dans `.agents/skills/` pour cadrer le MVP et rendre l'usage de l'IA plus reproductible :

- `project-conventions` pour les conventions de code, de structure et de decoupage
- `render-runbook` pour le deploiement et l'exploitation `100% Render`
- `debug-playbook` pour diagnostiquer rapidement un bug ou un incident

La logique derriere ces skills et leur role dans le projet sont presentes dans [docs/ai-workflow.md](D:/prog/actu_emploi/docs/ai-workflow.md).

## Etat actuel du squelette local

Le projet repose aujourd'hui sur une architecture hybride simple :

- `Next.js + TypeScript` pour l'interface web, les pages et les routes API
- `Python` pour la collecte d'offres, l'extraction de competences, le scoring et l'analyse des gaps
- `PostgreSQL` comme cible de stockage V1, avec une migration initiale deja posee dans `src/db/migrations/0001_init.sql`

Le socle deja present dans le repo inclut :

- un feed web MVP dans `app/`
- les endpoints V1 dans `app/api/`
- des types metier et services locaux dans `src/`
- un pipeline Python local dans `src/python/actu_emploi_pipeline/`
- un stockage local de travail pour le profil, les documents et la sortie du pipeline
- des fixtures pour commencer avant de brancher les vraies APIs

## Import PDF et analyse locale

- le profil accepte `TXT`, `Markdown` et `PDF` pour le CV, avec collage manuel en secours
- l'extraction PDF essaie maintenant plusieurs strategies locales : `pdf.js`, puis `pypdf`, puis un fallback heuristique
- la meilleure extraction est choisie selon des metriques de lisibilite au lieu de prendre le premier resultat non vide
- si un PDF a ete importe avant ce renforcement, il faut le reimporter pour profiter de la nouvelle extraction
- les PDF scannes ou tres image peuvent encore necessiter une etape OCR ulterieure ou un collage manuel

- le produit fonctionne actuellement sur une logique heuristique basee sur l'extraction locale et les mots-cles
- le CV et la lettre enrichissent le profil via les skills, roles et zones detectees
- le scoring et les gaps des offres se basent sur les competences detectees et les regles explicables du pipeline Python

## Sources envisagees

- France Travail
- Jooble via API officielle uniquement si une cle est disponible

## Decision d'hebergement

Le projet part sur une architecture `100% Render` pour le MVP :

- `Render Web Service` pour l'application web et l'API
- `Render Cron Job` pour la collecte quotidienne et la generation du feed
- `Render Postgres` pour le stockage

Budget cible :

- version minimale durable : environ `7 USD/mois`
- version plus confortable avec web service payant : environ `14 USD/mois`

- le developpement initial peut se faire entierement en local
- l'application web, les routes API, le scoring et les tests peuvent etre verifies avant tout deploiement
- `Render` est la cible d'hebergement du MVP, pas un prerequis pour commencer a construire le produit

## Demarrage local

Commandes principales :

- `npm run dev` pour lancer l'application web
- `npm run lint` pour verifier le lint JS/TS avec `ESLint 9`
- `npm run test:ts` pour executer les tests `Vitest` des routes et services TypeScript
- `npm run typecheck` pour verifier le typage TypeScript
- `npm run build` pour verifier le build Next.js
- `npm run pipeline:run` pour executer le pipeline Python de collecte/analyse en mode fixture

Variables d'environnement principales :

- copier `.env.example` vers `.env` pour le web et la config base
- definir `PYTHON_EXECUTABLE` si Python n'est pas detecte automatiquement
- definir `ACTU_EMPLOI_USE_FIXTURES=0` pour activer les connecteurs publics sans credentials
- laisser `ENABLE_FRANCE_TRAVAIL=1` et `ENABLE_JOOBLE=0` pour la configuration stable par defaut
- `ACTU_EMPLOI_USE_FIXTURES=0` dans `.env` active la collecte France Travail reelle
- ajuster au besoin `PUBLIC_REQUEST_DELAY_SECONDS`, `PUBLIC_MAX_JOBS_PER_ROLE`, `PUBLIC_MAX_REQUESTS_PER_SOURCE`, `PUBLIC_CACHE_TTL_SECONDS`, `DEFAULT_SEARCH_LOCATION`, `DEFAULT_SEARCH_LOCATION_LABEL`, `FRANCE_TRAVAIL_SEARCH_URL`, `FRANCE_TRAVAIL_SEARCH_RADIUS_KM`, `FRANCE_TRAVAIL_SEARCH_SORT` et `JOOBLE_SEARCH_URL`

Notes techniques utiles :

- le web n'est pas un projet Python
- le batch metier, lui, peut avantageusement etre fait en Python
- cette separation permet de garder le front simple tout en commencant vite l'ingestion et l'analyse
- aujourd'hui, l'orchestration locale web -> Python est en place
- le connecteur France Travail public est active par defaut
- le connecteur Jooble public est desactive par defaut car l'acces HTML retourne frequemment `403 Forbidden`
- Jooble ne doit etre reactive que via une voie officielle stable, idealement leur API avec cle
- ces connecteurs publics sont volontairement limites en volume et en cadence pour rester prudents
- la recherche France Travail part par defaut sur `France` (`99100`) pour eviter les faux negatifs lies a une ville trop restrictive
- pour des recherches locales plus fiables, le projet sait maintenant utiliser des codes de commune `France Travail`, notamment `Nantes = 44109` et `Saint-Nazaire = 44184`
- les appels externes utilisent un cache disque local pour eviter de repeter inutilement les memes requetes
- ils ont un plafond strict de requetes par source et par run, en plus d'un delai entre deux appels reseau
- ils sont plus fragiles que des APIs officielles et peuvent casser si le HTML ou le balisage schema.org change
