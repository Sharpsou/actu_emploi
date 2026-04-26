import { afterEach, describe, expect, it, vi } from "vitest";

const getStoredCandidateProfile = vi.fn();
const saveStoredCandidateProfile = vi.fn();

vi.mock("@/src/services/runtime/local-store", () => ({
  getStoredCandidateProfile,
  saveStoredCandidateProfile
}));

describe("addManualProfileSkill", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    getStoredCandidateProfile.mockReset();
    saveStoredCandidateProfile.mockReset();
  });

  it("adds a manual skill without duplicating existing skills case-insensitively", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-26T08:00:00.000Z"));
    getStoredCandidateProfile.mockReturnValue({
      id: "profile-main",
      targetRoles: ["Data Analyst"],
      preferredSkills: ["SQL"],
      excludedKeywords: [],
      preferredLocations: ["Nantes"],
      notes: "",
      updatedAt: "2026-04-25T00:00:00.000Z"
    });
    saveStoredCandidateProfile.mockImplementation((profile) => profile);

    const { addManualProfileSkill } = await import("@/src/services/profile/add-manual-profile-skill");
    const result = addManualProfileSkill({ skill_name: "sql" });

    expect(result.ok).toBe(true);
    expect(saveStoredCandidateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        preferredSkills: ["SQL"],
        updatedAt: "2026-04-26T08:00:00.000Z"
      })
    );
  });
});
