# Actu Emploi

Veille emploi personnalisee pour profils data.

L'application collecte des offres, les compare a un profil candidat, explique les matchs, repere les competences manquantes et propose des actions concretes pour progresser.

## MVP

- cible initiale : `Data Analyst`, `Data Scientist`, `Data Engineer`
- zone prioritaire : Nantes, Saint-Nazaire, hybride et remote
- ingestion quotidienne d'offres, d'abord via France Travail
- import manuel du CV et de la lettre de motivation
- extraction et correction manuelle des competences candidat
- scoring explicable, gaps de competences et mini-projets associes
- feed web quotidien avec cartes `offre`, `competence`, `notion` et `projet`
- deploiement cible : Render Web Service, Render Cron Job et Render Postgres

Jooble reste desactive tant qu'aucune API officielle stable avec cle n'est configuree.

## Stack

- `Next.js + TypeScript` : interface web, routes API et orchestration locale
- `Python` : ingestion, analyse de texte, scoring et generation du feed
- `PostgreSQL` : stockage V1

Le repo contient deja le feed web MVP, les endpoints V1, le pipeline Python local, les fixtures et la migration initiale `src/db/migrations/0001_init.sql`.

## Demarrage local

```bash
npm install
npm run dev
```

`npm run dev` lance Next.js avec le wrapper local qui nettoie les taches Python actives au `Ctrl+C`.

Copier `.env.example` vers `.env`, puis ajuster surtout :

- `DATABASE_URL`
- `PYTHON_EXECUTABLE` si Python n'est pas detecte automatiquement
- `ACTU_EMPLOI_USE_FIXTURES=0` pour activer la collecte reelle
- `ENABLE_FRANCE_TRAVAIL=1`
- `DEFAULT_SEARCH_LOCATION` et `DEFAULT_SEARCH_LOCATION_LABEL`

## Commandes utiles

```bash
npm run dev:bg          # serveur local en arriere-plan
npm run dev:status      # statut du serveur local
npm run dev:stop        # arret du serveur local
npm run pipeline:run    # pipeline Python local
npm run lint            # lint JS/TS
npm run typecheck       # verification TypeScript
npm run test:ts         # tests Vitest
npm run build           # build Next.js
```

Commandes LLM/taches longues, utiles en debug local :

```bash
npm run tasks:status
npm run tasks:stop
npm run llm:ps
npm run llm:stop
```

Le petit LLM local via Ollama est optionnel. La baseline deterministe reste disponible quand `LIGHTWEIGHT_LLM_ENABLED=0`.

## Documentation

- [Cadrage produit](docs/cadrage-produit.md)
- [Backlog MVP](docs/backlog-mvp.md)
- [Specification technique V1](docs/spec-technique-v1.md)
- [Architecture agentique MVP](docs/agentic-mvp.md)
- [IA et methode de travail](docs/ai-workflow.md)
