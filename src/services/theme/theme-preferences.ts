export type AppTheme = "light" | "dark";

export const APP_THEME_STORAGE_KEY = "actu-emploi-theme";

export function normalizeTheme(value: string | null | undefined): AppTheme | undefined {
  if (value === "light" || value === "dark") {
    return value;
  }

  return undefined;
}

export function resolveThemePreference(
  storedTheme: string | null | undefined,
  prefersDark = false
): AppTheme {
  return normalizeTheme(storedTheme) ?? (prefersDark ? "dark" : "light");
}

export function getNextTheme(theme: AppTheme): AppTheme {
  return theme === "light" ? "dark" : "light";
}
