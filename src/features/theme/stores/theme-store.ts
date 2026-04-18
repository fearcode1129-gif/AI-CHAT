"use client";

import { create } from "zustand";

const STORAGE_KEY = "theme-mode";

export const THEMES = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" }
] as const;

export type ThemeMode = (typeof THEMES)[number]["id"];

type ThemeStore = {
  themeId: ThemeMode;
  initializeTheme: () => void;
  cycleTheme: () => void;
  reset: () => void;
};

function isThemeMode(value: string | null): value is ThemeMode {
  return THEMES.some((theme) => theme.id === value);
}

function applyTheme(themeId: ThemeMode) {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = themeId;
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, themeId);
  }
}

export const useThemeStore = create<ThemeStore>((set) => ({
  themeId: "light",
  initializeTheme: () => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    const nextTheme = isThemeMode(stored) ? stored : "light";
    applyTheme(nextTheme);
    set({ themeId: nextTheme });
  },
  cycleTheme: () =>
    set((state) => {
      const nextTheme = state.themeId === "light" ? "dark" : "light";
      applyTheme(nextTheme);
      return { themeId: nextTheme };
    }),
  reset: () => {
    applyTheme("light");
    set({ themeId: "light" });
  }
}));
