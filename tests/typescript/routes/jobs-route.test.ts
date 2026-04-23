import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getTopJobMatches = vi.fn();

vi.mock("@/src/services/jobs/get-top-job-matches", () => ({
  getTopJobMatches
}));

describe("GET /api/jobs", () => {
  beforeEach(() => {
    getTopJobMatches.mockReset();
  });

  it("returns the filtered items and forwards query params to the service", async () => {
    getTopJobMatches.mockReturnValue([
      { job: { id: "job-1" }, match: { scoreGlobal: 88 } }
    ]);

    const { GET } = await import("@/app/api/jobs/route");
    const request = new NextRequest("http://localhost:3000/api/jobs?min_score=80&role=analyst&source=France%20Travail");
    const response = GET(request);

    expect(getTopJobMatches).toHaveBeenCalledWith({
      minScore: 80,
      role: "analyst",
      source: "France Travail"
    });
    await expect(response.json()).resolves.toEqual({
      count: 1,
      items: [{ job: { id: "job-1" }, match: { scoreGlobal: 88 } }]
    });
  });
});
