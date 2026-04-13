import { db } from "@/lib/server/db";

export const attachmentRepository = {
  create(data: {
    name: string;
    kind: string;
    sizeLabel?: string;
    mimeType?: string;
    url?: string;
    content?: string;
    embedding?: number[];
    userId: string;
    chatId?: string;
    messageId?: string;
  }) {
    return db.attachment.create({
      data: {
        ...data,
        embedding: data.embedding ?? undefined
      }
    });
  },

  listKnowledgeDocuments(userId: string) {
    return db.attachment.findMany({
      where: {
        kind: "knowledge",
        userId
      },
      orderBy: {
        createdAt: "desc"
      }
    });
  },

  findByIds(userId: string, ids: string[]) {
    return db.attachment.findMany({
      where: {
        userId,
        id: {
          in: ids
        }
      }
    });
  },

  attachToMessage(ids: string[], input: { userId: string; chatId: string; messageId: string }) {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }

    return db.$transaction(
      ids.map((id) =>
        db.attachment.update({
          where: { id },
          data: {
            userId: input.userId,
            chatId: input.chatId,
            messageId: input.messageId
          }
        })
      )
    );
  }
};
