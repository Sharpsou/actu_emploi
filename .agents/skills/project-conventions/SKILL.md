---
name: project-conventions
description: "Conventions de code, de structure et de decoupage pour Actu Emploi. Use when implementing or refactoring application code, API routes, ingestion jobs, database access, scoring logic, or technical docs so changes stay aligned with the MVP architecture: web app simple, batch quotidien, Postgres, and 100% Render deployment."
---

# Project Conventions

## Objective

Keep the repository simple, testable, and aligned with the MVP described in `README.md`,
`docs/cadrage-produit.md`, and `docs/backlog-mvp.md`.

## Working Rules

Prefer the smallest vertical slice that proves value quickly.

Optimize first for:

- ingesting job data reliably
- storing normalized data cleanly
- producing explainable scoring
- rendering a usable daily feed

Delay anything that does not materially help the MVP:

- auth
- role systems
- event buses
- microservices
- complex design systems
- speculative abstractions

## Architecture Direction

Use a simple separation by responsibility.

- Keep ingestion separate from normalization.
- Keep normalization separate from scoring.
- Keep scoring separate from feed presentation.
- Keep persistence concerns out of UI components.
- Keep external API payloads at the edges and convert them into project-owned shapes quickly.

When the web app and API live in the same Next.js project, keep domain logic outside route handlers
so it can be reused by web requests, cron jobs, and tests.

When Python is introduced for text analysis or scoring, keep the decision logic framework-agnostic and
callable from small scripts or services. Do not bury core scoring rules inside notebooks.

## Code Conventions

Make boundaries explicit.

- Validate config and environment variables early.
- Give raw, normalized, and scored objects different names.
- Centralize scoring weights and business penalties in one obvious place.
- Keep explanation fields close to the scoring output so the UI can justify rankings.
- Prefer pure functions for parsing, normalization, deduplication, and scoring.

Design for reruns.

- Treat ingestion and cron execution as idempotent by default.
- Favor upsert or deduplication strategies over blind inserts.
- Record source metadata needed for replay and debugging.

Keep naming boring and obvious.

- Use domain names from the product docs: `jobs_raw`, `jobs_normalized`, `job_matches`, `skill_gaps`, `daily_feed_items`.
- Name modules by responsibility, not by vague technical words like `utils2` or `helpers_misc`.

## Delivery Checklist

Before considering a change complete:

1. Verify it helps the current MVP phase.
2. Verify the code path is understandable without hidden framework magic.
3. Add at least one focused test when logic is deterministic.
4. Update the relevant doc when the architecture, scoring rules, or deployment expectations change.

If tradeoffs are unclear, prefer the option that is easier to debug on Render with logs and database state.
