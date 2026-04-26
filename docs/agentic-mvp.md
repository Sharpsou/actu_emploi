# MVP agentique controle

## Objectif

Le MVP agentique analyse les documents candidat au chargement, analyse les offres a la normalisation, puis compare les deux pour produire une analyse observable :

- competences visibles dans le profil
- competences demandees par l'offre
- confrontation competence par competence
- statut `acquis`, `survol`, `formation` ou `mini_projet`
- score de confiance
- traces des taches agents
- traces des appels MCP controles

Cette premiere version garde une baseline deterministe et peut appeler un petit LLM local pour enrichir l'extraction ou la confrontation. La baseline reste le garde-fou si le LLM echoue ou renvoie une sortie insuffisante.

## Flux d'execution

1. Au chargement du CV ou de la lettre, `cv-skill-extractor` produit les competences, preuves et signaux profil.
2. L'utilisateur peut ajouter ou retirer les competences detectees sur chaque document si l'agent s'est trompe ou a manque un signal.
3. Au chargement ou a la normalisation des offres, `job-requirement-extractor` produit les competences demandees.
4. Le scoring utilise ensuite ces analyses agentiques comme source de competences.
5. Le pipeline preconfronte chaque offre scoree avec les documents candidat corriges et stocke `agentic_analysis` dans chaque job du snapshot.
6. La page detail d'une offre affiche directement cette confrontation CV/offre.
7. L'analyse CV/offre detaillee peut encore etre relancee depuis une offre pour produire un run observe avec traces MCP.
8. Le run est ecrit dans `data/runtime/agent-runs/`.
9. Le dashboard `/agents` affiche les runs, taches, appels MCP et confrontations.

## Agents MVP

- `mcp-profile-reader` lit les documents candidat en mode read-only.
- `mcp-job-reader` lit l'offre normalisee en mode read-only.
- `cv-skill-extractor` extrait les competences du profil.
- `job-requirement-extractor` extrait les competences demandees par l'offre.
- `skill-gap-classifier` confronte profil et offre.
- `deterministic-controller` valide la structure de sortie.

Les agents d'extraction et de classification peuvent maintenant utiliser un petit LLM optionnel compatible OpenAI Chat Completions.
La baseline deterministe reste toujours active et sert de garde-fou.

Les competences detectees couvrent aussi des soft skills utiles au matching :

- `Communication`
- `Vulgarisation`
- `Collaboration`
- `Autonomie`
- `Rigueur`
- `Problem solving`
- `Gestion de projet`
- `Anglais professionnel`

Configuration :

- `LIGHTWEIGHT_LLM_ENABLED=1`
- `LIGHTWEIGHT_LLM_DEVICE=auto`
- `LIGHTWEIGHT_LLM_ENDPOINT_URL=http://localhost:11434/v1/chat/completions`
- `LIGHTWEIGHT_LLM_AMD_ENDPOINT_URL=` optionnel, pour pointer vers un serveur LLM lance avec backend AMD dedie
- `LIGHTWEIGHT_LLM_MODEL=qwen2.5:3b`
- `LIGHTWEIGHT_LLM_TIMEOUT_SECONDS=20`

Detection GPU :

- `auto` detecte un GPU AMD/Radeon local via WMI sous Windows ou `rocm-smi`/`lspci` sous Linux
- si AMD est detecte, le client LLM annote ses appels avec `runtime.device_hint = amd-gpu`
- si `LIGHTWEIGHT_LLM_AMD_ENDPOINT_URL` est renseigne, il est utilise a la place de l'endpoint generique
- `LIGHTWEIGHT_LLM_DEVICE=cpu` force le mode CPU
- `LIGHTWEIGHT_LLM_DEVICE=amd-gpu` desactive le LLM si aucun GPU AMD n'est detecte
- sous Windows avec une carte AMD, lancer Ollama avec `OLLAMA_VULKAN=1` pour eviter le fallback CPU

La selection GPU effective depend du serveur LLM local. Le code selectionne et trace le profil AMD, mais Ollama, llama.cpp, vLLM ou autre runtime doit etre lance avec un backend compatible AMD.

Regle de fusion :

- le catalogue reste prioritaire
- une competence hors catalogue est acceptee seulement si elle a un nom court et propre, une preuve textuelle et une confiance suffisante
- une decision LLM de gap ne peut pas degrader une competence deja `acquis` par la baseline
- si le LLM echoue, la baseline deterministe continue seule

