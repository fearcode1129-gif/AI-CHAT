import { describe, expect, it } from "vitest";

import {
  CHAT_TITLE_MAX_LENGTH,
  DEFAULT_ASSISTANT_MODEL,
  DEFAULT_NEW_CHAT_TITLE
} from "@/lib/constants/chat";

describe("chat constants", () => {
  it("exposes stable chat title length", () => {
    expect(CHAT_TITLE_MAX_LENGTH).toBe(18);
  });

  it("exposes default labels", () => {
    expect(DEFAULT_NEW_CHAT_TITLE).toBe("新的对话");
    expect(DEFAULT_ASSISTANT_MODEL).toBe("qwen-plus");
  });
});
