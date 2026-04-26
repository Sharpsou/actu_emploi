---
name: agentic-architecture
description: "Architecture agentique controlee pour Actu Emploi. Use when designing, implementing, reviewing, or refactoring LLM agents, mini-agent pipelines, MCP access, tool permissions, confidence scoring, human validation, traces, or dashboards for CV/offre analysis and other agentic workflows."
---

# Agentic Architecture

## Objective

Build agentic features as controlled pipelines, not autonomous black boxes.

Prefer:

- small specialized agents
- typed outputs
- deterministic validation
- MCP-style controlled tool access
- full traces
- confidence scoring
- human review for risky or low-confidence results

Avoid:

- broad agents with unrestricted environment access
- hidden prompt-only business logic
- external actions without permission checks
- unlogged tool calls
- final answers that cannot be traced back to sources

## Workflow

Before editing agentic code:

1. Identify the user-facing workflow and the smallest useful vertical slice.
2. Name the agents by responsibility, not by implementation detail.
3. Define the input and output schema before prompt/model details.
4. Decide which data and tools must be accessed through MCP-style boundaries.
5. Add deterministic validators for everything that can be checked by code.
6. Persist run, task, tool-call, confidence, and review state.
7. Add focused tests for the orchestration contract.

## Actu Emploi Pattern

For CV/offre analysis, preserve this shape:

- `profile reader`: read candidate documents through a controlled gateway.
- `job reader`: read normalized jobs through a controlled gateway.
- `cv-skill-extractor`: extract visible profile skills and evidence.
- `job-requirement-extractor`: extract requested skills and evidence.
- `skill-gap-classifier`: classify each requested skill as `acquis`, `survol`, `formation`, or `mini_projet`.
- `deterministic-controller`: validate schema, statuses, confidence, and review requirement.
- optional `critic-agent`: detect contradictions before exposing the result.

Agents may be deterministic baselines first. The contract must allow replacing one agent with a small LLM later without changing the route or UI payload.

## MCP Rules

Treat MCP as the boundary between agents and the environment.

Every MCP-style call must record:

- run id
- task id
- server name
- tool name
- summarized input
- summarized output
- permission status
- latency
- timestamp

Use allowlists by server/tool. Read-only access is the default. Any write, network, email, deletion, or external side effect must require explicit permission and usually human review.

Never let an agent directly read files, write files, call APIs, or execute commands when a gateway/tool boundary exists.

## Validation Rules

Add deterministic checks for:

- JSON/schema validity
- allowed statuses and effort levels
- known skills or explicit unknown-skill handling
- evidence presence when claiming `acquis`
- no external action unless permission is allowed
- confidence thresholds

Suggested thresholds:

- `>= 70`: auto-complete for read-only analysis
- `50-69`: needs human review
- `< 50`: failed or needs repair

## Code Review Checklist

When reviewing agentic code, check:

- Are agents narrow and named by responsibility?
- Are tool/resource accesses routed through a controlled gateway?
- Are permissions explicit and testable?
- Are all calls journaled?
- Are outputs typed and validated?
- Can a failed or low-confidence run be inspected later?
- Is human validation represented in the data model?
- Are tests covering both happy path and invalid/denied paths?

## MVP Bias

Keep the first implementation local and boring:

- synchronous execution is acceptable
- local JSON runtime storage is acceptable
- deterministic baseline agents are acceptable
- fake/internal MCP gateway is acceptable

But keep the boundary clean so the next step can extract real MCP servers, async queues, and small LLM calls without rewriting the product flow.
