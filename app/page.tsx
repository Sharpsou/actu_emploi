import Link from "next/link";
import type { DailyFeedItem } from "@/src/domain/types";
import { RunPipelineControls } from "@/app/run-pipeline-controls";
import { ThemeToggle } from "@/app/theme-toggle";
import { getDailyFeed } from "@/src/services/feed/get-daily-feed";
import { getTopJobMatches } from "@/src/services/jobs/get-top-job-matches";
import { getCandidateProfile } from "@/src/services/profile/get-candidate-profile";
import {
  getPipelineGeneratedAt,
  getPipelineSourceRuns,
  getRuntimeStats
} from "@/src/services/runtime/local-store";

export const dynamic = "force-dynamic";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full"
  }).format(new Date(date));
}

function formatTime(date: string | null) {
  if (!date) {
    return "jamais";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));
}

function formatSourceStatus(status: string) {
  switch (status) {
    case "ok":
      return "source ok";
    case "disabled":
      return "source inactive";
    case "error":
      return "source en erreur";
    default:
      return status;
  }
}

function getFeedMeta(item: DailyFeedItem) {
  const missingSkills = Array.isArray(item.payload.missing_skills)
    ? item.payload.missing_skills.filter((value): value is string => typeof value === "string")
    : [];
  const quickWins = Array.isArray(item.payload.quick_wins)
    ? item.payload.quick_wins.filter((value): value is string => typeof value === "string")
    : [];
  const deliverable = typeof item.payload.deliverable === "string" ? item.payload.deliverable : null;

  return { missingSkills, quickWins, deliverable };
}

