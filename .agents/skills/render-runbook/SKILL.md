---
name: render-runbook
description: "Runbook de deploiement et d'exploitation Render pour Actu Emploi. Use when configuring, deploying, or troubleshooting the project's Render Web Service, Render Cron Job, environment variables, Postgres connectivity, health checks, or release workflow for the 100% Render MVP."
---

# Render Runbook

## Objective

Operate the MVP as a small 100% Render system with the fewest moving parts possible.

## Target Topology

Default to these three runtime pieces:

- one `Render Web Service` for the web app and simple API
- one `Render Cron Job` for daily collection and feed generation
- one `Render Postgres` database

Avoid adding more services until a concrete bottleneck appears.

## Deployment Rules

Keep deploys boring.

- Prefer one clear build command and one clear start command.
- Keep environment variables documented and validated at startup.
- Make health checks cheap and deterministic.
- Fail fast when required configuration is missing.

If a capability can live in the web app without hurting clarity, keep it there during the MVP.
Split it into another service only when operational pain is real.

## Cron Job Rules

Treat cron execution as replayable and safe to rerun.

- Do not assume a run happens exactly once.
- Use deduplication keys for imported jobs.
- Make partial failures visible in logs.
- Separate fetch, normalize, score, and publish steps enough to inspect them independently.

When a daily batch fails, prefer replaying a small sample locally before redesigning the pipeline.

## Database Rules

Use Postgres as the source of truth for:

- raw payload retention
- normalized job records
- job match explanations
- skill gaps
- feed items

Do not make the UI depend on ad hoc transformations that are not reproducible from stored data.

## Incident Triage

When something breaks on Render, inspect in this order:

1. latest deploy status
2. service logs
3. environment variables
4. database connectivity
5. external API availability
6. application code path

Check whether the failure belongs to:

- build time
- startup time
- request handling
- scheduled execution
- database access

## Cost and Simplicity

This project targets a low-cost MVP. Prefer solutions that preserve:

- a single deployment platform
- a small number of paid services
- easy manual recovery
- easy replay of daily jobs

Do not add infra that materially increases cost or operating complexity without a clear MVP need.
