/* @vitest-environment jsdom */

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";

import { useChatHydration } from "@/features/chat/hooks/chat-workspace/use-chat-hydration";
import type { Message } from "@/shared/types";
import { useChatCacheStore } from "@/features/chat/stores/chat-cache-store";

vi.mock("@/features/chat/client/chat-api", () => ({
  fetchChats: vi.fn(),
  fetchChatMessages: vi.fn()
}));

import { fetchChatMessages, fetchChats } from "@/features/chat/client/chat-api";

function Harness({
  activeChatId,
  seedMessages
}: {
  activeChatId: string | null;
  seedMessages?: Record<string, Message[]>;
}) {
  const state = useChatHydration({ activeChatId });

  React.useEffect(() => {
    if (!seedMessages) {
      return;
    }

    state.setMessagesByChat(seedMessages);
  }, [seedMessages, state]);

  return (
    <div>
      <span data-testid="chat-count">{state.chats.length}</span>
      <span data-testid="hydrating">{String(state.isHydrating)}</span>
      <span data-testid="message-count">
        {activeChatId ? state.messagesByChat[activeChatId]?.length ?? 0 : 0}
      </span>
    </div>
  );
}

describe("useChatHydration", () => {
  beforeEach(() => {
    vi.mocked(fetchChats).mockResolvedValue([{ id: "chat-1", title: "A", updatedAt: "刚刚" }]);
    vi.mocked(fetchChatMessages).mockResolvedValue([
      { id: "m1", role: "user", content: "Hello", createdAt: "09:42" }
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
    useChatCacheStore.getState().reset();
    cleanup();
  });

  it("hydrates chats on mount", async () => {
    const { getByTestId } = render(<Harness activeChatId={null} />);

    await waitFor(() => {
      expect(getByTestId("chat-count").textContent).toBe("1");
      expect(getByTestId("hydrating").textContent).toBe("false");
    });
  });

  it("hydrates messages when active chat changes", async () => {
    const { getByTestId } = render(<Harness activeChatId="chat-1" />);

    await waitFor(() => {
      expect(getByTestId("message-count").textContent).toBe("1");
    });
  });

  it("does not overwrite optimistic local messages for the active chat", async () => {
    const { getByTestId } = render(
      <Harness
        activeChatId="chat-1"
        seedMessages={{
          "chat-1": [{ id: "draft-user", role: "user", content: "Local", createdAt: "09:42" }]
        }}
      />
    );

    await waitFor(() => {
      expect(getByTestId("message-count").textContent).toBe("1");
    });

    expect(fetchChatMessages).not.toHaveBeenCalled();
  });

  it("does not fetch messages for a temporary draft chat id", async () => {
    render(<Harness activeChatId="chat-temp-1" />);

    await waitFor(() => {
      expect(fetchChats).toHaveBeenCalledTimes(1);
    });

    expect(fetchChatMessages).not.toHaveBeenCalled();
  });
});
