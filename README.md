# Actu Emploi

Application de veille emploi personnalisee pour les profils data.

Actu Emploi analyse des offres, les compare au profil candidat, detecte les ecarts de competences et propose des actions concretes pour progresser.

## Objectif

- faire ressortir les offres les plus pertinentes
- expliquer pourquoi une offre matche ou non
- identifier les competences manquantes
- transformer les ecarts en notions, exercices ou mini-projets

La cible initiale couvre les profils `Data Analyst`, `Data Scientist` et `Data Engineer`, avec une priorite sur Nantes, Saint-Nazaire, l'hybride et le remote.

## MVP

Le MVP reste volontairement simple :

- ingestion quotidienne d'offres, d'abord via France Travail
- import manuel du CV et de la lettre de motivation
- extraction locale des competences depuis les documents et les offres
- correction manuelle des competences detectees par document candidat
- scoring explicable entre profil candidat et annonces
- detection des gaps de competences
- soft skills detectees et rapprochees comme des signaux utiles du profil
- mini-projets concrets proposes pour les competences manquantes
- feed web quotidien avec cartes `offre`, `competence`, `notion` et `projet`
- deploiement cible `100% Render`

Jooble n'est envisage que via une API officielle stable avec cle.

## Architecture

- `Next.js + TypeScript` pour l'interface web et les routes API
- `Python` pour l'ingestion, l'analyse, le scoring et les gaps
- `PostgreSQL` pour le stockage V1
- `Render Web Service`, `Render Cron Job` et `Render Postgres` pour l'hebergement MVP

Le projet contient deja un feed web MVP, des endpoints V1, un pipeline Python local, des fixtures et une migration initiale dans `src/db/migrations/0001_init.sql`.

## Demarrage local

```bash
npm install
npm run dev
```

`npm run dev` intercepte `Ctrl+C` pour arreter les taches Python actives et decharger le modele LLM. `npm run dev:next` lance Next directement, sans nettoyage automatique.

Commandes utiles :

- `npm run dev:bg` : lancer le serveur local en arriere-plan avec PID suivi
- `npm run dev:status` : verifier si le port local est occupe
- `npm run dev:stop` : arreter le serveur local suivi
- `npm run lint` : lint JS/TS
- `npm run typecheck` : verification TypeScript
- `npm run test:ts` : tests Vitest
- `npm run build` : build Next.js
- `npm run pipeline:run` : pipeline Python en mode fixture
- `npm run llm:ps` : voir les modeles Ollama charges en GPU/CPU
- `npm run llm:stop` : decharger le modele LLM configure et liberer la VRAM
- `npm run tasks:status` : voir les analyses Python encore actives
- `npm run tasks:stop` : arreter les analyses actives puis decharger le LLM
- `npm run agentic:evaluate` : evaluation de la baseline agentique
- `npm run agentic:runtime` : detection GPU AMD/CPU pour les mini-agents LLM

## Analyse agentique locale

Le flux agentique reste controle et observable :

- les documents candidat sont analyses au chargement
- les offres sont analysees pendant la normalisation
- les competences detectees peuvent etre ajoutees ou retirees depuis la page profil
- les soft skills comme `Communication`, `Collaboration`, `Rigueur`, `Autonomie` ou `Problem solving` sont detectees comme des competences utiles
- les ecarts de competences produisent des actions concretes, notamment des mini-projets realisables et documentables
- chaque analyse longue expose une popup de progression avec les etapes intra-tache de l'agent

Les mini-agents peuvent utiliser un petit LLM local via Ollama. Le modele configure par defaut est `qwen2.5:3b`, avec baseline deterministe en fallback. `LIGHTWEIGHT_LLM_KEEP_ALIVE=0` permet de liberer le modele apres usage, et `npm run llm:stop` force le dechargement si besoin.

## Configuration

Copier `.env.example` vers `.env`, puis ajuster si besoin :

- `PYTHON_EXECUTABLE` si Python n'est pas detecte automatiquement
- `ACTU_EMPLOI_USE_FIXTURES=0` pour activer la collecte reelle
- `ENABLE_FRANCE_TRAVAIL=1` pour le connecteur stable par defaut
- `ENABLE_JOOBLE=0` tant qu'aucune API officielle n'est configuree
- `DEFAULT_SEARCH_LOCATION` et `DEFAULT_SEARCH_LOCATION_LABEL` pour la zone cible

Les connecteurs publics sont limites en volume, cadences et caches localement pour eviter les appels inutiles.

## Documents utiles

- [IA et methode de travail](docs/ai-workflow.md)
- [Cadrage produit](docs/cadrage-produit.md)
- [Backlog MVP](docs/backlog-mvp.md)
- [Specification technique V1](docs/spec-technique-v1.md)
- [Architecture agentique MVP](docs/agentic-mvp.md)

## Skills projet

Les skills repo-local dans `.agents/skills/` cadrent les conventions, le debug, Render et l'architecture agentique :

- `project-conventions`
- `render-runbook`
- `debug-playbook`
- `agentic-architecture`
