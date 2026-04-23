import { describe, expect, it } from "vitest";
import { getJobDetailUrl } from "@/src/services/jobs/get-job-detail-url";

describe("getJobDetailUrl", () => {
  it("returns the explicit detail URL when present", () => {
    expect(
      getJobDetailUrl({
        source: "France Travail",
        sourceJobId: "207BVKT",
        detailUrl: "https://candidat.francetravail.fr/offres/recherche/detail/207BVKT"
      })
    ).toBe("https://candidat.francetravail.fr/offres/recherche/detail/207BVKT");
  });

  it("rebuilds a France Travail detail URL for legacy real snapshots", () => {
    expect(
      getJobDetailUrl({
        source: "France Travail",
        sourceJobId: "207BVKT"
      })
    ).toBe("https://candidat.francetravail.fr/offres/recherche/detail/207BVKT");
  });

  it("does not invent a URL for synthetic or unsupported IDs", () => {
    expect(
      getJobDetailUrl({
        source: "France Travail",
        sourceJobId: "FT-44711"
      })
    ).toBeUndefined();

    expect(
      getJobDetailUrl({
        source: "Jooble",
        sourceJobId: "JBL-982"
      })
    ).toBeUndefined();
  });
});
