"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const SAMPLE_TEXT: Record<"cv" | "lettre", string> = {
  cv: "Data Analyst avec experience SQL, Python, Power BI, ETL et dashboards. Recherche un poste a Nantes ou Saint-Nazaire avec teletravail partiel.",
  lettre:
    "Je cible des roles data a Nantes ou Saint-Nazaire. Je peux apporter une base solide en SQL, Python, BI et mise en qualite de donnees, avec une progression active sur l'orchestration et la modelisation."
};

export function DocumentUploadForm() {
  const router = useRouter();
  const [documentType, setDocumentType] = useState<"cv" | "lettre">("cv");
  const [sourceMode, setSourceMode] = useState<"file" | "text">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceFilename, setSourceFilename] = useState("cv-manuel.txt");
  const [contentText, setContentText] = useState(SAMPLE_TEXT.cv);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const acceptedFormats = useMemo(
    () =>
      documentType === "cv"
        ? ".pdf,.txt,.md,.markdown,text/plain,text/markdown,application/pdf"
        : ".txt,.md,.markdown,text/plain,text/markdown",
    [documentType]
  );

  useEffect(() => {
    if (selectedFile) {
      setSourceFilename(selectedFile.name);
    }
  }, [selectedFile]);

  useEffect(() => {
    if (sourceMode === "text") {
      setSourceFilename(documentType === "cv" ? "cv-manuel.txt" : "lettre-motivation.txt");
      setContentText(SAMPLE_TEXT[documentType]);
    }
  }, [documentType, sourceMode]);

  async function uploadDocument() {
    const formData = new FormData();
    formData.append("document_type", documentType);

    if (sourceMode === "file") {
      if (!selectedFile) {
        throw new Error("Selectionne un fichier avant de lancer l'import.");
      }

      formData.append("document_file", selectedFile);
    } else {
      formData.append("source_filename", sourceFilename);
      formData.append("content_text", contentText);
    }

    const response = await fetch("/api/profile/documents", {
      method: "POST",
      body: formData
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      id?: string;
      agenticRefresh?: { ok: boolean; jobsRefreshed: number; error?: string };
    } | null;

    if (!response.ok || !payload?.id) {
      throw new Error(payload?.error ?? "Echec de l'import document.");
    }

    return payload;
  }

  async function handleUploadOnly() {
    setSubmitting(true);
    setStatus(null);

    try {
      const payload = await uploadDocument();
      setStatus(
        payload?.agenticRefresh?.ok
          ? `Document charge, analyse agentique appliquee et ${payload.agenticRefresh.jobsRefreshed} offres reconfrontees.`
          : "Document charge et analyse agentique appliquee."
      );
      if (sourceMode === "file") {
        setSelectedFile(null);
      }
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Echec de l'import document.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="section-stack">
      <div className="field">
        <label htmlFor="document_type">Type</label>
        <select
          id="document_type"
          name="document_type"
          onChange={(event) => {
            setDocumentType(event.target.value as "cv" | "lettre");
            setSelectedFile(null);
          }}
          value={documentType}
        >
          <option value="cv">CV</option>
          <option value="lettre">Lettre</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="source_mode">Mode d&apos;import</label>
        <select
          id="source_mode"
          name="source_mode"
          onChange={(event) => {
            setSourceMode(event.target.value as "file" | "text");
            setStatus(null);
          }}
          value={sourceMode}
        >
          <option value="file">Charger un fichier</option>
          <option value="text">Coller le texte</option>
        </select>
      </div>

      {sourceMode === "file" ? (
        <div className="field">
          <label htmlFor="document_file">Fichier</label>
          <input
            accept={acceptedFormats}
            id="document_file"
            name="document_file"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            type="file"
          />
          <p className="muted">
            {documentType === "cv"
              ? "Formats acceptes au MVP: PDF, TXT ou Markdown. Les PDF scannes peuvent encore demander un collage manuel."
              : "Formats acceptes au MVP: TXT ou Markdown. Le collage manuel reste disponible si besoin."}
          </p>
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="source_filename">Nom du fichier</label>
        <input
          id="source_filename"
          name="source_filename"
          onChange={(event) => setSourceFilename(event.target.value)}
          readOnly={sourceMode === "file"}
          value={sourceFilename}
        />
      </div>

      {sourceMode === "text" ? (
        <div className="field">
          <label htmlFor="content_text">Contenu</label>
          <textarea
            id="content_text"
            name="content_text"
            onChange={(event) => setContentText(event.target.value)}
            rows={8}
            value={contentText}
          />
        </div>
      ) : null}

      <div className="run-controls-row">
        <button className="button-primary" disabled={submitting} onClick={() => void handleUploadOnly()} type="button">
          {submitting ? "Chargement..." : "Charger le document"}
        </button>
      </div>
      {status ? <p className="muted">{status}</p> : null}
    </div>
  );
}
