import Link from "next/link";
import { notFound } from "next/navigation";
import { AgenticAnalysisButton } from "@/app/jobs/[id]/agentic-analysis-button";
import { getJobDetail } from "@/src/services/jobs/get-job-detail";

export const dynamic = "force-dynamic";

type JobDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = await params;
  const detail = getJobDetail(id);

  if (!detail) {
    notFound();
  }

  const { job, match, gaps, agenticAnalysis } = detail;

  return (
    <main className="page-shell">
      <section className="hero">
        <span className="eyebrow">{job.source}</span>
        <h1>{job.title}</h1>
        <p>
          {job.companyName} - {job.locationText} - {job.contractType} - {job.remoteMode}
        </p>
        {job.detailUrl ? (
          <p>
            Adresse de l&apos;annonce :{" "}
            <a className="link-inline" href={job.detailUrl} rel="noreferrer" target="_blank">
              {job.detailUrl}
            </a>
          </p>
        ) : (
          <p className="muted">Adresse de l&apos;annonce indisponible pour ce snapshot.</p>
        )}
        <div className="pill-row">
          <span className="pill">Published {job.publishedAt}</span>
          <span className="pill">Seniority {job.seniorityText}</span>
          <span className="pill">Canonical key {job.canonicalJobKey}</span>
          {agenticAnalysis ? <span className="pill">Analyse CV/offre {agenticAnalysis.confidenceScore}</span> : null}
        </div>
        <AgenticAnalysisButton jobId={job.id} />
      </section>

      <section className="dashboard-grid">
        <div className="detail-grid">
          <article className="panel section-stack">
            <div className="row-between">
              <h2>Pourquoi cette offre remonte</h2>
              <div className="score-badge">
                <small>global</small>
                {match.scoreGlobal}
              </div>
            </div>
            <p>{job.descriptionText}</p>
            <ul className="metric-list">
              <li>Role: {match.scoreRole}</li>
              <li>Skills match: {match.scoreSkillsMatch}</li>
              <li>Stack fit: {match.scoreStackFit}</li>
              <li>Seniority: {match.scoreSeniority}</li>
              <li>Penalties: {match.scorePenalties}</li>
              <li>Preference: {match.scorePreference}</li>
            </ul>
          </article>

          <article className="panel section-stack">
            <h2>Lecture rapide</h2>
            <div>
              <span className="eyebrow">Forces</span>
              <div className="tag-list">
                {match.explanation.strengths.map((item) => (
                  <span className="tag" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="eyebrow">Quick wins</span>
              <div className="tag-list">
                {match.explanation.quickWins.length > 0 ? (
                  match.explanation.quickWins.map((item) => (
                    <span className="tag warm" key={item}>
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="muted">Aucun quick win detecte sur cette offre.</span>
                )}
              </div>
            </div>
            <div>
              <span className="eyebrow">Points bloquants</span>
              <div className="tag-list">
                {match.explanation.blockingPoints.length > 0 ? (
                  match.explanation.blockingPoints.map((item) => (
                    <span className="tag danger" key={item}>
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="muted">Aucun point bloquant explicite sur ce match.</span>
                )}
              </div>
            </div>
          </article>
        </div>

        <div className="detail-grid">
          <article className="panel section-stack">
            <h2>Competences detectees</h2>
            <div className="tag-list">
              {job.skillsDetected.map((skill) => (
                <span className="tag" key={skill}>
                  {skill}
                </span>
              ))}
            </div>
          </article>

          <article className="panel section-stack">
            <h2>Manques identifies</h2>
            {gaps.length > 0 ? (
              <ul className="list-reset">
                {gaps.map((gap) => (
                  <li key={gap.id}>
                    <strong>{gap.skillName}</strong>
                    <p>
                      {gap.gapType} - importance {gap.importanceScore}
                    </p>
                    <p>{gap.rationaleText}</p>
                    <p>
                      Action: {gap.suggestedAction.title} - {gap.suggestedAction.format}
                    </p>
                    <p>Livrable: {gap.suggestedAction.deliverable}</p>
                    {gap.suggestedAction.freeAlternative ? (
                      <p>Alternative gratuite: {gap.suggestedAction.freeAlternative}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Aucun gap explicite detecte pour cette offre a ce stade.</p>
            )}
          </article>
        </div>

        <article className="panel section-stack">
          <div className="row-between">
            <div>
              <span className="eyebrow">Analyse agentique CV vs offre</span>
              <h2>Confrontation deja calculee</h2>
            </div>
            {agenticAnalysis ? (
              <div className="score-badge">
                <small>confiance</small>
                {agenticAnalysis.confidenceScore}
              </div>
            ) : null}
          </div>
          {agenticAnalysis ? (
            <>
              <p>
                Statut {agenticAnalysis.status} - calcule le {agenticAnalysis.computedAt}
              </p>
              <div className="cards-grid">
                {agenticAnalysis.analysis.confrontations.map((confrontation) => (
                  <div className="card section-stack" key={confrontation.skillName}>
                    <div className="row-between">
                      <h3>{confrontation.skillName}</h3>
                      <span className={confrontation.status === "acquis" ? "tag" : "tag warm"}>
                        {confrontation.status}
                      </span>
                    </div>
                    <p>{confrontation.rationaleText}</p>
                    <div className="pill-row">
                      <span className="pill">effort {confrontation.effortLevel}</span>
                      <span className="pill">{confrontation.suggestedAction.format}</span>
                    </div>
                    <p>Action: {confrontation.suggestedAction.title}</p>
                    <p>Livrable: {confrontation.suggestedAction.deliverable}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="muted">
              Aucune preconfrontation stockee pour cette offre. Relance le pipeline ou utilise le recalcul agentique.
            </p>
          )}
        </article>

        <Link className="link-inline" href="/">
          Retour au feed
        </Link>
        <Link className="link-inline" href="/agents">
          Voir les runs agentiques
        </Link>
      </section>
    </main>
  );
}
