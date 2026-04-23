"use client";

import { useEffect, useState } from "react";
import {
  APP_THEME_STORAGE_KEY,
  getNextTheme,
  resolveThemePreference,
  type AppTheme
} from "@/src/services/theme/theme-preferences";

function applyTheme(theme: AppTheme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem(APP_THEME_STORAGE_KEY, theme);
}

function readThemePreference() {
  return resolveThemePreference(
    window.localStorage.getItem(APP_THEME_STORAGE_KEY),
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<AppTheme>("light");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const nextTheme = readThemePreference();
    applyTheme(nextTheme);
    setTheme(nextTheme);
    setIsReady(true);
  }, []);

  const handleToggle = () => {
    const nextTheme = getNextTheme(theme);
    applyTheme(nextTheme);
    setTheme(nextTheme);
  };

  const nextThemeLabel = theme === "light" ? "theme sombre" : "theme clair";

  return (
    <button
      aria-label={isReady ? `Passer au ${nextThemeLabel}` : "Changer de theme"}
      className="button-secondary theme-toggle"
      onClick={handleToggle}
      type="button"
    >
      {isReady ? `Passer au ${nextThemeLabel}` : "Changer de theme"}
    </button>
  );
}
