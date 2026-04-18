import { describe, expect, it } from "vitest";

import { useChatCacheStore } from "@/features/chat/stores/chat-cache-store";

describe("chat cache store", () => {
  it("supports updater functions for chats and messages", () => {
    const store = useChatCacheStore.getState();
    store.reset();

    store.setChats([{ id: "chat-1", title: "A", updatedAt: "刚刚" }]);
    store.setMessagesByChat({
      "chat-1": [{ id: "m1", role: "user", content: "hello", createdAt: "09:42" }]
    });

    store.setChats((current) => [...current, { id: "chat-2", title: "B", updatedAt: "刚刚" }]);
    store.setMessagesByChat((current) => ({
      ...current,
      "chat-2": [{ id: "m2", role: "assistant", content: "world", createdAt: "09:43" }]
    }));

    const next = useChatCacheStore.getState();
    expect(next.chats).toHaveLength(2);
    expect(next.messagesByChat["chat-2"]?.[0]?.content).toBe("world");

    next.reset();
  });
});
