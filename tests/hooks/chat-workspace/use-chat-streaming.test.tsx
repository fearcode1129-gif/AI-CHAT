/* @vitest-environment jsdom */

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, waitFor } from "@testing-library/react";

import { useChatStreaming } from "@/features/chat/hooks/chat-workspace/use-chat-streaming";
import { useStreamTaskStore } from "@/features/chat/stores/stream-task-store";
import { useChatWorkspaceStore } from "@/features/chat/stores/chat-workspace-store";

vi.mock("@/features/chat/client/chat-api", () => ({
  createChat: vi.fn(),
  generateImage: vi.fn(),
  streamChat: vi.fn()
}));

import { createChat, streamChat } from "@/features/chat/client/chat-api";

type DeferredStream = {
  onEvent: (event: unknown) => void;
  resolve: () => void;
};

function Harness() {
  const [activeChatId, setActiveChatId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("hello");
  const [attachments, setAttachments] = React.useState([]);
  const [activeModel, setActiveModel] = React.useState<string | null>("qwen-plus");
  const [messagesByChat, setMessagesByChat] = React.useState({});
  const [chats, setChats] = React.useState([]);
  const [helperText, setHelperText] = React.useState("");
  const [section, setSection] = React.useState("home");

  const state = useChatStreaming({
    activeChatId,
    activeMode: "fast",
    activeModel,
    attachments,
    draft,
    isQuotaExceeded: false,
    messagesByChat,
    setActiveChatId,
    setActiveSectionHome: () => setSection("home"),
    setChats,
    setMessagesByChat,
    setDraft,
    setAttachments,
    setActiveModel,
    syncChatSnapshot: vi.fn().mockResolvedValue(undefined),
    syncChats: vi.fn().mockResolvedValue(undefined),
    setHelperText
  });

  return (
    <div>
      <button data-testid="send" onClick={() => void state.sendMessage()}>
        send
      </button>
      <button data-testid="stop" onClick={() => state.stopGeneration()}>
        stop
      </button>
      <input
        data-testid="draft"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <span data-testid="section">{section}</span>
      <span data-testid="active-chat">{activeChatId ?? ""}</span>
      <span data-testid="chat-count">{chats.length}</span>
      <span data-testid="helper-text">{helperText}</span>
    </div>
  );
}

describe("useChatStreaming", () => {
  const deferredStreams: DeferredStream[] = [];
  let resolveChat: ((value: { id: string; title: string; updatedAt: string; model?: string }) => void) | null =
    null;

  beforeEach(() => {
    deferredStreams.length = 0;
    resolveChat = null;

    vi.mocked(createChat).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveChat = resolve;
        })
    );

    vi.mocked(streamChat).mockImplementation(async (_payload, _signal, onEvent) => {
      await new Promise<void>((resolve) => {
        deferredStreams.push({
          onEvent,
          resolve
        });
      });
    });
  });

  afterEach(() => {
    useStreamTaskStore.getState().reset();
    useChatWorkspaceStore.getState().reset();
    vi.clearAllMocks();
  });

  it("reuses one real chat for multiple sends started from the same temporary chat", async () => {
    const { getByTestId } = render(<Harness />);

    fireEvent.click(getByTestId("send"));
    fireEvent.change(getByTestId("draft"), { target: { value: "follow up" } });
    fireEvent.click(getByTestId("send"));

    expect(createChat).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveChat?.({
        id: "chat-1",
        title: "hello",
        updatedAt: "刚刚",
        model: "qwen-turbo"
      });
    });

    await waitFor(() => {
      expect(getByTestId("chat-count").textContent).toBe("1");
      expect(vi.mocked(streamChat)).toHaveBeenCalledTimes(2);
    });

    const payloads = vi.mocked(streamChat).mock.calls.map((call) => call[0]);
    expect(payloads[0]?.chatId).toBe("chat-1");
    expect(payloads[1]?.chatId).toBe("chat-1");
    expect(useStreamTaskStore.getState().activeStreamIdsByChat["chat-1"]).toHaveLength(2);

    await act(async () => {
      deferredStreams[0]?.onEvent({ type: "meta", chatId: "chat-1", model: "qwen-turbo" });
      deferredStreams[1]?.onEvent({ type: "meta", chatId: "chat-1", model: "qwen-turbo" });
      deferredStreams[0]?.onEvent({ type: "done", chatId: "chat-1", model: "qwen-turbo" });
      deferredStreams[1]?.onEvent({ type: "done", chatId: "chat-1", model: "qwen-turbo" });
      deferredStreams[0]?.resolve();
      deferredStreams[1]?.resolve();
    });

    await waitFor(() => {
      expect(useStreamTaskStore.getState().activeStreamIdsByChat["chat-1"]).toBeUndefined();
    });
  });
});
