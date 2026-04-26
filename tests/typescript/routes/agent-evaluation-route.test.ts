import { describe, expect, it, vi } from "vitest";

const evaluateAgenticRelevance = vi.fn();

vi.mock("@/src/services/agents/evaluate-agentic-relevance", () => ({
  evaluateAgenticRelevance
}));

describe("POST /api/agents/evaluation", () => {
  it("returns the evaluation result", async () => {
    evaluateAgenticRelevance.mockReturnValue({
      ok: true,
      value: {
        cases_count: 1,
        baseline: { overall_score: 0.5 },
        enhanced: { overall_score: 0.75 },
        gain: { overall_score: 0.25 },
        cases: []
      }
    });

    const { POST } = await import("@/app/api/agents/evaluation/route");
    const response = POST();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      cases_count: 1,
      baseline: { overall_score: 0.5 },
      enhanced: { overall_score: 0.75 },
      gain: { overall_score: 0.25 },
      cases: []
    });
  });

  it("returns 500 when evaluation fails", async () => {
    evaluateAgenticRelevance.mockReturnValue({
      ok: false,
      error: "boom"
    });

    const { POST } = await import("@/app/api/agents/evaluation/route");
    const response = POST();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "boom" });
  });
});
