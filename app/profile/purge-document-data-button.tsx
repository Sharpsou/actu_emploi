"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PurgeResponse = {
  deletedDocuments: number;
  deletedAgentRuns: number;
  invalidatedJobs: number;
  invalidatedFeedItems: number;
  error?: string;
};

export function PurgeDocumentDataButton() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function purgeData() {
    const confirmed = window.confirm(
      "Supprimer les CV/lettres importes, leurs analyses, les runs agentiques associes et les scores derives ?"
    );

    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setStatus(null);

    try {
      const response = await fetch("/api/profile/documents", {
        method: "DELETE"
      });
      const payload = (await response.json().catch(() => null)) as PurgeResponse | null;

      if (!response.ok || !payload) {
        throw new Error(payload?.error ?? "La purge a echoue.");
      }

      setStatus(
        `${payload.deletedDocuments} documents supprimes, ${payload.deletedAgentRuns} runs effaces, ${payload.invalidatedJobs} scores invalides.`
      );
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "La purge a echoue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="section-stack">
      <button className="button-secondary" disabled={submitting} onClick={() => void purgeData()} type="button">
        {submitting ? "Purge..." : "Purger les donnees CV/LM"}
      </button>
      {status ? <p className="muted">{status}</p> : null}
    </div>
  );
}