export default function HomePage() {
  const usesFixtures = process.env.ACTU_EMPLOI_USE_FIXTURES !== "0";
  const generatedAt = getPipelineGeneratedAt();
  const today = generatedAt ? generatedAt.slice(0, 10) : "2026-04-22";
  const feed = getDailyFeed({ date: today });
  const topJobs = getTopJobMatches({ minScore: 70 });
  const profile = getCandidateProfile();
  const stats = getRuntimeStats();
  const sourceRuns = getPipelineSourceRuns();

  const feedMix = feed.reduce<Record<string, number>>((acc, item) => {
    acc[item.kind] = (acc[item.kind] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="row-between hero-top-row">
          <span className="eyebrow">Actu Emploi</span>
          <ThemeToggle />
        </div>
        <h1>Actu Emploi - Les annonces et les competences du jour.</h1>
        <p>
          Retrouve les offres les plus pertinentes, les competences qui reviennent
          le plus souvent et les quick wins a travailler pour avancer concretement.
        </p>
        <div className="pill-row">
          <span className="pill">{usesFixtures ? "Mode fixtures" : "Mode France Travail reel"}</span>
          <span className="pill">Run actif {formatDate(today)}</span>
          <span className="pill">{stats.filtered_jobs ?? 0} offres filtrees</span>
          <span className="pill">{feed.length} cartes dans le feed</span>
          <span className="pill">Matching explicable</span>
        </div>
        <RunPipelineControls usesFixtures={usesFixtures} />
      </section>

      <section className="dashboard-grid">
        <div className="stats-row">
          <article className="stat-card">
            <span className="eyebrow">Date active</span>
            <strong>{formatDate(today)}</strong>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Offres brutes</span>
            <strong>{stats.raw_jobs ?? 0}</strong>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Offres filtrees</span>
            <strong>{stats.filtered_jobs ?? 0}</strong>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Offres scorees</span>
            <strong>{stats.scored_jobs ?? topJobs.length}</strong>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Dernier run</span>
            <strong>{formatTime(generatedAt)}</strong>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Mix du feed</span>
            <strong>{Object.keys(feedMix).length} types</strong>
          </article>
        </div>

        <div className="filters-grid">
          <article className="panel">
            <h2>Profil actif</h2>
            <p>{profile.notes}</p>
            <div className="tag-list">
              {profile.targetRoles.map((role) => (
                <span className="tag" key={role}>
                  {role}
                </span>
              ))}
            </div>
          </article>

          <article className="panel">
            <h2>Etat pipeline</h2>
            {sourceRuns.length > 0 ? (
              <ul className="metric-list">
                {sourceRuns.map((run) => (
                  <li key={run.source}>
                    <strong>{run.source}</strong>
                    <p>{formatSourceStatus(run.status)}</p>
                    {typeof run.jobs_fetched === "number" ? <p>{run.jobs_fetched} offres recuperees</p> : null}
                    {run.reason ? <p>Raison: {run.reason}</p> : null}
                    {run.error ? <p>Erreur: {run.error}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Aucun statut de source disponible pour le moment.</p>
            )}
          </article>

          <article className="panel">
            <h2>Commandes utiles</h2>
            <ul className="metric-list">
              <li>
                <span className="mono">npm.cmd run dev</span>
              </li>
              <li>
                <span className="mono">node scripts/run-python-pipeline.mjs</span>
              </li>
              <li>
                <span className="mono">$env:ACTU_EMPLOI_USE_FIXTURES=&quot;0&quot;</span>
              </li>
            </ul>
          </article>
        </div>

        <section className="section-stack">
          <div className="row-between">
            <h2 className="section-title">Feed quotidien</h2>
            <Link className="link-inline" href="/profile">
              Import profil
            </Link>
          </div>
          <div className="cards-grid">
            {feed.map((item) => {
              const meta = getFeedMeta(item);

              return (
                <article className="card" key={item.id}>
                  <div className="card-header">
                    <div>
                      <span className="eyebrow">{item.kind}</span>
                      <h3>{item.title}</h3>
                    </div>
                    <div className="score-badge">
                      <small>score</small>
                      {item.score}
                    </div>
                  </div>
                  <p>{item.summary}</p>
                  <div className="tag-list">
                    {item.tags.map((tag) => (
                      <span className="tag" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  {meta.missingSkills.length > 0 ? (
                    <p className="card-meta">Manques visibles: {meta.missingSkills.join(", ")}</p>
                  ) : null}
                  {meta.quickWins.length > 0 ? (
                    <p className="card-meta">Quick wins: {meta.quickWins.join(" - ")}</p>
                  ) : null}
                  {meta.deliverable ? (
                    <p className="card-meta">Livrable attendu: {meta.deliverable}</p>
                  ) : null}
                  {item.relatedJobId ? (
                    <Link className="link-inline" href={`/jobs/${item.relatedJobId}`}>
                      Voir le detail
                    </Link>
                  ) : null}
                </article>
              );
            })}
            {feed.length === 0 ? (
              <article className="card">
                <h3>Aucune carte pour cette date</h3>
                <p>Relance le pipeline puis recharge la page pour voir le resultat du run.</p>
              </article>
            ) : null}
          </div>
        </section>

        <section className="section-stack">
          <div className="row-between">
            <h2 className="section-title">Top offres</h2>
            <Link className="link-inline" href="/api/jobs">
              API jobs
            </Link>
          </div>
          <div className="cards-grid">
            {topJobs.map((item) => (
              <article className="card" key={item.job.id}>
                <div className="card-header">
                  <div>
                    <span className="eyebrow">{item.job.source}</span>
                    <h3>{item.job.title}</h3>
                  </div>
                  <div className="score-badge">
                    <small>global</small>
                    {item.match.scoreGlobal}
                  </div>
                </div>
                <p>
                  {item.job.companyName} - {item.job.locationText} - {item.job.remoteMode}
                </p>
                <div className="tag-list">
                  {item.match.explanation.strengths.map((strength) => (
                    <span className="tag" key={strength}>
                      {strength}
                    </span>
                  ))}
                </div>
                {item.match.missingSkills.length > 0 ? (
                  <p className="card-meta">
                    A rendre plus visible: {item.match.missingSkills.join(", ")}
                  </p>
                ) : null}
                <Link className="link-inline" href={`/jobs/${item.job.id}`}>
                  Ouvrir la fiche
                </Link>
              </article>
            ))}
            {topJobs.length === 0 ? (
              <article className="card">
                <h3>Aucune offre au-dessus du seuil</h3>
                <p>Le pipeline n&apos;a pas encore produit d&apos;offre suffisamment scoree pour ce filtre.</p>
              </article>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}
