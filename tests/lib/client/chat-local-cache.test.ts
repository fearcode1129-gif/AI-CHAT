/* @vitest-environment jsdom */

import { afterEach, describe, expect, it } from "vitest";

import {
  readCachedChatList,
  writeCachedChatList
} from "@/features/chat/client/chat-local-cache";

describe("chat local cache", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("stores and restores cached chat summaries", () => {
    writeCachedChatList([{ id: "chat-1", title: "Cached", updatedAt: "now" }]);

    expect(readCachedChatList()).toEqual([
      { id: "chat-1", title: "Cached", updatedAt: "now" }
    ]);
  });

  it("ignores malformed cache entries", () => {
    window.localStorage.setItem(
      "ai-chat:chat-list:v1",
      JSON.stringify({
        savedAt: Date.now(),
        chats: [{ id: "chat-1", title: "Valid" }, { id: 1, title: "Invalid" }]
      })
    );

    expect(readCachedChatList()).toEqual([{ id: "chat-1", title: "Valid" }]);
  });
});
