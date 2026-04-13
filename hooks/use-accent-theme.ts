"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "theme-mode";

const THEMES = [
  { id: "light", label: "\u6d45\u8272" },
  { id: "dark", label: "\u6df1\u8272" }
] as const;

type ThemeMode = (typeof THEMES)[number]["id"];

function isThemeMode(value: string | null): value is ThemeMode {
  return THEMES.some((theme) => theme.id === value);
}

export function useAccentTheme() {
  const [themeId, setThemeId] = useState<ThemeMode>("light");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    const nextTheme = isThemeMode(stored) ? stored : "light";
    document.documentElement.dataset.theme = nextTheme;
    setThemeId(nextTheme);
  }, []);

  const cycleTheme = () => {
    setThemeId((current) => {
      const nextTheme = current === "light" ? "dark" : "light";
      document.documentElement.dataset.theme = nextTheme;
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
      return nextTheme;
    });
  };

  const activeTheme = useMemo(
    () => THEMES.find((theme) => theme.id === themeId) ?? THEMES[0],
    [themeId]
  );

  return {
    themeId,
    themeLabel: activeTheme.label,
    cycleTheme
  };
}
