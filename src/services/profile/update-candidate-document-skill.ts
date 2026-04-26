import { z } from "zod";
import { getStoredCandidateDocuments, saveStoredCandidateDocuments } from "@/src/services/runtime/local-store";

const updateCandidateDocumentSkillSchema = z.object({
  document_id: z.string().trim().min(1),
  skill_name: z.string().trim().min(1),
  action: z.enum(["add", "remove"])
});

type UpdateCandidateDocumentSkillResult =
  | { ok: true; value: ReturnType<typeof getStoredCandidateDocuments>[number] }
  | { ok: false; error: string };

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeSkill(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function mergeSkill(skills: string[], skillName: string) {
  const byLowercase = new Map(skills.map((skill) => [skill.toLowerCase(), skill]));
  byLowercase.set(skillName.toLowerCase(), byLowercase.get(skillName.toLowerCase()) ?? skillName);
  return Array.from(byLowercase.values()).sort((left, right) => left.localeCompare(right));
}

function removeSkill(skills: string[], skillName: string) {
  return skills.filter((skill) => skill.toLowerCase() !== skillName.toLowerCase());
}

function updateOverrides(parsedJson: Record<string, unknown>, skillName: string, action: "add" | "remove") {
  const current =
    parsedJson.manual_skill_overrides && typeof parsedJson.manual_skill_overrides === "object"
      ? (parsedJson.manual_skill_overrides as Record<string, unknown>)
      : {};
  const added = readStringArray(current.added);
  const removed = readStringArray(current.removed);

  return {
    added: action === "add" ? mergeSkill(removeSkill(added, skillName), skillName) : removeSkill(added, skillName),
    removed: action === "remove" ? mergeSkill(removeSkill(removed, skillName), skillName) : removeSkill(removed, skillName)
  };
}

function updateSkillSignals(parsedJson: Record<string, unknown>, skillName: string, action: "add" | "remove") {
  const signals = Array.isArray(parsedJson.skill_signals) ? parsedJson.skill_signals : [];
  const filtered = signals.filter((signal) => {
    if (!signal || typeof signal !== "object") {
      return true;
    }
    const candidate = signal as Record<string, unknown>;
    return typeof candidate.skill_name !== "string" || candidate.skill_name.toLowerCase() !== skillName.toLowerCase();
  });

  if (action === "remove") {
    return filtered;
  }

  return [
    ...filtered,
    {
      skill_name: skillName,
      source: "manual_correction",
      evidence_text: "Competence ajoutee manuellement depuis l'interface profil.",
      confidence_score: 100
    }
  ];
}

export function updateCandidateDocumentSkill(input: unknown): UpdateCandidateDocumentSkillResult {
  const parsed = updateCandidateDocumentSkillSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Correction de competence invalide."
    };
  }

  const skillName = normalizeSkill(parsed.data.skill_name);
  const documents = getStoredCandidateDocuments();
  const documentIndex = documents.findIndex((document) => document.id === parsed.data.document_id);

  if (documentIndex < 0) {
    return {
      ok: false,
      error: "Document introuvable."
    };
  }

  const document = documents[documentIndex];
  const currentSkills = readStringArray(document.parsedJson.detected_skills);
  const nextSkills =
    parsed.data.action === "add" ? mergeSkill(currentSkills, skillName) : removeSkill(currentSkills, skillName);
  const nextDocument = {
    ...document,
    parsedJson: {
      ...document.parsedJson,
      detected_skills: nextSkills,
      skill_signals: updateSkillSignals(document.parsedJson, skillName, parsed.data.action),
      manual_skill_overrides: updateOverrides(document.parsedJson, skillName, parsed.data.action),
      profile_signals: {
        ...(document.parsedJson.profile_signals && typeof document.parsedJson.profile_signals === "object"
          ? (document.parsedJson.profile_signals as Record<string, unknown>)
          : {}),
        skills_count: nextSkills.length
      }
    }
  };

  const nextDocuments = documents.map((item, index) => (index === documentIndex ? nextDocument : item));
  saveStoredCandidateDocuments(nextDocuments);

  return {
    ok: true,
    value: nextDocument
  };
}
