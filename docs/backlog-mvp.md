# Backlog MVP

## Priorite actuelle

- confirmer que `Rafraichir les offres` recharge bien l'accueil et les stats sans reload manuel
- verifier dans l'UI profil et detail d'offre que le snapshot reel expose clairement les documents candidat, les competences communes, les competences manquantes et les gaps
- fiabiliser la lecture du dernier snapshot jusque dans l'UI detail et le feed
- etendre les tests `Vitest` autour des routes runtime, du detail d'offre, du refresh et des helpers critiques

## Priorite moteur

- consolider le catalogue de competences data a partir d'un echantillon plus large d'offres reelles
- mieux dedoublonner les annonces proches ou quasi identiques
- affiner le scoring explicable et les penalties metier sur offres reelles
- mieux distinguer `competence commune`, `competence manquante`, `signal faible` et `zone d'incertitude`
- garder une baseline heuristique simple, rapide et explicable
- preparer une seconde passe `LLM` controlee pour depasser le plafond heuristique sur les equivalences implicites et les preuves indirectes
- definir les garde-fous de cette future passe `LLM` : sortie structuree, comparaison a la baseline, score de confiance, auto-verification et fallback propre

## Priorite produit

- enrichir le feed quotidien avec un meilleur mix entre offres, competences, notions et quick wins
- ameliorer la restitution UI des competences communes et manquantes
- ajouter un historique journalier lisible
- ajouter des retours utilisateur sur la pertinence des offres et des analyses
- commencer un tableau de bord de progression simple

## Priorite deploiement

- finaliser le chemin `100% Render` une fois le flux local stabilise
- brancher proprement `Render Web Service` et `Render Cron Job`
- verifier la strategie `Postgres` cible par rapport au runtime local actuel
- clarifier la place de `Jooble` : source secondaire facultative ou retiree du MVP
- durcir les verifications d'exploitation : healthcheck, logs, reruns et diagnostic simple

## Fondations deja posees

Ces chantiers ne sont plus la priorite immediate, car ils existent deja partiellement ou largement dans le repo :

- projet web `Next.js` et routes API
- source `France Travail` active en run reel
- schema `Postgres` minimal
- pipeline Python de normalisation, filtrage, scoring et generation du feed
- cible `100% Render` deja documentee
- injection des documents candidat dans le snapshot runtime, avec `document_skills` alimentees depuis le CV et la lettre

## Questions ouvertes

- Quel format exact pour importer le CV au MVP : PDF, texte ou Markdown ?
- Veux-tu un seul profil cible ou plusieurs profils avec ponderation ?
- Le scoring doit-il etre explicable regle par regle ou via un modele semantique ?
- Souhaites-tu des candidatures automatisees plus tard, ou seulement de la veille ?

## Prochaine etape recommandee

La meilleure suite a court terme est maintenant de fiabiliser la boucle locale deja en place :

- auditer les offres France Travail retenues sur `Nantes / Saint-Nazaire`
- verifier dans l'interface que le CV, la lettre, les skills detectees et les gaps proposes sont bien lisibles sur le snapshot reel mis a jour
- etendre la couverture de tests aux routes runtime et aux helpers critiques ajoutes recemment
- ne passer a `Render` qu'une fois ce flux principal stable

## Skills utiles par phase

Pour garder le projet simple au debut :

- utiliser `project-conventions` des qu'on commence a poser la structure du code
- utiliser `web-app-mvp` lors de l'initialisation du web et des routes serveur
- utiliser `render-runbook` des la configuration du deploiement `100% Render`
- utiliser `debug-playbook` seulement quand un flux, un score, une route ou un deploiement deraille

La feuille de route d'execution detaillee reste geree en interne pour garder le repo public centre sur le produit, l'architecture et la methode.
