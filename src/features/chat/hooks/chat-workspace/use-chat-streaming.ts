"use client";

import { useRef } from "react";

import { createChat, generateImage, streamChat } from "@/features/chat/client/chat-api";
import {
  CHAT_TITLE_MAX_LENGTH,
  DEFAULT_ASSISTANT_MODEL,
  DEFAULT_NEW_CHAT_TITLE
} from "@/features/chat/constants/chat";
import {
  appendAssistantDelta,
  createDraftMessages,
  moveChatMessages,
  updateAssistantMessage
} from "@/features/chat/hooks/chat-workspace/message-state";
import { useChatWorkspaceStore } from "@/features/chat/stores/chat-workspace-store";
import { useStreamTaskStore } from "@/features/chat/stores/stream-task-store";
import type { Attachment, ChatSummary, Message } from "@/shared/types";
import type { StreamEvent } from "@/shared/types/api";

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
  syncChats: () => Promise<void>;
  setHelperText?: (value: string) => void;
  onUsageChanged?: () => Promise<void> | void;
};

const DEFAULT_HELPER_TEXT =
  "鏀寔 Enter 鍙戦€併€丼hift + Enter 鎹㈣锛屽悗缁彲鎺ュ叆闄勪欢涓婁紶銆佽闊宠緭鍏ヤ笌鐭ヨ瘑搴撴绱€?";
const QUOTA_EXCEEDED_HELPER_TEXT = "浠婃棩棰濆害宸茬敤瀹岋紝灏嗕簬姣忔棩 0 鐐硅嚜鍔ㄩ噸缃€?";
const TEMP_CHAT_PREFIX = "chat-temp-";

function isTemporaryChatId(chatId: string | null | undefined): chatId is string {
  return Boolean(chatId && chatId.startsWith(TEMP_CHAT_PREFIX));
}

