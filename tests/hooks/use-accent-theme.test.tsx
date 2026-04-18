/* @vitest-environment jsdom */

import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";

import { useAccentTheme } from "@/features/theme/hooks/use-accent-theme";
import { useThemeStore } from "@/features/theme/stores/theme-store";

function Harness() {
  const { themeLabel, cycleTheme } = useAccentTheme();

  return (
    <div>
      <span data-testid="theme-label">{themeLabel}</span>
      <button data-testid="cycle" onClick={cycleTheme}>
        cycle
      </button>
    </div>
  );
}

describe("useAccentTheme", () => {
  afterEach(() => {
    window.localStorage.clear();
    useThemeStore.getState().reset();
    cleanup();
  });

  it("hydrates the theme from localStorage", () => {
    window.localStorage.setItem("theme-mode", "dark");

    const { getByTestId } = render(<Harness />);

    expect(getByTestId("theme-label").textContent).toBe("Dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("cycles theme and persists the next value", () => {
    const { getByTestId } = render(<Harness />);

    fireEvent.click(getByTestId("cycle"));

    expect(getByTestId("theme-label").textContent).toBe("Dark");
    expect(window.localStorage.getItem("theme-mode")).toBe("dark");
  });
});
