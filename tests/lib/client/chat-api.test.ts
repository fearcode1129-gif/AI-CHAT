import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createChat,
  deleteChat,
  fetchChatMessages,
  fetchChats,
  streamChat,
  updateChat
} from "@/lib/client/chat-api";

describe("chat api client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("fetches chats", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify([{ id: "chat-1", title: "A", updatedAt: "刚刚" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );

    const chats = await fetchChats();
    expect(chats).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/chats");
  });

  it("creates a chat", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "chat-1", title: "A", updatedAt: "刚刚" }), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      })
    );

    await createChat({ title: "A" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chats",
      expect.objectContaining({
        method: "POST"
      })
    );
  });

  it("fetches chat messages", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify([{ id: "m1", role: "user", content: "Hi", createdAt: "09:42" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );

    const messages = await fetchChatMessages("chat-1");
    expect(messages[0]?.id).toBe("m1");
  });

  it("updates a chat", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "chat-1", title: "Renamed", updatedAt: "刚刚" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );

    await updateChat("chat-1", { title: "Renamed" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chats/chat-1",
      expect.objectContaining({
        method: "PATCH"
      })
    );
  });

  it("deletes a chat", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await deleteChat("chat-1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chats/chat-1",
      expect.objectContaining({
        method: "DELETE"
      })
    );
  });

  it("streams chat events", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            'data: {"type":"meta","chatId":"chat-1","model":"qwen-plus"}\n\ndata: {"type":"delta","delta":"Hello"}\n\ndata: {"type":"done","chatId":"chat-1","model":"qwen-plus"}\n\n'
          )
        );
        controller.close();
      }
    });

    fetchMock.mockResolvedValueOnce(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" }
      })
    );

    const events: unknown[] = [];

    await streamChat(
      {
        messages: [{ role: "user", content: "hi" }]
      },
      new AbortController().signal,
      (event) => events.push(event)
    );

    expect(events).toEqual([
      { type: "meta", chatId: "chat-1", model: "qwen-plus" },
      { type: "delta", delta: "Hello" },
      { type: "done", chatId: "chat-1", model: "qwen-plus" }
    ]);
  });
});
