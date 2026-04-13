"use client";

import { useRef, useState } from "react";

import { generateImage, streamChat } from "@/lib/client/chat-api";
import {
  CHAT_TITLE_MAX_LENGTH,
  DEFAULT_ASSISTANT_MODEL,
  DEFAULT_NEW_CHAT_TITLE
} from "@/lib/constants/chat";
import {
  appendAssistantDelta,
  createDraftMessages,
  moveChatMessages,
  updateAssistantMessage
} from "@/hooks/chat-workspace/message-state";
import type { Attachment, ChatSummary, Message } from "@/lib/types";
import type { StreamEvent } from "@/lib/types/api";

type UseChatStreamingArgs = {
  activeChatId: string | null;
  activeMode: string;
  activeModel: string | null;
  attachments: Attachment[];
  draft: string;
  isQuotaExceeded: boolean;
  messagesByChat: Record<string, Message[]>;
  setActiveChatId: (chatId: string | null) => void;
  setActiveSectionHome: () => void;
  setChats: React.Dispatch<React.SetStateAction<ChatSummary[]>>;
  setMessagesByChat: React.Dispatch<React.SetStateAction<Record<string, Message[]>>>;
  setDraft: (value: string) => void;
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
  setActiveModel: (model: string | null) => void;
  syncChatSnapshot: (chatId: string) => Promise<void>;
  setHelperText?: (value: string) => void;
  onUsageChanged?: () => Promise<void> | void;
};

const DEFAULT_HELPER_TEXT =
  "支持 Enter 发送、Shift + Enter 换行，后续可接入附件上传、语音输入与知识库检索。";
const QUOTA_EXCEEDED_HELPER_TEXT = "今日额度已用完，将于每日 0 点自动重置。";

