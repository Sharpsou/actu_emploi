# IA et methode de travail

## Comment j'utilise l'IA

Sur ce projet, j'utilise l'IA comme un accelerateur de conception, de structuration et d'execution.

J'explore aussi une logique d'agent capable d'analyser le CV, les documents candidat et les offres afin de rendre le produit plus pertinent dans sa lecture du marche et dans l'identification des ecarts de competences.

Elle m'aide a :

- clarifier rapidement un probleme produit
- transformer une idee en backlog ou en architecture de travail
- produire une premiere version de code ou de documentation
- analyser plus vite une anomalie ou un point de blocage
- assister l'analyse croisee entre profil candidat et attentes des offres

L'objectif n'est pas de deleguer integralement le projet a un assistant, mais d'aller plus vite sur les taches repetitives et de garder plus de temps pour les decisions a forte valeur.

## Pourquoi j'ai cree des skills locaux

Le repo contient des `skills` locaux dans `.agents/skills/`.

Je les ai crees pour encadrer l'usage de l'IA avec des regles adaptees au projet, plutot que de repartir de zero a chaque session.

Ces skills servent a rappeler :

- les priorites du MVP
- les conventions de structure du repo
- la methode de debug
- les contraintes de deploiement et d'exploitation

Ils me permettent de garder un cadre coherent entre produit, code, documentation et execution.

## Ce qu'ils m'aident a fiabiliser

Ces skills ne servent pas seulement a accelerer.
Ils servent aussi a rendre le travail plus stable et plus reproductible.

Ils m'aident a fiabiliser :

- la coherence entre le cadrage produit et l'implementation
- la qualite des decisions d'architecture
- la lisibilite du code et des docs
- la methode de diagnostic quand un bug apparait
- la continuite du projet d'une session a l'autre

Dans le cadre de `Actu Emploi`, cela permet de construire un produit qui identifie les competences manquantes, fait ressortir les technologies les plus demandees par le marche et transforme ces ecarts en actions concretes, tout en avancant vite avec des outils et des standards actuels.

L'idee d'operer un agent sur ce produit va dans le meme sens : analyser de facon plus consistente le CV, la lettre et les offres pour mieux faire remonter les competences attendues, les technologies visibles sur le marche et les points de progression les plus utiles.

## Ou reste mon jugement humain

L'IA propose.
Je tranche.

Je garde sous controle humain :

- le probleme a resoudre et le niveau d'ambition du produit
- les arbitrages entre vitesse, simplicite et robustesse
- les choix de stack, de structure et de deploiement
- les regles metier, notamment le scoring et l'analyse des ecarts
- le niveau de confiance accorde aux analyses produites par l'agent
- la relecture finale du code, des tests et de la documentation
- ce qui merite ou non d'etre expose publiquement dans le portfolio

Autrement dit, l'IA est un outil d'acceleration.
La responsabilite du resultat, elle, reste entierement humaine.