function createStreamId() {
  return `stream-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

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
  syncChats,
  setHelperText,
  onUsageChanged
}: UseChatStreamingArgs) {
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const pendingChatResolutionsRef = useRef<Map<string, Promise<string>>>(new Map());

  const startTask = useStreamTaskStore((state) => state.startTask);
  const updateTask = useStreamTaskStore((state) => state.updateTask);
  const completeTask = useStreamTaskStore((state) => state.completeTask);
  const moveChatTasks = useStreamTaskStore((state) => state.moveChatTasks);

  const resolveChatId = async (draftChatId: string, title: string) => {
    if (!isTemporaryChatId(draftChatId)) {
      return draftChatId;
    }

    const existing = pendingChatResolutionsRef.current.get(draftChatId);
    if (existing) {
      return existing;
    }

    const promise = createChat({
      title,
      model: activeModel ?? DEFAULT_ASSISTANT_MODEL
    })
      .then((chat) => {
        setChats((current) => {
          const existingChat = current.find((item) => item.id === chat.id);
          if (existingChat) {
            return current.map((item) => (item.id === chat.id ? chat : item));
          }

          return [chat, ...current];
        });
        setMessagesByChat((current) => moveChatMessages(current, draftChatId, chat.id));
        moveChatTasks(draftChatId, chat.id);

        if (useChatWorkspaceStore.getState().activeChatId === draftChatId) {
          setActiveChatId(chat.id);
        }

        return chat.id;
      })
      .finally(() => {
        pendingChatResolutionsRef.current.delete(draftChatId);
      });

    pendingChatResolutionsRef.current.set(draftChatId, promise);
    return promise;
  };

  const stopStream = (streamId: string) => {
    const controller = abortControllersRef.current.get(streamId);
    if (!controller) {
      return;
    }

    controller.abort();
  };

  const stopGeneration = (chatId = useChatWorkspaceStore.getState().activeChatId) => {
    if (!chatId) {
      return;
    }

    const activeStreamIds = useStreamTaskStore.getState().activeStreamIdsByChat[chatId] ?? [];
    for (const streamId of activeStreamIds) {
      stopStream(streamId);
    }
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

    const draftChatId = activeChatId ?? `${TEMP_CHAT_PREFIX}${Date.now()}`;
    const creating = !activeChatId;
    const title = content.slice(0, CHAT_TITLE_MAX_LENGTH) || DEFAULT_NEW_CHAT_TITLE;
    const { userMessage, assistantMessage } = createDraftMessages(content, attachments);
    const streamId = createStreamId();

    if (creating) {
      setActiveChatId(draftChatId);
      setActiveSectionHome();
    } else {
      setChats((current) =>
        current.map((chat) => (chat.id === draftChatId ? { ...chat, updatedAt: "鍒氬垰" } : chat))
      );
    }

    setMessagesByChat((current) => ({
      ...current,
      [draftChatId]: [...(current[draftChatId] ?? []), userMessage, assistantMessage]
    }));
    startTask({
      streamId,
      chatId: draftChatId,
      userMessageId: userMessage.id,
      assistantMessageId: assistantMessage.id,
      status: "pending",
      startedAt: Date.now()
    });

    setDraft("");
    setAttachments([]);
    setHelperText?.("姝ｅ湪澶勭悊涓?..");

    let resolvedChatId = draftChatId;

    try {
      resolvedChatId = await resolveChatId(draftChatId, title);
      updateTask(streamId, (task) => ({ ...task, chatId: resolvedChatId }));
    } catch (error) {
      setMessagesByChat((current) =>
        updateAssistantMessage(current, draftChatId, assistantMessage.id, (message) => ({
          ...message,
          status: "error",
          content: `鍙戦€佸け璐ワ細${error instanceof Error ? error.message : "鏈煡閿欒"}`
        }))
      );
      completeTask(streamId, "error", error instanceof Error ? error.message : "Unknown error");
      setHelperText?.("浼氳瘽鍒涘缓澶辫触锛岃绋嶅悗鍐嶈瘯銆?");
      return;
    }

    if (activeMode === "image") {
      try {
        const result = await generateImage({
          chatId: resolvedChatId,
          prompt: content,
          title
        });

        setChats((current) =>
          current.map((chat) =>
            chat.id === resolvedChatId ? { ...chat, updatedAt: "鍒氬垰", model: result.model } : chat
          )
        );
        completeTask(streamId, "done");
        setHelperText?.("鍥惧儚宸茬敓鎴愬畬鎴愩€?");
        await syncChatSnapshot(result.chatId);
      } catch (error) {
        setMessagesByChat((current) =>
          updateAssistantMessage(current, resolvedChatId, assistantMessage.id, (message) => ({
            ...message,
            status: "error",
            content: `鍥惧儚鐢熸垚澶辫触锛?{error instanceof Error ? error.message : "鏈煡閿欒"}`
          }))
        );
        completeTask(streamId, "error", error instanceof Error ? error.message : "Unknown error");
        setHelperText?.("鍥惧儚鐢熸垚澶辫触銆?");
      }

      return;
    }

    const controller = new AbortController();
    abortControllersRef.current.set(streamId, controller);

    const promptMessages = [...(messagesByChat[draftChatId] ?? []), userMessage]
      .filter(
        (message) =>
          message.role === "user" ||
          (message.role === "assistant" && message.status !== "streaming")
      )
      .map((message) => ({
        role: message.role,
        content: message.content
      }));

    const handleStreamEvent = (payload: StreamEvent) => {
      if (payload.type === "meta") {
        updateTask(streamId, (task) => ({
          ...task,
          status: "streaming",
          chatId: payload.chatId ?? resolvedChatId
        }));

        if (payload.model) {
          setActiveModel(payload.model);
          setChats((current) =>
            current.map((chat) =>
              chat.id === resolvedChatId
                ? {
                    ...chat,
                    model: payload.model,
                    updatedAt: "鍒氬垰"
                  }
                : chat
            )
          );
        }

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
      }
    };

    try {
      await streamChat(
        {
          chatId: resolvedChatId,
          title,
          mode: activeMode,
          attachmentIds: attachments.map((attachment) => attachment.id),
          messages: promptMessages
        },
        controller.signal,
        handleStreamEvent
      );

      completeTask(streamId, "done");

      const remainingStreams =
        (useStreamTaskStore.getState().activeStreamIdsByChat[resolvedChatId] ?? []).length;
      if (remainingStreams === 0) {
        setHelperText?.(
          activeMode === "knowledge"
            ? "宸茬粨鍚堢煡璇嗗簱鍐呭瀹屾垚鍥炵瓟銆?"
            : DEFAULT_HELPER_TEXT
        );
        await syncChatSnapshot(resolvedChatId);
      } else {
        setHelperText?.("褰撳墠浼氳瘽杩樻湁鍏朵粬鍥炵瓟姝ｅ湪鐢熸垚涓€?");
        await syncChats();
      }

      await onUsageChanged?.();
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
            ? message.content || "宸插仠姝㈢敓鎴愩€?"
            : isQuotaError
              ? message.content || QUOTA_EXCEEDED_HELPER_TEXT
              : `鐢熸垚澶辫触锛?{error instanceof Error ? error.message : "鏈煡閿欒"}`
        }))
      );
      completeTask(
        streamId,
        isAbort ? "aborted" : "error",
        error instanceof Error ? error.message : "Unknown error"
      );
      setHelperText?.(
        isAbort
          ? DEFAULT_HELPER_TEXT
          : isQuotaError
            ? QUOTA_EXCEEDED_HELPER_TEXT
            : "鐢熸垚澶辫触锛岃绋嶅悗鍐嶈瘯銆?"
      );

      if (isQuotaError) {
        await onUsageChanged?.();
      }
    } finally {
      abortControllersRef.current.delete(streamId);
    }
  };

  return {
    sendMessage,
    stopGeneration
  };
}
