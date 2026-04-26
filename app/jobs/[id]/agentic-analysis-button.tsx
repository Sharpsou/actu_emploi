"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type RuntimeTask = {
  id: string;
  title: string;
  status: "queued" | "running" | "completed" | "failed";
  currentStep: string;
  logs: string[];
  error?: string;
  result?: {
    run_id?: string;
    confidence_score?: number;
    tasks_count?: number;
  };
};

type AgenticAnalysisButtonProps = {
  jobId: string;
};

async function fetchTask(taskId: string) {
  const response = await fetch(`/api/tasks/${taskId}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Impossible de suivre l'analyse agentique.");
  }

  return (await response.json()) as RuntimeTask;
}

function statusLabel(status: RuntimeTask["status"]) {
  switch (status) {
    case "queued":
      return "En attente";
    case "running":
      return "En cours";
    case "completed":
      return "Terminee";
    case "failed":
      return "Echec";
  }
}

export function AgenticAnalysisButton({ jobId }: AgenticAnalysisButtonProps) {
  const router = useRouter();
  const handledFinalTaskId = useRef<string | null>(null);
  const [task, setTask] = useState<RuntimeTask | null>(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!task || (task.status !== "queued" && task.status !== "running")) {
      return;
    }

    const interval = window.setInterval(async () => {
      try {
        setTask(await fetchTask(task.id));
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Impossible de suivre l'analyse.");
        setSubmitting(false);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [task]);

  useEffect(() => {
    if (!task || (task.status !== "completed" && task.status !== "failed")) {
      return;
    }

    if (handledFinalTaskId.current === task.id) {
      return;
    }

    handledFinalTaskId.current = task.id;
    setSubmitting(false);

    if (task.status === "completed") {
      const confidence = task.result?.confidence_score;
      setMessage(
        typeof confidence === "number"
          ? `Analyse terminee avec une confiance de ${confidence}.`
          : "Analyse agentique terminee."
      );
      router.refresh();
      return;
    }

    setMessage(task.error ?? "L'analyse agentique a echoue.");
  }, [router, task]);

  const startAnalysis = useCallback(async () => {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setOpen(true);
    setMessage("Demarrage de l'analyse agentique...");

    try {
      const response = await fetch(`/api/jobs/${jobId}/agentic-analysis`, {
        method: "POST",
        headers: {
          Accept: "application/json"
        }
      });
      const payload = (await response.json().catch(() => null)) as { taskId?: string; error?: string } | null;

      if (!response.ok || !payload?.taskId) {
        throw new Error(payload?.error ?? "L'analyse n'a pas pu etre lancee.");
      }

      handledFinalTaskId.current = null;
      setTask(await fetchTask(payload.taskId));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "L'analyse n'a pas pu etre lancee.");
      setSubmitting(false);
    }
  }, [jobId, submitting]);

  return (
    <>
      <button className="button-primary" disabled={submitting} onClick={() => void startAnalysis()} type="button">
        {submitting ? "Analyse en cours..." : "Recalculer l'analyse agentique"}
      </button>

      {open ? (
        <div aria-modal="true" className="analysis-modal-backdrop" role="dialog">
          <div className="analysis-modal section-stack">
            <div className="row-between">
              <div>
                <span className="eyebrow">Agent CV/offre</span>
                <h2>Avancee de l&apos;analyse</h2>
              </div>
              <button className="button-secondary" onClick={() => setOpen(false)} type="button">
                Fermer
              </button>
            </div>

            <div className="task-log">
              <strong>{task?.title ?? "Analyse agentique CV/offre"}</strong>
              <p className="muted">
                Etat: {task ? statusLabel(task.status) : "Initialisation"} -{" "}
                {task?.currentStep ?? "Preparation de la tache..."}
              </p>
              {message ? <p>{message}</p> : null}
              <ul className="metric-list">
                {(task?.logs.length ? task.logs : ["Preparation de l'agent et de ses acces controles..."]).map(
                  (entry, index) => (
                    <li key={`${task?.id ?? "pending"}-${index}`}>{entry}</li>
                  )
                )}
              </ul>
            </div>

            {task?.result ? (
              <div className="pill-row">
                {typeof task.result.confidence_score === "number" ? (
                  <span className="pill">confiance {task.result.confidence_score}</span>
                ) : null}
                {typeof task.result.tasks_count === "number" ? (
                  <span className="pill">{task.result.tasks_count} taches agent</span>
                ) : null}
                {task.result.run_id ? <span className="pill mono">{task.result.run_id}</span> : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
