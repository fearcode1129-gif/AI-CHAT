/* @vitest-environment jsdom */

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";

import { useUsageCredits } from "@/features/usage/hooks/use-usage-credits";
import { useUsageStore } from "@/features/usage/stores/usage-store";

vi.mock("@/features/chat/client/chat-api", () => ({
  fetchUsage: vi.fn()
}));

import { fetchUsage } from "@/features/chat/client/chat-api";

function Harness() {
  const { usage, isLoading, error } = useUsageCredits();

  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="remaining">{usage?.remainingTokens ?? ""}</span>
      <span data-testid="error">{error ?? ""}</span>
    </div>
  );
}

describe("useUsageCredits", () => {
  beforeEach(() => {
    vi.mocked(fetchUsage).mockResolvedValue({
      plan: "free",
      tierLabel: "免费版",
      memberLabel: "免费会员",
      limitTokens: 20000,
      usedTokens: 1800,
      remainingTokens: 18200,
      percentUsed: 9,
      isExceeded: false,
      isNearLimit: false,
      dateKey: "2026-04-14"
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    useUsageStore.getState().reset();
    cleanup();
  });

  it("loads usage credits through the zustand store", async () => {
    const { getByTestId } = render(<Harness />);

    await waitFor(() => {
      expect(getByTestId("loading").textContent).toBe("false");
      expect(getByTestId("remaining").textContent).toBe("18200");
    });
  });
});
