---
name: debug-playbook
description: "Methode de diagnostic pour Actu Emploi. Use when a feature, ingestion job, score explanation, API route, Render deployment, cron task, or database workflow behaves unexpectedly and Codex needs a repeatable way to isolate the failing layer before patching."
---

# Debug Playbook

## Objective

Find the failing layer before changing code.

## Debug Order

Always follow this sequence:

1. Reproduce the bug with the smallest possible input.
2. Classify the failure layer.
3. Inspect the boundary just before the failure.
4. Patch the narrowest cause.
5. Verify the original bug and one nearby regression case.

Do not start by rewriting large sections of code, rotating frameworks, or adding caching.

## Failure Layers

Classify the issue into one of these buckets first:

- source issue: external API, quota, auth, pagination, malformed payload
- ingestion issue: fetch succeeds but data is missing, duplicated, or stale
- normalization issue: parsed fields are inconsistent or incomplete
- scoring issue: match score or explanation is wrong
- persistence issue: schema, query, migration, or transaction problem
- presentation issue: API returns correct data but UI renders it incorrectly
- deployment issue: config, environment variable, build, health check, or cron setup

If the bucket is unclear, compare the last correct artifact to the first incorrect artifact.

## Repository-Specific Checks

For ingestion or feed freshness issues:

- inspect the exact source payload
- inspect the normalized record written to storage
- inspect deduplication keys
- inspect the final feed item built from that record

For scoring issues:

- compare the expected role, skills, stack, seniority, and penalties separately
- check whether the explanation text matches the numeric components
- verify penalty rules are reducing score rather than silently excluding relevant offers

For UI issues:

- verify the API payload first
- verify the shape used by the component
- only then inspect styling or rendering logic

For Render incidents:

- check deployment config and environment variables before changing application code
- check whether the issue happens in web service, cron job, or database connectivity

## Patch Rules

Prefer evidence over assumptions.

- Log or print the exact value crossing a suspicious boundary.
- Add a focused regression test when the bug is deterministic.
- Keep the fix local to the failing layer unless evidence proves a wider issue.
- When a production-only issue cannot be reproduced locally, use logs and persisted data to build a replay case.

## Closing the Loop

A debug task is done only when:

1. the cause is named plainly
2. the fix is verified
3. one regression guard exists through a test or a documented replay step
4. any missing doc or runbook note has been updated