export function useChatStreaming({
  activeChatId,
  activeMode,
  activeModel,
  attachments,
  draft,
  isQuotaExceeded,
  messagesByChat,
  setActiveChatId,
  setActiveSectionHome,
  setChats,
  setMessagesByChat,
  setDraft,
  setAttachments,
  setActiveModel,
  syncChatSnapshot,
  setHelperText,
  onUsageChanged
}: UseChatStreamingArgs) {
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stopGeneration = () => {
    abortControllerRef.current?.abort();
    setIsGenerating(false);
  };

  const sendMessage = async (value?: string) => {
    const content = (value ?? draft).trim();
    if (!content) {
      return;
    }

    if (isQuotaExceeded) {
      setHelperText?.(QUOTA_EXCEEDED_HELPER_TEXT);
      return;
    }

    const draftChatId = activeChatId ?? `chat-${Date.now()}`;
    const creating = !activeChatId;
    const title = content.slice(0, CHAT_TITLE_MAX_LENGTH) || DEFAULT_NEW_CHAT_TITLE;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    let resolvedChatId = draftChatId;

    if (creating) {
      setActiveChatId(draftChatId);
      setActiveSectionHome();
    } else {
      setChats((current) =>
        current.map((chat) => (chat.id === draftChatId ? { ...chat, updatedAt: "刚刚" } : chat))
      );
    }

    const { userMessage, assistantMessage } = createDraftMessages(content, attachments);

    setMessagesByChat((current) => ({
      ...current,
      [draftChatId]: [...(current[draftChatId] ?? []), userMessage, assistantMessage]
    }));
    setDraft("");
    setAttachments([]);
    setIsGenerating(true);
    setHelperText?.("正在处理中...");

    if (activeMode === "image") {
      try {
        const result = await generateImage({
          chatId: creating ? undefined : draftChatId,
          prompt: content,
          title
        });

        resolvedChatId = result.chatId;

        if (creating) {
          setActiveChatId(result.chatId);
          setMessagesByChat((current) => moveChatMessages(current, draftChatId, result.chatId));
        }

        setChats((current) =>
          creating
            ? [
                {
                  id: result.chatId,
                  title,
                  updatedAt: "刚刚",
                  model: result.model
                },
                ...current
              ]
            : current.map((chat) =>
                chat.id === draftChatId ? { ...chat, updatedAt: "刚刚", model: result.model } : chat
              )
        );

        setIsGenerating(false);
        setHelperText?.("图像已生成完成。");
        await syncChatSnapshot(result.chatId);
      } catch (error) {
        setMessagesByChat((current) =>
          updateAssistantMessage(current, resolvedChatId, assistantMessage.id, (message) => ({
            ...message,
            status: "error",
            content: `图像生成失败：${error instanceof Error ? error.message : "未知错误"}`
          }))
        );
        setIsGenerating(false);
        setHelperText?.("图像生成失败。");
      } finally {
        abortControllerRef.current = null;
      }

      return;
    }

    const handleStreamEvent = (payload: StreamEvent) => {
      if (payload.type === "meta" && payload.model) {
        setActiveModel(payload.model);

        if (payload.chatId && creating) {
          resolvedChatId = payload.chatId;
          setActiveChatId(payload.chatId);
          setMessagesByChat((current) =>
            moveChatMessages(current, draftChatId, payload.chatId ?? draftChatId)
          );
        }

        setChats((current) =>
          creating
            ? [
                {
                  id: payload.chatId ?? draftChatId,
                  title,
                  updatedAt: "刚刚",
                  model: payload.model
                },
                ...current
              ]
            : current.map((chat) =>
                chat.id === draftChatId ? { ...chat, model: payload.model, updatedAt: "刚刚" } : chat
              )
        );
        return;
      }

      if (payload.type === "delta") {
        setMessagesByChat((current) =>
          appendAssistantDelta(
            current,
            resolvedChatId,
            assistantMessage.id,
            payload.delta,
            activeModel ?? DEFAULT_ASSISTANT_MODEL
          )
        );
        return;
      }

      if (payload.type === "error") {
        throw new Error(payload.error ?? "Streaming failed");
      }

      if (payload.type === "done") {
        setMessagesByChat((current) =>
          updateAssistantMessage(current, resolvedChatId, assistantMessage.id, (message) => ({
            ...message,
            status: "done",
            model: payload.model ?? activeModel ?? DEFAULT_ASSISTANT_MODEL
          }))
        );
        setIsGenerating(false);
        setHelperText?.(activeMode === "knowledge" ? "已结合知识库内容完成回答。" : DEFAULT_HELPER_TEXT);
        void syncChatSnapshot(payload.chatId ?? resolvedChatId);
        void onUsageChanged?.();
      }
    };

    try {
      await streamChat(
        {
          chatId: creating ? undefined : draftChatId,
          title,
          mode: activeMode,
          attachmentIds: attachments.map((attachment) => attachment.id),
          messages: [...(messagesByChat[draftChatId] ?? []), userMessage]
            .filter((message) => message.role === "user" || message.role === "assistant")
            .map((message) => ({
              role: message.role,
              content: message.content
            }))
        },
        controller.signal,
        handleStreamEvent
      );
    } catch (error) {
      const isAbort = error instanceof Error && error.name === "AbortError";
      const errorCode =
        error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
      const isQuotaError = errorCode === "DAILY_QUOTA_EXCEEDED";

      setMessagesByChat((current) =>
        updateAssistantMessage(current, resolvedChatId, assistantMessage.id, (message) => ({
          ...message,
          status: isAbort ? "done" : isQuotaError ? "done" : "error",
          content: isAbort
            ? message.content || "已停止生成。"
            : isQuotaError
              ? message.content || QUOTA_EXCEEDED_HELPER_TEXT
              : `生成失败：${error instanceof Error ? error.message : "未知错误"}`
        }))
      );
      setIsGenerating(false);
      setHelperText?.(
        isAbort ? DEFAULT_HELPER_TEXT : isQuotaError ? QUOTA_EXCEEDED_HELPER_TEXT : "生成失败，请稍后再试。"
      );

      if (isQuotaError) {
        void onUsageChanged?.();
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  return {
    isGenerating,
    sendMessage,
    stopGeneration
  };
}