## Couche MCP MVP

La version actuelle implemente une passerelle interne `ControlledMcpGateway`.

Elle simule le role MCP sans serveur reseau separe :

- `profile-mcp.read_candidate_documents`
- `jobs-mcp.read_normalized_job`
- `audit-mcp.validate_agentic_match_schema`

Les outils autorises sont declares dans une allowlist explicite. Un outil inconnu est refuse, journalise avec `permission_status = denied`, puis bloque par exception.

Chaque appel journalise :

- serveur
- outil
- entree
- sortie resumee
- permission
- tache associee
- latence
- date d'appel

## API

### `POST /api/profile/documents`

Charge un CV ou une lettre, puis applique l'analyse agentique baseline au document avant stockage.
La route relance aussi la preconfrontation agentique sur les offres deja presentes dans le snapshot local.

### `DELETE /api/profile/documents`

Purge les donnees liees aux CV/lettres :

- documents candidat importes
- analyses documentaires
- runs agentiques contenant potentiellement des preuves issues du CV ou de la lettre
- jobs scores et feed items derives du profil documentaire

Les competences ajoutees manuellement au profil sont conservees.

### `POST /api/profile`

Ajoute une competence manuelle au profil candidat. Ces competences sont fusionnees avec les competences detectees dans les documents.

### `PATCH /api/profile/documents/skills`

Corrige les competences detectees sur un document candidat.

Payload :

- `document_id`
- `skill_name`
- `action` avec `add` ou `remove`

Effets :

- met a jour `parsed_json.detected_skills`
- journalise la correction dans `manual_skill_overrides`
- ajoute une preuve `manual_correction` quand une competence est ajoutee
- rend la correction visible dans la synthese du profil extrait

### `POST /api/jobs/:id/agentic-analysis`

Lance une analyse agentique pour une offre.

Effets :

- cree un fichier de run dans `data/runtime/agent-runs/`
- retourne le run en JSON
- redirige vers `/agents` si l'appel vient d'un formulaire HTML

### `scripts/python/refresh_agentic_matches.py`

Recalcule les confrontations CV/offres existantes apres un changement de documents candidat.

### `npm run agentic:evaluate`

Compare la baseline deterministe et la version enrichie par petit LLM sur un jeu de cas attendu.
La sortie mesure :

- couverture des competences profil
- couverture des competences offre
- exactitude des statuts de confrontation
- score global
- gain de pertinence baseline -> LLM

### `npm run agentic:runtime`

Affiche le materiel detecte, la sante du client LLM et les modeles Ollama charges. Avec Ollama, `size_vram` indique que le modele est charge en VRAM.

## Dashboard

### `/agents`

Affiche :

- dernier run
- score de confiance
- statut
- validation humaine requise ou non
- taches agents
- appels MCP
- confrontation des competences

Les analyses lancees depuis l'interface affichent une popup de progression intra-tache : etape courante, logs, decisions de l'orchestrateur et synthese des agents.

## Mini-projets proposes

Les gaps ne produisent plus seulement une action generique. Certains manques declenchent maintenant des mini-projets dedies :

- `Docker` : dockeriser un mini dashboard data
- `Airflow` : orchestrer un pipeline quotidien
- `dbt` : construire un modele analytique teste
- `Power BI` : publier un dashboard decisionnel
- `Machine Learning` : comparer deux modeles sur un cas metier simple
- soft skills : note decisionnelle, cadrage stakeholder, diagnostic d'anomalie, documentation anglaise ou couche qualite data

## Limites connues

- Les agents gardent une baseline deterministe, meme quand un petit LLM local est active.
- Les appels MCP sont une passerelle interne, pas encore de vrais serveurs MCP separes.
- La file de taches est synchrone pour rester simple.
- La validation humaine est modelisee par `human_review_required`, mais pas encore interactive.
- Le projet n'utilise pas LangGraph pour l'instant ; l'orchestration reste explicite dans le code local.

## Prochaines etapes

1. Ajouter un vrai etat `approved` / `rejected` pour la validation humaine.
2. Ajouter un agent critique distinct.
3. Ajouter un second extracteur pour recoupement.
4. Brancher un petit modele local ou distant sur un seul agent.
5. Extraire `profile-mcp` et `jobs-mcp` en serveurs MCP reels.
6. Ajouter des metriques agregees : taux d'erreur, contradiction, latence moyenne.
