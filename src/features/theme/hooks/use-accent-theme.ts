"use client";

import { useEffect, useMemo } from "react";

import { THEMES, useThemeStore } from "@/features/theme/stores/theme-store";

export function useAccentTheme() {
  const themeId = useThemeStore((state) => state.themeId);
  const initializeTheme = useThemeStore((state) => state.initializeTheme);
  const cycleTheme = useThemeStore((state) => state.cycleTheme);

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

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
