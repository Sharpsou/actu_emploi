"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DocumentSkillEditorProps = {
  documentId: string;
  skills: string[];
};

export function DocumentSkillEditor({ documentId, skills }: DocumentSkillEditorProps) {
  const router = useRouter();
  const [skillName, setSkillName] = useState("");
  const [pendingSkill, setPendingSkill] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function updateSkill(action: "add" | "remove", nextSkillName: string) {
    setPendingSkill(nextSkillName);
    setStatus(null);

    try {
      const response = await fetch("/api/profile/documents/skills", {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          document_id: documentId,
          skill_name: nextSkillName,
          action
        })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Impossible de corriger la competence.");
      }

      if (action === "add") {
        setSkillName("");
      }
      setStatus(action === "add" ? "Competence ajoutee." : "Competence retiree.");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Impossible de corriger la competence.");
    } finally {
      setPendingSkill(null);
    }
  }

  return (
    <div className="document-skill-editor">
      {skills.length > 0 ? (
        <div className="tag-list">
          {skills.map((skill) => (
            <span className="tag editable-tag" key={skill}>
              {skill}
              <button
                aria-label={`Retirer ${skill}`}
                disabled={pendingSkill === skill}
                onClick={() => void updateSkill("remove", skill)}
                title={`Retirer ${skill}`}
                type="button"
              >
                x
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="document-skill-add">
        <input
          aria-label="Competence detectee"
          onChange={(event) => setSkillName(event.target.value)}
          placeholder="Ex: Rigueur, Docker, Communication"
          value={skillName}
        />
        <button
          className="button-secondary"
          disabled={Boolean(pendingSkill) || !skillName.trim()}
          onClick={() => void updateSkill("add", skillName)}
          type="button"
        >
          Ajouter
        </button>
      </div>
      {status ? <p className="muted">{status}</p> : null}
    </div>
  );
}
