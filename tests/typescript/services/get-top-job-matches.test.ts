import { beforeEach, describe, expect, it, vi } from "vitest";

const getTopJobMatchesFromStore = vi.fn();

vi.mock("@/src/services/runtime/local-store", () => ({
  getTopJobMatchesFromStore
}));

describe("getTopJobMatches", () => {
  beforeEach(() => {
    getTopJobMatchesFromStore.mockReset();
  });

  it("filters by score, role and source, then sorts descending", async () => {
    getTopJobMatchesFromStore.mockReturnValue([
      {
        job: { id: "job-1", title: "Data Analyst", source: "France Travail" },
        match: { scoreGlobal: 74 }
      },
      {
        job: { id: "job-2", title: "Senior Data Analyst", source: "France Travail" },
        match: { scoreGlobal: 91 }
      },
      {
        job: { id: "job-3", title: "Data Engineer", source: "Jooble" },
        match: { scoreGlobal: 96 }
      }
    ]);

    const { getTopJobMatches } = await import("@/src/services/jobs/get-top-job-matches");
    const result = getTopJobMatches({
      minScore: 80,
      role: "analyst",
      source: "France Travail"
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.job.id).toBe("job-2");
  });

  it("keeps all results when no filter is provided and sorts by score", async () => {
    getTopJobMatchesFromStore.mockReturnValue([
      {
        job: { id: "job-1", title: "Data Analyst", source: "France Travail" },
        match: { scoreGlobal: 72 }
      },
      {
        job: { id: "job-2", title: "Data Engineer", source: "France Travail" },
        match: { scoreGlobal: 88 }
      }
    ]);

    const { getTopJobMatches } = await import("@/src/services/jobs/get-top-job-matches");
    const result = getTopJobMatches({});

    expect(result.map((item) => item.job.id)).toEqual(["job-2", "job-1"]);
  });
});
