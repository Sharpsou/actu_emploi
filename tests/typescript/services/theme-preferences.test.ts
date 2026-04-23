import { describe, expect, it } from "vitest";
import {
  getNextTheme,
  normalizeTheme,
  resolveThemePreference
} from "@/src/services/theme/theme-preferences";

describe("theme preferences", () => {
  it("keeps only supported theme values", () => {
    expect(normalizeTheme("light")).toBe("light");
    expect(normalizeTheme("dark")).toBe("dark");
    expect(normalizeTheme("sepia")).toBeUndefined();
    expect(normalizeTheme(null)).toBeUndefined();
  });

  it("resolves the stored theme before system preference", () => {
    expect(resolveThemePreference("dark", false)).toBe("dark");
    expect(resolveThemePreference("light", true)).toBe("light");
  });

  it("falls back to system preference and toggles cleanly", () => {
    expect(resolveThemePreference(undefined, true)).toBe("dark");
    expect(resolveThemePreference(undefined, false)).toBe("light");
    expect(getNextTheme("light")).toBe("dark");
    expect(getNextTheme("dark")).toBe("light");
  });
});
