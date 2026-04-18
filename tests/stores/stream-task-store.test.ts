import { afterEach, describe, expect, it } from "vitest";

import { useStreamTaskStore } from "@/features/chat/stores/stream-task-store";

describe("stream-task-store", () => {
  afterEach(() => {
    useStreamTaskStore.getState().reset();
  });

  it("moves active streams to the resolved chat id and completes them independently", () => {
    const store = useStreamTaskStore.getState();

    store.startTask({
      streamId: "stream-1",
      chatId: "chat-temp-1",
      userMessageId: "user-1",
      assistantMessageId: "assistant-1",
      status: "pending",
      startedAt: Date.now()
    });
    store.startTask({
      streamId: "stream-2",
      chatId: "chat-temp-1",
      userMessageId: "user-2",
      assistantMessageId: "assistant-2",
      status: "pending",
      startedAt: Date.now()
    });

    store.moveChatTasks("chat-temp-1", "chat-1");
    store.completeTask("stream-1", "done");

    const next = useStreamTaskStore.getState();
    expect(next.tasksById["stream-1"]?.chatId).toBe("chat-1");
    expect(next.tasksById["stream-2"]?.chatId).toBe("chat-1");
    expect(next.activeStreamIdsByChat["chat-1"]).toEqual(["stream-2"]);
  });
});
