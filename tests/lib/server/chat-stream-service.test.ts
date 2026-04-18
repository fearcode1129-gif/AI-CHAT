import { beforeEach, describe, expect, it, vi } from "vitest";

const repositoryMock = {
  updateChat: vi.fn(),
  createChat: vi.fn(),
  createUserMessage: vi.fn(),
  createAssistantPlaceholder: vi.fn(),
  finalizeAssistantMessage: vi.fn(),
  failAssistantMessage: vi.fn()
};
const attachmentRepositoryMock = {
  findByIds: vi.fn(),
  attachToMessage: vi.fn()
};
const recordDailyUsageMock = vi.fn();

const createDashScopeChatStreamMock = vi.fn();

vi.mock("@/features/chat/server/repositories/chat-repository", () => ({
  chatRepository: repositoryMock
}));

vi.mock("@/server/clients/dashscope-client", () => ({
  createDashScopeChatStream: createDashScopeChatStreamMock
}));

vi.mock("@/features/files/server/repositories/attachment-repository", () => ({
  attachmentRepository: attachmentRepositoryMock
}));

vi.mock("@/features/chat/server/knowledge/knowledge", () => ({
  retrieveKnowledgeContext: vi.fn(async () => [])
}));

vi.mock("@/features/usage/server/services/usage-service", () => ({
  recordDailyUsage: recordDailyUsageMock
}));

vi.mock("@/server/config/aliyun", async () => {
  const actual = await vi.importActual<typeof import("@/server/config/aliyun")>("@/server/config/aliyun");
  return {
    ...actual,
    resolveModelByMode: vi.fn((mode?: string) => (mode === "fast" ? "qwen-turbo" : "qwen-plus"))
  };
});

describe("chat stream service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    attachmentRepositoryMock.findByIds.mockResolvedValue([]);
    attachmentRepositoryMock.attachToMessage.mockResolvedValue([]);
    recordDailyUsageMock.mockResolvedValue(undefined);
  });

  it("creates a new chat and placeholder assistant when no chatId is provided", async () => {
    const upstream = {} as AsyncIterable<unknown>;
    const { startChatStream } = await import("@/features/chat/server/services/chat-stream-service");

    repositoryMock.createChat.mockResolvedValueOnce({ id: "chat-1" });
    repositoryMock.createUserMessage.mockResolvedValueOnce({});
    repositoryMock.createAssistantPlaceholder.mockResolvedValueOnce({ id: "msg-1" });
    createDashScopeChatStreamMock.mockResolvedValueOnce(upstream);

    const result = await startChatStream({
      userId: "user-1",
      mode: "fast",
      messages: [{ role: "user", content: "hello world" }]
    });

    expect(repositoryMock.createChat).toHaveBeenCalled();
    expect(repositoryMock.createUserMessage).toHaveBeenCalledWith("chat-1", "hello world");
    expect(repositoryMock.createAssistantPlaceholder).toHaveBeenCalledWith("chat-1", "qwen-turbo");
    expect(result).toEqual({
      chatId: "chat-1",
      model: "qwen-turbo",
      assistantMessageId: "msg-1",
      upstream
    });
  });

  it("finalizes assistant output and updates chat", async () => {
    const { finalizeChatStream } = await import("@/features/chat/server/services/chat-stream-service");

    await finalizeChatStream({
      userId: "user-1",
      plan: "free",
      chatId: "chat-1",
      assistantMessageId: "msg-1",
      content: "done",
      model: "qwen-plus",
      promptMessages: [{ role: "user", content: "hello world" }]
    });

    expect(repositoryMock.finalizeAssistantMessage).toHaveBeenCalledWith("msg-1", "done", "qwen-plus");
    expect(repositoryMock.updateChat).toHaveBeenCalledWith(
      "user-1",
      "chat-1",
      expect.objectContaining({ model: "qwen-plus" })
    );
    expect(recordDailyUsageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: "free",
        userId: "user-1",
        completionText: "done"
      })
    );
  });

  it("marks assistant output as failed", async () => {
    const { failChatStream } = await import("@/features/chat/server/services/chat-stream-service");

    await failChatStream({
      assistantMessageId: "msg-1",
      content: "error",
      model: "qwen-plus"
    });

    expect(repositoryMock.failAssistantMessage).toHaveBeenCalledWith("msg-1", "error", "qwen-plus");
  });

  it("injects extracted attachment text into model context", async () => {
    const upstream = {} as AsyncIterable<unknown>;
    const { startChatStream } = await import("@/features/chat/server/services/chat-stream-service");

    repositoryMock.createChat.mockResolvedValueOnce({ id: "chat-1" });
    repositoryMock.createUserMessage.mockResolvedValueOnce({ id: "user-1" });
    repositoryMock.createAssistantPlaceholder.mockResolvedValueOnce({ id: "msg-1" });
    attachmentRepositoryMock.findByIds.mockResolvedValueOnce([
      {
        id: "att-1",
        name: "resume.pdf",
        kind: "file",
        content: "Candidate resume body"
      }
    ]);
    createDashScopeChatStreamMock.mockResolvedValueOnce(upstream);

    await startChatStream({
      userId: "user-1",
      attachmentIds: ["att-1"],
      messages: [{ role: "user", content: "请分析我的简历" }]
    });

    expect(createDashScopeChatStreamMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "system",
            content: expect.stringContaining("Candidate resume body")
          })
        ])
      })
    );
    expect(attachmentRepositoryMock.attachToMessage).toHaveBeenCalledWith(["att-1"], {
      userId: "user-1",
      chatId: "chat-1",
      messageId: "user-1"
    });
  });
});
