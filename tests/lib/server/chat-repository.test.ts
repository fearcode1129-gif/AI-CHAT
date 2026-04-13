import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = {
  chat: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  message: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  }
};

vi.mock("@/lib/server/db", () => ({
  db: dbMock
}));

describe("chatRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists chats with pinned and updated ordering", async () => {
    const { chatRepository } = await import("@/lib/server/repositories/chat-repository");
    dbMock.chat.findMany.mockResolvedValueOnce([]);

    await chatRepository.listChats("user-1");

    expect(dbMock.chat.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }]
    });
  });

  it("creates a user message with done status", async () => {
    const { chatRepository } = await import("@/lib/server/repositories/chat-repository");
    dbMock.message.create.mockResolvedValueOnce({});

    await chatRepository.createUserMessage("chat-1", "hello");

    expect(dbMock.message.create).toHaveBeenCalledWith({
      data: {
        chatId: "chat-1",
        role: "user",
        content: "hello",
        status: "done"
      }
    });
  });
});
