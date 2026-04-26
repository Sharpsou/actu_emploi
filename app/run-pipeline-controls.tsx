"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buildRefreshPageUrl } from "@/src/services/runtime/refresh-page-url";

const AUTO_REFRESH_SESSION_KEY = "actu-emploi-home-auto-refresh-done";

type RunPipelineControlsProps = {
  usesFixtures: boolean;
};

type RuntimeTask = {
  id: string;
  title: string;
  status: "queued" | "running" | "completed" | "failed";
  currentStep: string;
  logs: string[];
  error?: string;
  result?: {
    generated_at?: string;
    stats?: {
      raw_jobs?: number;
      filtered_jobs?: number;
    };
  };
};

async function fetchTask(taskId: string) {
  const response = await fetch(`/api/tasks/${taskId}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Impossible de lire l'etat de la tache.");
  }

  return (await response.json()) as RuntimeTask;
}

export function RunPipelineControls({ usesFixtures }: RunPipelineControlsProps) {
  const router = useRouter();
  const didAutoRefresh = useRef(false);
  const handledFinalTaskId = useRef<string | null>(null);
  const [activeTask, setActiveTask] = useState<RuntimeTask | null>(null);
  const [progressOpen, setProgressOpen] = useState(false);
  const [status, setStatus] = useState<string>("Rafraichissement initial des offres au chargement...");
  const [refreshSubmitting, setRefreshSubmitting] = useState(false);

  const refreshPageSnapshot = useCallback((refreshToken?: string) => {
    router.refresh();

    window.setTimeout(() => {
      window.location.replace(buildRefreshPageUrl(window.location.href, refreshToken));
    }, 150);
  }, [router]);

  useEffect(() => {
    if (!activeTask || (activeTask.status !== "queued" && activeTask.status !== "running")) {
      return;
    }

    const interval = window.setInterval(async () => {
      try {
        const nextTask = await fetchTask(activeTask.id);
        setActiveTask(nextTask);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Impossible de suivre la tache.");
        setRefreshSubmitting(false);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [activeTask, refreshPageSnapshot]);

  useEffect(() => {
    if (!activeTask) {
      return;
    }

    if (activeTask.status !== "completed" && activeTask.status !== "failed") {
      return;
    }

    if (handledFinalTaskId.current === activeTask.id) {
      return;
    }

    handledFinalTaskId.current = activeTask.id;

    if (activeTask.status === "completed") {
      const rawJobs = activeTask.result?.stats?.raw_jobs;
      const filteredJobs = activeTask.result?.stats?.filtered_jobs;
      const generatedAt =
        typeof activeTask.result?.generated_at === "string" ? activeTask.result.generated_at : undefined;

      setStatus(
        typeof rawJobs === "number" && typeof filteredJobs === "number"
          ? `${activeTask.title}: ${rawJobs} offres brutes, ${filteredJobs} retenues.`
          : `${activeTask.title}: termine.`
      );
      setRefreshSubmitting(false);
      refreshPageSnapshot(generatedAt);
      return;
    }

    setStatus(activeTask.error ?? `${activeTask.title}: echec.`);
    setRefreshSubmitting(false);
  }, [activeTask, refreshPageSnapshot]);

  const startTask = useCallback(async () => {
    if (refreshSubmitting) {
      return;
    }

    setRefreshSubmitting(true);
    setProgressOpen(true);
    setStatus("Rafraichissement des offres en cours...");

    try {
      const response = await fetch("/api/run/offers-refresh", {
        method: "POST"
      });
      const payload = (await response.json().catch(() => null)) as { taskId?: string; error?: string } | null;

      if (!response.ok || !payload?.taskId) {
        throw new Error(payload?.error ?? "La tache n'a pas pu etre lancee.");
      }

      handledFinalTaskId.current = null;
      const task = await fetchTask(payload.taskId);
      setActiveTask(task);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "La tache n'a pas pu etre lancee.");
      setRefreshSubmitting(false);
    }
  }, [refreshSubmitting]);

  useEffect(() => {
    if (didAutoRefresh.current) {
      return;
    }

    if (typeof window !== "undefined" && window.sessionStorage.getItem(AUTO_REFRESH_SESSION_KEY) === "1") {
      didAutoRefresh.current = true;
      return;
    }

    didAutoRefresh.current = true;
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(AUTO_REFRESH_SESSION_KEY, "1");
    }
    void startTask();
  }, [startTask]);

  return (
    <div className="run-controls section-stack">
      <div className="run-controls-row">
        <button
          className="button-primary"
          disabled={refreshSubmitting}
          onClick={() => void startTask()}
          type="button"
        >
          {refreshSubmitting ? "Rafraichissement..." : "Rafraichir les offres"}
        </button>
      </div>
      <span className="muted">
        {usesFixtures
          ? "Le rafraichissement auto recharge les offres/fixtures, applique l'analyse agentique baseline, puis recalcule le scoring."
          : "Le rafraichissement auto recharge les offres France Travail, applique l'analyse agentique baseline, puis recalcule le scoring."}
      </span>
      <p className="muted">{status}</p>
      {activeTask ? (
        <div className="task-log">
          <strong>{activeTask.title}</strong>
          <p className="muted">Etat: {activeTask.currentStep}</p>
          <ul className="metric-list">
            {activeTask.logs.slice(-6).map((entry, index) => (
              <li key={`${activeTask.id}-${index}`}>{entry}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {progressOpen ? (
        <div aria-modal="true" className="analysis-modal-backdrop" role="dialog">
          <div className="analysis-modal section-stack">
            <div className="row-between">
              <div>
                <span className="eyebrow">Pipeline quotidien</span>
                <h2>Avancee de l&apos;analyse</h2>
              </div>
              <button className="button-secondary" onClick={() => setProgressOpen(false)} type="button">
                Fermer
              </button>
            </div>
            <div className="task-log">
              <strong>{activeTask?.title ?? "Rafraichissement des offres"}</strong>
              <p className="muted">
                Etat: {activeTask?.status ?? "initialisation"} -{" "}
                {activeTask?.currentStep ?? "Preparation de la tache..."}
              </p>
              <p>{status}</p>
              <ul className="metric-list">
                {(activeTask?.logs.length
                  ? activeTask.logs
                  : ["Preparation de la collecte et de l'analyse agentique..."]
                ).map((entry, index) => (
                    <li key={`${activeTask?.id ?? "pending"}-${index}`}>{entry}</li>
                  ))}
              </ul>
            </div>
            {activeTask?.result?.stats ? (
              <div className="pill-row">
                {typeof activeTask.result.stats.raw_jobs === "number" ? (
                  <span className="pill">{activeTask.result.stats.raw_jobs} offres brutes</span>
                ) : null}
                {typeof activeTask.result.stats.filtered_jobs === "number" ? (
                  <span className="pill">{activeTask.result.stats.filtered_jobs} retenues</span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
