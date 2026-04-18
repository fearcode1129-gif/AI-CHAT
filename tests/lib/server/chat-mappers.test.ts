import { describe, expect, it, vi } from "vitest";

import { toChatSummary, toClientMessage } from "@/features/chat/server/mappers/chat-mappers";

describe("chat mappers", () => {
  it("maps chat entities to summaries", () => {
    vi.setSystemTime(new Date("2026-04-10T12:00:00Z"));

    const summary = toChatSummary({
      id: "chat-1",
      title: "Test",
      pinned: true,
      model: "qwen-plus",
      createdAt: new Date("2026-04-10T10:00:00Z"),
      updatedAt: new Date("2026-04-10T11:00:00Z"),
      userId: null
    });

    expect(summary).toEqual({
      id: "chat-1",
      title: "Test",
      pinned: true,
      updatedAt: "1 小时前",
      model: "qwen-plus"
    });

    vi.useRealTimers();
  });

  it("maps message entities to client messages", () => {
    const message = toClientMessage({
      id: "msg-1",
      role: "assistant",
      content: "Hello",
      status: "done",
      model: "qwen-plus",
      createdAt: new Date("2026-04-10T09:42:00+08:00"),
      updatedAt: new Date("2026-04-10T09:43:00+08:00"),
      chatId: "chat-1"
    });

    expect(message.id).toBe("msg-1");
    expect(message.role).toBe("assistant");
    expect(message.content).toBe("Hello");
    expect(message.status).toBe("done");
    expect(message.model).toBe("qwen-plus");
  });
});
