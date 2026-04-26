"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ManualSkillForm() {
  const router = useRouter();
  const [skillName, setSkillName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function addSkill() {
    setSubmitting(true);
    setStatus(null);

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ skill_name: skillName })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Impossible d'ajouter la competence.");
      }

      setSkillName("");
      setStatus("Competence ajoutee au profil.");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Impossible d'ajouter la competence.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="form-stack">
      <div className="field">
        <label htmlFor="manual_skill">Competence manuelle</label>
        <input
          id="manual_skill"
          onChange={(event) => setSkillName(event.target.value)}
          placeholder="Ex: Snowflake, Streamlit, Docker"
          value={skillName}
        />
      </div>
      <button className="button-secondary" disabled={submitting || !skillName.trim()} onClick={() => void addSkill()} type="button">
        Ajouter au profil
      </button>
      {status ? <p className="muted">{status}</p> : null}
    </div>
  );
}
