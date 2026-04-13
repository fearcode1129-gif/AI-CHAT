import { db } from "@/lib/server/db";

export const chatRepository = {
  listChats(userId: string) {
    return db.chat.findMany({
      where: { userId },
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }]
    });
  },

  createChat(data: { title: string; model?: string; userId: string }) {
    return db.chat.create({
      data
    });
  },

  async updateChat(
    userId: string,
    id: string,
    data: {
      title?: string;
      pinned?: boolean;
      model?: string;
      updatedAt?: Date;
    }
  ) {
    const chat = await db.chat.findFirst({
      where: { id, userId }
    });

    if (!chat) {
      throw new Error("Chat not found");
    }

    return db.chat.update({ where: { id }, data });
  },

  async deleteChat(userId: string, id: string) {
    const chat = await db.chat.findFirst({
      where: { id, userId }
    });

    if (!chat) {
      throw new Error("Chat not found");
    }

    return db.chat.delete({
      where: { id }
    });
  },

  listMessages(userId: string, chatId: string) {
    return db.message.findMany({
      where: {
        chatId,
        chat: {
          userId
        }
      },
      include: {
        attachments: true
      },
      orderBy: { createdAt: "asc" }
    });
  },

  createUserMessage(chatId: string, content: string) {
    return db.message.create({
      data: {
        chatId,
        role: "user",
        content,
        status: "done"
      }
    });
  },

  createAssistantPlaceholder(chatId: string, model: string) {
    return db.message.create({
      data: {
        chatId,
        role: "assistant",
        content: "",
        status: "streaming",
        model
      }
    });
  },

  finalizeAssistantMessage(id: string, content: string, model: string) {
    return db.message.update({
      where: { id },
      data: {
        content,
        status: "done",
        model
      }
    });
  },

  failAssistantMessage(id: string, content: string, model: string) {
    return db.message.update({
      where: { id },
      data: {
        content,
        status: "error",
        model
      }
    });
  },

  getChat(userId: string, id: string) {
    return db.chat.findFirst({
      where: { id, userId }
    });
  }
};
