import type { Attachment as PrismaAttachment, Chat, Message } from "@prisma/client";

import type { ChatSummary } from "@/shared/types";
import { formatRelativeTime } from "@/shared/lib/utils";

export function toChatSummary(chat: Chat): ChatSummary {
  return {
    id: chat.id,
    title: chat.title,
    updatedAt: formatRelativeTime(chat.updatedAt),
    pinned: chat.pinned,
    model: chat.model ?? undefined
  };
}

export function toClientMessage(
  message: Message & {
    attachments?: PrismaAttachment[];
  }
) {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: new Date(message.createdAt).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }),
    status: message.status,
    model: message.model ?? undefined,
    attachments: message.attachments?.map(toClientAttachment)
  };
}

export function toClientAttachment(attachment: PrismaAttachment) {
  return {
    id: attachment.id,
    name: attachment.name,
    kind: attachment.kind as "file" | "image" | "knowledge",
    size: attachment.sizeLabel ?? "未知大小",
    url: attachment.url ?? undefined,
    mimeType: attachment.mimeType ?? undefined
  };
}
