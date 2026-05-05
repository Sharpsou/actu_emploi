# Actu Emploi

Actu Emploi est un petit projet de veille emploi pour les profils data.

L'objectif est simple : partir d'offres reelles, les comparer a un profil candidat, puis faire ressortir les annonces interessantes, les competences qui reviennent souvent et les sujets a travailler en priorite.

Le projet sert aussi de terrain d'apprentissage autour du `vibes coding` : avancer vite avec l'IA, mais en gardant une structure claire, des choix explicables et du code que l'on peut reprendre sans repartir de zero.

## A quoi ca sert ?

- suivre les offres Data Analyst, Data Scientist et Data Engineer
- filtrer par zone, teletravail et pertinence metier
- analyser un CV et une lettre de motivation
- detecter les ecarts entre le profil et les offres
- transformer ces ecarts en actions concretes : notions a revoir, outils a pratiquer, mini-projets a faire
- afficher le resultat dans un feed web quotidien

Aujourd'hui, le projet vise surtout Nantes et Saint-Nazaire, avec une preference pour les offres hybrides ou remote.

## Stack

- `Next.js + TypeScript` pour l'application web
- `Python` pour la collecte, l'analyse, le scoring et les ecarts de competences
- `PostgreSQL` comme cible de stockage
- `Render` comme piste d'hebergement du MVP

## Installation

Pre-requis :

- Node.js 20+
- Python 3.11+
- npm

Installer les dependances web :

```bash
npm install
```

Preparer la configuration :

```bash
cp .env.example .env
```

Installer le pipeline Python en local :

```bash
python -m venv .venv
.venv/Scripts/activate
pip install -e .
```

Sur macOS/Linux, l'activation de l'environnement Python se fait plutot avec :

```bash
source .venv/bin/activate
```

Lancer l'application :

```bash
npm run dev
```

Puis ouvrir :

```text
http://localhost:3000
```

## Commandes utiles

```bash
npm run dev
npm run pipeline:run
npm run lint
npm run typecheck
npm run test:ts
npm run build
```

Par defaut, le projet peut utiliser les connecteurs publics prudents. Pour travailler sans dependre du reseau, repasser `ACTU_EMPLOI_USE_FIXTURES=1` dans `.env`.

## Se l'approprier

Les premiers endroits a modifier :

- `.env` pour la ville, les volumes de collecte et les connecteurs
- `data/profile/` pour adapter le profil candidat
- `src/python/actu_emploi_pipeline/skills_catalog.py` pour ajuster les competences suivies
- `src/python/actu_emploi_pipeline/analysis/scoring.py` pour changer la logique de score
- `app/` pour faire evoluer le feed web

Le projet est volontairement garde assez simple : l'idee est de pouvoir comprendre le flux complet, changer une regle, relancer le pipeline et voir l'effet dans l'interface.

## Docs utiles

- [Cadrage produit](docs/cadrage-produit.md)
- [Backlog MVP](docs/backlog-mvp.md)
- [Specification technique V1](docs/spec-technique-v1.md)
- [IA et methode de travail](docs/ai-workflow.md)
- [Guide de reprise](docs/guide-reprise-projet.md)

## Licence

MIT. Voir [LICENSE](LICENSE).
