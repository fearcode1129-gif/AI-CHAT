import { describe, expect, it } from "vitest";

import {
  appendAssistantDelta,
  createDraftMessages,
  moveChatMessages,
  updateAssistantMessage
} from "@/features/chat/hooks/chat-workspace/message-state";

describe("chat workspace message state helpers", () => {
  it("creates draft user and assistant messages", () => {
    const draft = createDraftMessages("hello", []);

    expect(draft.userMessage.role).toBe("user");
    expect(draft.userMessage.content).toBe("hello");
    expect(draft.assistantMessage.role).toBe("assistant");
    expect(draft.assistantMessage.status).toBe("streaming");
  });

  it("appends assistant delta to the correct message", () => {
    const result = appendAssistantDelta(
      {
        "chat-1": [
          { id: "m1", role: "assistant", content: "Hel", createdAt: "现在" }
        ]
      },
      "chat-1",
      "m1",
      "lo",
      "qwen-plus"
    );

    expect(result["chat-1"]?.[0]).toMatchObject({
      content: "Hello",
      model: "qwen-plus"
    });
  });

  it("updates the target assistant message only", () => {
    const result = updateAssistantMessage(
      {
        "chat-1": [
          { id: "m1", role: "assistant", content: "A", createdAt: "现在" },
          { id: "m2", role: "assistant", content: "B", createdAt: "现在" }
        ]
      },
      "chat-1",
      "m2",
      (message) => ({ ...message, status: "done" })
    );

    expect(result["chat-1"]?.[0]).not.toHaveProperty("status");
    expect(result["chat-1"]?.[1]).toMatchObject({ status: "done" });
  });

  it("moves draft messages to the real chat id", () => {
    const result = moveChatMessages(
      {
        draft: [{ id: "m1", role: "assistant", content: "Hello", createdAt: "现在" }]
      },
      "draft",
      "chat-1"
    );

    expect(result.draft).toBeUndefined();
    expect(result["chat-1"]?.[0]?.content).toBe("Hello");
  });
});
