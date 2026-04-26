"use client";

import { useState } from "react";
import type { AgenticEvaluationResult } from "@/src/services/agents/evaluate-agentic-relevance";

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function signed(value: number) {
  const rounded = Math.round(value * 100);
  return `${rounded >= 0 ? "+" : ""}${rounded} pts`;
}

function isEvaluationResult(value: AgenticEvaluationResult | { error?: string } | null): value is AgenticEvaluationResult {
  return Boolean(value && "cases_count" in value);
}

export function EvaluationControls() {
  const [result, setResult] = useState<AgenticEvaluationResult | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function runEvaluation() {
    setSubmitting(true);
    setStatus(null);

    try {
      const response = await fetch("/api/agents/evaluation", {
        method: "POST"
      });
      const payload = (await response.json().catch(() => null)) as AgenticEvaluationResult | { error?: string } | null;

      if (!response.ok || !isEvaluationResult(payload)) {
        const errorPayload = payload as { error?: string } | null;
        throw new Error(errorPayload?.error ?? "Evaluation agentique impossible.");
      }

      setResult(payload);
      setStatus(`${payload.cases_count} cas evalues.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Evaluation agentique impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <article className="panel section-stack">
      <div className="row-between">
        <div>
          <span className="eyebrow">Pertinence</span>
          <h2>Mesure baseline vs petit LLM</h2>
        </div>
        {result ? (
          <div className="score-badge">
            <small>gain</small>
            {signed(result.gain.overall_score)}
          </div>
        ) : null}
      </div>
      <p className="muted">
        Lance le benchmark local qui compare la baseline deterministe et la version enrichie par petit LLM
        sur couverture des competences, statuts de confrontation et score global.
      </p>
      <button className="button-primary" disabled={submitting} onClick={() => void runEvaluation()} type="button">
        {submitting ? "Evaluation..." : "Evaluer la pertinence"}
      </button>
      {status ? <p className="muted">{status}</p> : null}

      {result ? (
        <>
          <div className="stats-row">
            <div className="stat-card">
              <span className="eyebrow">Baseline</span>
              <strong>{pct(result.baseline.overall_score)}</strong>
            </div>
            <div className="stat-card">
              <span className="eyebrow">Enrichi</span>
              <strong>{pct(result.enhanced.overall_score)}</strong>
            </div>
            <div className="stat-card">
              <span className="eyebrow">Gain</span>
              <strong>{signed(result.gain.overall_score)}</strong>
            </div>
          </div>
          <ul className="metric-list">
            <li>Couverture profil: {pct(result.baseline.profile_skill_coverage)} vers {pct(result.enhanced.profile_skill_coverage)} ({signed(result.gain.profile_skill_coverage)})</li>
            <li>Couverture offre: {pct(result.baseline.job_skill_coverage)} vers {pct(result.enhanced.job_skill_coverage)} ({signed(result.gain.job_skill_coverage)})</li>
            <li>Statuts: {pct(result.baseline.status_accuracy)} vers {pct(result.enhanced.status_accuracy)} ({signed(result.gain.status_accuracy)})</li>
          </ul>
          <div className="cards-grid">
            {result.cases.map((item) => (
              <div className="card section-stack" key={item.id}>
                <div className="row-between">
                  <h3>{item.id}</h3>
                  <span className="tag warm">{signed(item.gain)}</span>
                </div>
                <p>Baseline {pct(item.baseline.overall_score)} - Enrichi {pct(item.enhanced.overall_score)}</p>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </article>
  );
}
