# Backlog MVP

## Priorite 1

- Initialiser le projet web et API pour `Render Web Service`
- Ajouter la configuration des sources `France Travail` et `Jooble`
- Creer le schema `Render Postgres` minimal
- Configurer le deploiement `100% Render`
- Implementer la collecte quotidienne
- Configurer le `Render Cron Job`
- Stocker les offres brutes
- Normaliser les offres
- Dedoublonner les annonces

## Priorite 2

- Importer le CV
- Importer la lettre de motivation
- Extraire un profil candidat structure
- Definir un catalogue initial de competences data
- Construire le scoring d'offre
- Afficher les meilleures offres
- Consolider le ciblage `Nantes / Saint-Nazaire` avec preference teletravail ou hybride

## Priorite 3

- Extraire les competences manquantes
- Classer chaque manque en `theorique`, `pratique`, `outil`
- Generer une reponse type selon la categorie
- Proposer des idees de POC
- Suggester des alternatives gratuites aux outils payants
- Brancher pleinement l'analyse `CV + lettre` dans le pipeline Python

## Priorite 4

- Construire le feed quotidien
- Melanger offres, competences, notions et projets
- Ajouter un systeme de priorisation
- Ajouter un historique journalier
- Connecter le feed au job quotidien Render

## Priorite 5

- Ajouter feedback utilisateur sur la pertinence
- Affiner le scoring
- Ajouter tableau de bord de progression
- Ajouter alertes ou automation quotidienne

## Questions ouvertes

- Quel format exact pour importer le CV au MVP : PDF, texte ou Markdown ?
- Veux-tu un seul profil cible ou plusieurs profils avec ponderation ?
- Le scoring doit-il etre explicable regle par regle ou via un modele semantique ?
- Souhaites-tu des candidatures automatisees plus tard, ou seulement de la veille ?

## Prochaine etape recommandee

La meilleure suite a court terme est maintenant de fiabiliser la boucle locale deja en place :

- auditer les offres France Travail retenues sur `Nantes / Saint-Nazaire`
- verifier les skills detectees et les gaps proposes
- brancher l'analyse `CV + lettre` dans le pipeline Python
- relancer ensuite le scoring avec le profil enrichi
- ne passer a `Render` qu'une fois ce flux principal stable

## Skills utiles par phase

Pour garder le projet simple au debut :

- utiliser `project-conventions` des qu'on commence a poser la structure du code
- utiliser `web-app-mvp` lors de l'initialisation du web et des routes serveur
- utiliser `render-runbook` des la configuration du deploiement `100% Render`
- utiliser `debug-playbook` seulement quand un flux, un score, une route ou un deploiement deraille

La feuille de route d'execution detaillee reste geree en interne pour garder le repo public centre sur le produit, l'architecture et la methode.
