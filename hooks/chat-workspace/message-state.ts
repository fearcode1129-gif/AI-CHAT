import type { Attachment, Message } from "@/lib/types";

export function createDraftMessages(
  content: string,
  attachments: Attachment[]
): { userMessage: Message; assistantMessage: Message } {
  return {
    userMessage: {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      createdAt: "现在",
      attachments: attachments.length ? attachments : undefined
    },
    assistantMessage: {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "",
      createdAt: "现在",
      status: "streaming"
    }
  };
}

export function appendAssistantDelta(
  messagesByChat: Record<string, Message[]>,
  chatId: string,
  messageId: string,
  delta: string,
  model?: string
) {
  return {
    ...messagesByChat,
    [chatId]: (messagesByChat[chatId] ?? []).map((message) =>
      message.id === messageId
        ? {
            ...message,
            content: `${message.content}${delta}`,
            model
          }
        : message
    )
  };
}

export function updateAssistantMessage(
  messagesByChat: Record<string, Message[]>,
  chatId: string,
  messageId: string,
  updater: (message: Message) => Message
) {
  return {
    ...messagesByChat,
    [chatId]: (messagesByChat[chatId] ?? []).map((message) =>
      message.id === messageId ? updater(message) : message
    )
  };
}

export function moveChatMessages(
  messagesByChat: Record<string, Message[]>,
  fromChatId: string,
  toChatId: string
) {
  if (fromChatId === toChatId || !messagesByChat[fromChatId]) {
    return messagesByChat;
  }

  const next = { ...messagesByChat, [toChatId]: messagesByChat[fromChatId] };
  delete next[fromChatId];
  return next;
}
