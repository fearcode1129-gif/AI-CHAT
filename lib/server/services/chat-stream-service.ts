import { CHAT_TITLE_MAX_LENGTH, DEFAULT_NEW_CHAT_TITLE } from "@/lib/constants/chat";
import { resolveModelByMode } from "@/lib/server/aliyun";
import { createDashScopeChatStream } from "@/lib/server/clients/dashscope-client";
import { retrieveKnowledgeContext } from "@/lib/server/knowledge";
import { attachmentRepository } from "@/lib/server/repositories/attachment-repository";
import { chatRepository } from "@/lib/server/repositories/chat-repository";
import { recordDailyUsage } from "@/lib/server/services/usage-service";

type IncomingMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type StartChatStreamInput = {
  userId: string;
  chatId?: string;
  title?: string;
  mode?: string;
  attachmentIds?: string[];
  messages: IncomingMessage[];
};

export async function startChatStream(input: StartChatStreamInput) {
  const model = resolveModelByMode(input.mode);
  const lastUserMessage = [...input.messages].reverse().find((message) => message.role === "user");
  const attachments = input.attachmentIds?.length
    ? await attachmentRepository.findByIds(input.userId, input.attachmentIds)
    : [];

  const chat =
    input.chatId != null
      ? await chatRepository.updateChat(input.userId, input.chatId, {
          updatedAt: new Date(),
          model,
          title: input.title?.trim() || undefined
        })
      : await chatRepository.createChat({
          title:
            input.title?.trim() ||
            lastUserMessage?.content.slice(0, CHAT_TITLE_MAX_LENGTH) ||
            DEFAULT_NEW_CHAT_TITLE,
          model,
          userId: input.userId
        });

  if (lastUserMessage) {
    const userMessage = await chatRepository.createUserMessage(chat.id, lastUserMessage.content);
    await attachmentRepository.attachToMessage(
      attachments
        .filter((attachment) => attachment.kind !== "knowledge")
        .map((attachment) => attachment.id),
      {
        userId: input.userId,
        chatId: chat.id,
        messageId: userMessage.id
      }
    );
  }

  const assistantMessage = await chatRepository.createAssistantPlaceholder(chat.id, model);
  const attachmentContext = attachments
    .filter((attachment) => attachment.kind !== "knowledge" && attachment.content)
    .map((attachment) => `附件《${attachment.name}》内容：\n${attachment.content}`);
  const knowledgeContext =
    input.mode === "knowledge" && lastUserMessage
      ? await retrieveKnowledgeContext(input.userId, lastUserMessage.content)
      : [];
  const contextMessages: IncomingMessage[] = [];

  if (attachmentContext.length > 0 || knowledgeContext.length > 0) {
    const blocks = [
      attachmentContext.join("\n\n"),
      knowledgeContext.length > 0
        ? `知识库召回结果：\n${knowledgeContext
            .map((item, index) => `[${index + 1}] ${item.title}\n${item.content}`)
            .join("\n\n")}`
        : ""
    ].filter(Boolean);

    contextMessages.push({
      role: "system",
      content: `请结合以下上下文回答用户问题；如果上下文不足，请明确说明。\n\n${blocks.join("\n\n")}`
    });
  }

  const upstream = await createDashScopeChatStream({
    model,
    messages: [...contextMessages, ...input.messages]
  });

  return {
    chatId: chat.id,
    model,
    assistantMessageId: assistantMessage.id,
    upstream
  };
}

export async function finalizeChatStream(input: {
  userId: string;
  plan: string;
  chatId: string;
  assistantMessageId: string;
  content: string;
  model: string;
  promptMessages: IncomingMessage[];
}) {
  await chatRepository.finalizeAssistantMessage(
    input.assistantMessageId,
    input.content,
    input.model
  );
  await chatRepository.updateChat(input.userId, input.chatId, {
    updatedAt: new Date(),
    model: input.model
  });
  return recordDailyUsage({
    plan: input.plan,
    userId: input.userId,
    promptMessages: input.promptMessages,
    completionText: input.content
  });
}

export async function failChatStream(input: {
  assistantMessageId: string;
  content: string;
  model: string;
}) {
  await chatRepository.failAssistantMessage(
    input.assistantMessageId,
    input.content,
    input.model
  );
}
