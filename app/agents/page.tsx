import Link from "next/link";
import { EvaluationControls } from "@/app/agents/evaluation-controls";
import { getAgentRunsFromStore } from "@/src/services/runtime/local-store";

export const dynamic = "force-dynamic";

function readConfrontations(result: Record<string, unknown>) {
  const confrontations = result.confrontations;
  return Array.isArray(confrontations) ? confrontations : [];
}

export default function AgentsPage() {
  const runs = getAgentRunsFromStore();
  const latestRun = runs[0];

  return (
    <main className="page-shell">
      <section className="hero">
        <span className="eyebrow">Agentique controlee</span>
        <h1>Runs d&apos;analyse CV/offres</h1>
        <p>
          Suivi des executions agentiques legeres, avec traces MCP, controles deterministes,
          scores de confiance et validation humaine si necessaire.
        </p>
        <div className="pill-row">
          <span className="pill">{runs.length} runs</span>
          <span className="pill">MCP read-only</span>
          <span className="pill">Human review si confiance basse</span>
        </div>
      </section>

      <section className="dashboard-grid">
        <EvaluationControls />

        {latestRun ? (
          <article className="panel section-stack">
            <div className="row-between">
              <div>
                <span className="eyebrow">Dernier run</span>
                <h2>{latestRun.id}</h2>
              </div>
              <div className="score-badge">
                <small>confiance</small>
                {latestRun.confidenceScore}
              </div>
            </div>
            <p>
              Statut {latestRun.status} pour{" "}
              <Link className="link-inline" href={`/jobs/${latestRun.jobId}`}>
                {latestRun.jobId}
              </Link>
            </p>
            <div className="stats-row">
              <div className="stat-card">
                <span className="eyebrow">Taches</span>
                <strong>{latestRun.tasks.length}</strong>
              </div>
              <div className="stat-card">
                <span className="eyebrow">Appels MCP</span>
                <strong>{latestRun.mcpCalls.length}</strong>
              </div>
              <div className="stat-card">
                <span className="eyebrow">Validation</span>
                <strong>{latestRun.humanReviewRequired ? "humaine" : "auto"}</strong>
              </div>
            </div>
          </article>
        ) : (
          <article className="panel section-stack">
            <h2>Aucun run agentique</h2>
            <p>Declenche une analyse depuis l&apos;API d&apos;une offre pour alimenter ce tableau.</p>
          </article>
        )}

        <div className="detail-grid">
          <article className="panel section-stack">
            <h2>Historique</h2>
            {runs.length > 0 ? (
              <ul className="list-reset">
                {runs.map((run) => (
                  <li key={run.id}>
                    <div className="row-between">
                      <div>
                        <strong>{run.id}</strong>
                        <p>
                          {run.status} - job {run.jobId} - {run.createdAt}
                        </p>
                      </div>
                      <span className="tag">{run.confidenceScore}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Les executions apparaitront ici apres le premier POST API.</p>
            )}
          </article>

          <article className="panel section-stack">
            <h2>Traces du dernier run</h2>
            {latestRun ? (
              <>
                <div>
                  <span className="eyebrow">Agents</span>
                  <ul className="list-reset">
                    {latestRun.tasks.map((task) => (
                      <li key={task.id}>
                        <strong>{task.agentName}</strong>
                        <p>
                          {task.status} - {task.modelName} - {task.latencyMs} ms - confiance{" "}
                          {task.confidenceScore}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="eyebrow">MCP</span>
                  <ul className="list-reset">
                    {latestRun.mcpCalls.map((call) => (
                      <li key={call.id}>
                        <strong>{call.serverName}</strong>
                        <p>
                          {call.toolName} - {call.permissionStatus} - task {call.taskId}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <p className="muted">Pas encore de traces a afficher.</p>
            )}
          </article>
        </div>

        {latestRun ? (
          <article className="panel section-stack">
            <h2>Confrontation</h2>
            <div className="cards-grid">
              {readConfrontations(latestRun.result).map((item, index) => {
                const confrontation = item as Record<string, unknown>;
                return (
                  <div className="card section-stack" key={`${String(confrontation.skill_name)}-${index}`}>
                    <div className="row-between">
                      <h3>{String(confrontation.skill_name)}</h3>
                      <span className="tag warm">{String(confrontation.status)}</span>
                    </div>
                    <p>{String(confrontation.rationale_text)}</p>
                    <span className="pill">{String(confrontation.effort_level)}</span>
                  </div>
                );
              })}
            </div>
          </article>
        ) : null}
      </section>
    </main>
  );
}
