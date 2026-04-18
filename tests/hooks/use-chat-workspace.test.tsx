/* @vitest-environment jsdom */

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";

import { useChatWorkspace } from "@/features/chat/hooks/use-chat-workspace";

vi.mock("@/features/chat/client/chat-api", () => ({
  fetchChats: vi.fn(),
  fetchChatMessages: vi.fn(),
  createChat: vi.fn(),
  streamChat: vi.fn(),
  updateChat: vi.fn(),
  deleteChat: vi.fn(),
  uploadFiles: vi.fn()
}));

import {
  deleteChat,
  fetchChatMessages,
  fetchChats,
  streamChat,
  updateChat
} from "@/features/chat/client/chat-api";
import { useChatCacheStore } from "@/features/chat/stores/chat-cache-store";
import { useStreamTaskStore } from "@/features/chat/stores/stream-task-store";
import { useChatWorkspaceStore } from "@/features/chat/stores/chat-workspace-store";

function Harness() {
  const state = useChatWorkspace();

  return (
    <div>
      <button data-testid="rename" onClick={() => void state.renameChat("chat-1", "Renamed")}>
        rename
      </button>
      <button data-testid="pin" onClick={() => void state.togglePinnedChat("chat-1")}>
        pin
      </button>
      <button data-testid="delete" onClick={() => void state.removeChat("chat-1")}>
        delete
      </button>
      <span data-testid="chat-count">{state.chats.length}</span>
      <span data-testid="first-title">{state.chats[0]?.title ?? ""}</span>
      <span data-testid="first-pinned">{String(Boolean(state.chats[0]?.pinned))}</span>
    </div>
  );
}

describe("useChatWorkspace recent chat actions", () => {
  beforeEach(() => {
    vi.mocked(fetchChats).mockResolvedValue([
      { id: "chat-1", title: "Original", updatedAt: "刚刚", pinned: false },
      { id: "chat-2", title: "Another", updatedAt: "1 小时前", pinned: false }
    ]);
    vi.mocked(fetchChatMessages).mockResolvedValue([]);
    vi.mocked(streamChat).mockResolvedValue(undefined);
    vi.mocked(updateChat).mockImplementation(async (chatId, payload) => ({
      id: chatId,
      title: payload.title ?? "Original",
      updatedAt: "刚刚",
      pinned: payload.pinned ?? false,
      model: payload.model
    }));
    vi.mocked(deleteChat).mockResolvedValue(undefined);
  });

  afterEach(() => {
    useChatCacheStore.getState().reset();
    useStreamTaskStore.getState().reset();
    useChatWorkspaceStore.getState().reset();
    cleanup();
    vi.clearAllMocks();
  });

  it("renames a chat through the hook action", async () => {
    const { getByTestId } = render(<Harness />);

    await waitFor(() => {
      expect(getByTestId("chat-count").textContent).toBe("2");
    });

    fireEvent.click(getByTestId("rename"));

    await waitFor(() => {
      expect(getByTestId("first-title").textContent).toBe("Renamed");
    });
  });

  it("pins a chat through the hook action", async () => {
    const { getByTestId } = render(<Harness />);

    await waitFor(() => {
      expect(getByTestId("chat-count").textContent).toBe("2");
    });

    fireEvent.click(getByTestId("pin"));

    await waitFor(() => {
      expect(getByTestId("first-pinned").textContent).toBe("true");
    });
  });

  it("deletes a chat through the hook action", async () => {
    const { getByTestId } = render(<Harness />);

    await waitFor(() => {
      expect(getByTestId("chat-count").textContent).toBe("2");
    });

    fireEvent.click(getByTestId("delete"));

    await waitFor(() => {
      expect(getByTestId("chat-count").textContent).toBe("1");
    });
  });
});
