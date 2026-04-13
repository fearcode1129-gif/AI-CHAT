/* @vitest-environment jsdom */

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";

import { useChatStreaming } from "@/hooks/chat-workspace/use-chat-streaming";

vi.mock("@/lib/client/chat-api", () => ({
  streamChat: vi.fn()
}));

import { streamChat } from "@/lib/client/chat-api";

function Harness() {
  const [activeChatId, setActiveChatId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("hello");
  const [attachments, setAttachments] = React.useState([]);
  const [activeModel, setActiveModel] = React.useState<string | null>("qwen-plus");
  const [messagesByChat, setMessagesByChat] = React.useState({});
  const [chats, setChats] = React.useState([]);
      const [section, setSection] = React.useState("home");

  const state = useChatStreaming({
    activeChatId,
    activeMode: "fast",
    activeModel,
    attachments,
    draft,
    messagesByChat,
    setActiveChatId,
    setActiveSectionHome: () => setSection("home"),
    setChats,
    setMessagesByChat,
    setDraft,
    setAttachments,
    setActiveModel,
    syncChatSnapshot: vi.fn().mockResolvedValue(undefined)
  });

  return (
    <div>
      <button data-testid="send" onClick={() => void state.sendMessage()}>
        send
      </button>
      <button data-testid="stop" onClick={state.stopGeneration}>
        stop
      </button>
      <span data-testid="is-generating">{String(state.isGenerating)}</span>
      <span data-testid="section">{section}</span>
      <span data-testid="active-chat">{activeChatId ?? ""}</span>
      <span data-testid="chat-count">{chats.length}</span>
      <span data-testid="message-count">
        {activeChatId ? (messagesByChat as Record<string, unknown[]>)[activeChatId]?.length ?? 0 : 0}
      </span>
      <span data-testid="assistant-content">
        {activeChatId
          ? ((messagesByChat as Record<string, Array<{ content?: string }>>)[activeChatId]?.[1]?.content ??
            "")
          : ""}
      </span>
    </div>
  );
}

describe("useChatStreaming", () => {
  beforeEach(() => {
    vi.mocked(streamChat).mockImplementation(async (_payload, _signal, onEvent) => {
      onEvent({ type: "meta", chatId: "chat-1", model: "qwen-turbo" });
      onEvent({ type: "delta", delta: "Hello" });
      onEvent({ type: "done", chatId: "chat-1", model: "qwen-turbo" });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("starts a stream and switches back to home", async () => {
    const { getByTestId } = render(<Harness />);

    getByTestId("send").click();

    await waitFor(() => {
      expect(getByTestId("section").textContent).toBe("home");
      expect(getByTestId("active-chat").textContent).toBe("chat-1");
      expect(getByTestId("chat-count").textContent).toBe("1");
      expect(getByTestId("is-generating").textContent).toBe("false");
      expect(getByTestId("assistant-content").textContent).toBe("Hello");
    });
  });
});
