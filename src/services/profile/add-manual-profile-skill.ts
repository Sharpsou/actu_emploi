import { z } from "zod";
import { getStoredCandidateProfile, saveStoredCandidateProfile } from "@/src/services/runtime/local-store";

const manualSkillSchema = z.object({
  skill_name: z.string().trim().min(1)
});

type AddManualProfileSkillResult =
  | { ok: true; value: ReturnType<typeof getStoredCandidateProfile> }
  | { ok: false; error: string };

export function addManualProfileSkill(input: unknown): AddManualProfileSkillResult {
  const parsed = manualSkillSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Competence invalide."
    };
  }

  const profile = getStoredCandidateProfile();
  const skillName = parsed.data.skill_name;
  const existing = new Map(profile.preferredSkills.map((skill) => [skill.toLowerCase(), skill]));
  if (!existing.has(skillName.toLowerCase())) {
    existing.set(skillName.toLowerCase(), skillName);
  }

  return {
    ok: true,
    value: saveStoredCandidateProfile({
      ...profile,
      preferredSkills: Array.from(existing.values()).sort(),
      updatedAt: new Date().toISOString()
    })
  };
}
