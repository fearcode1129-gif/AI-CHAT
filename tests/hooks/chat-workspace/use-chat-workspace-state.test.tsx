/* @vitest-environment jsdom */

import React from "react";
import { describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach } from "vitest";

import { useChatWorkspaceState } from "@/features/chat/hooks/chat-workspace/use-chat-workspace-state";
import { useChatWorkspaceStore } from "@/features/chat/stores/chat-workspace-store";

function Harness() {
  const state = useChatWorkspaceState();

  return (
    <div>
      <button data-testid="select" onClick={() => state.selectChat("chat-1")}>
        select
      </button>
      <button data-testid="new" onClick={() => state.createNewChat("prefill")}>
        new
      </button>
      <span data-testid="section">{state.activeSection}</span>
      <span data-testid="chat-id">{state.activeChatId ?? ""}</span>
      <span data-testid="draft">{state.draft}</span>
    </div>
  );
}

describe("useChatWorkspaceState", () => {
  afterEach(() => {
    useChatWorkspaceStore.getState().reset();
    cleanup();
  });

  it("selects a chat and returns to home", () => {
    const { getByTestId } = render(<Harness />);

    fireEvent.click(getByTestId("select"));

    expect(getByTestId("chat-id").textContent).toBe("chat-1");
    expect(getByTestId("section").textContent).toBe("home");
  });

  it("creates a new chat state with prefill", () => {
    const { getByTestId } = render(<Harness />);

    fireEvent.click(getByTestId("new"));

    expect(getByTestId("chat-id").textContent).toBe("");
    expect(getByTestId("draft").textContent).toBe("prefill");
    expect(getByTestId("section").textContent).toBe("home");
  });
});
