import { describe, expect, it } from "vitest";
import { buildRefreshPageUrl } from "@/src/services/runtime/refresh-page-url";

describe("buildRefreshPageUrl", () => {
  it("adds a refresh token to the current URL", () => {
    expect(buildRefreshPageUrl("http://localhost:3000/")).toMatch(/^http:\/\/localhost:3000\/\?refresh=\d+$/);
  });

  it("reuses the explicit refresh token when available", () => {
    expect(buildRefreshPageUrl("http://localhost:3000/?foo=bar", "2026-04-24T08:00:00Z")).toBe(
      "http://localhost:3000/?foo=bar&refresh=2026-04-24T08%3A00%3A00Z"
    );
  });

  it("replaces any previous refresh query param", () => {
    expect(buildRefreshPageUrl("http://localhost:3000/?refresh=old&foo=bar", "next")).toBe(
      "http://localhost:3000/?refresh=next&foo=bar"
    );
  });
});
