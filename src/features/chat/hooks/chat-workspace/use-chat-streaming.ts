"use client";

import { useRef } from "react";

import {
  cancelChatStream,
  createChat,
  generateImage,
  streamChat
} from "@/features/chat/client/chat-api";
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
  "Press Enter to send. Shift + Enter inserts a new line.";
const QUOTA_EXCEEDED_HELPER_TEXT = "Daily quota exhausted. It resets at midnight.";
const STREAM_QUOTA_EXCEEDED_HELPER_TEXT =
  "Daily quota exhausted. Generation has been paused.";
const TEMP_CHAT_PREFIX = "chat-temp-";
const TYPING_CHARACTERS_PER_SECOND = 72;
const MAX_TYPING_CHARACTERS_PER_FRAME = 2;
const USAGE_REFRESH_INTERVAL_MS = 5000;

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
  const pendingStopStreamIdsRef = useRef<Set<string>>(new Set());
  const pendingChatResolutionsRef = useRef<Map<string, Promise<string>>>(new Map());
  const usageRefreshStateRef = useRef<{
    timerId: number | null;
    lastRunAt: number;
  }>({
    timerId: null,
    lastRunAt: 0
  });

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
    pendingStopStreamIdsRef.current.add(streamId);
    void cancelChatStream(streamId).catch(() => {
      // The local abort below still stops the UI even if the server cancel request fails.
    });

    const controller = abortControllersRef.current.get(streamId);
    if (!controller) {
      return;
    }

    controller.abort();
  };

  const stopGeneration = (chatId?: string | null) => {
    const targetChatId = chatId ?? activeChatId;
    if (!targetChatId) {
      return;
    }

    const streamState = useStreamTaskStore.getState();
    const activeStreamIds = streamState.activeStreamIdsByChat[targetChatId] ?? [];
    const fallbackStreamIds =
      activeStreamIds.length > 0
        ? activeStreamIds
        : Object.values(streamState.activeStreamIdsByChat).flat();
    for (const streamId of fallbackStreamIds) {
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
    const controller = new AbortController();
    abortControllersRef.current.set(streamId, controller);

    if (creating) {
      setActiveChatId(draftChatId);
      setActiveSectionHome();
    } else {
      setChats((current) =>
        current.map((chat) => (chat.id === draftChatId ? { ...chat, updatedAt: "Just now" } : chat))
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
    setHelperText?.("Generating response...");

    let resolvedChatId = draftChatId;
    let streamStarted = false;

    try {
      resolvedChatId = await resolveChatId(draftChatId, title);
      updateTask(streamId, (task) => ({ ...task, chatId: resolvedChatId }));
    } catch (error) {
      setMessagesByChat((current) =>
        updateAssistantMessage(current, draftChatId, assistantMessage.id, (message) => ({
          ...message,
          status: "error",
          content: `Failed to create chat: ${error instanceof Error ? error.message : "Unknown error"}`
        }))
      );
      completeTask(streamId, "error", error instanceof Error ? error.message : "Unknown error");
      setHelperText?.("Failed to create chat. Please try again.");
      pendingStopStreamIdsRef.current.delete(streamId);
      abortControllersRef.current.delete(streamId);
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
            chat.id === resolvedChatId ? { ...chat, updatedAt: "Just now", model: result.model } : chat
          )
        );
        completeTask(streamId, "done");
        setHelperText?.("Image generation completed.");
        await syncChatSnapshot(result.chatId);
      } catch (error) {
        setMessagesByChat((current) =>
          updateAssistantMessage(current, resolvedChatId, assistantMessage.id, (message) => ({
            ...message,
            status: "error",
            content: `Image generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
          }))
        );
        completeTask(streamId, "error", error instanceof Error ? error.message : "Unknown error");
        setHelperText?.("Image generation failed.");
      }

      pendingStopStreamIdsRef.current.delete(streamId);
      abortControllersRef.current.delete(streamId);
      return;
    }

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

    let pendingAssistantCharacters: string[] = [];
    let pendingDoneModel: string | null = null;
    let typingFrameId: number | null = null;
    let lastTypingFrameTime = 0;
    let typingCharacterBudget = 0;
    let typingDrainResolvers: Array<() => void> = [];

    const refreshUsageSoon = () => {
      if (!onUsageChanged) {
        return;
      }

      const state = usageRefreshStateRef.current;
      const now = Date.now();
      const elapsed = now - state.lastRunAt;

      if (elapsed >= USAGE_REFRESH_INTERVAL_MS && state.timerId === null) {
        state.lastRunAt = now;
        void onUsageChanged();
        return;
      }

      if (state.timerId !== null) {
        return;
      }

      state.timerId = window.setTimeout(() => {
        state.timerId = null;
        state.lastRunAt = Date.now();
        void onUsageChanged?.();
      }, Math.max(0, USAGE_REFRESH_INTERVAL_MS - elapsed));
    };

    const stopTypingLoop = () => {
      if (typingFrameId !== null) {
        window.cancelAnimationFrame(typingFrameId);
        typingFrameId = null;
      }
      lastTypingFrameTime = 0;
      typingCharacterBudget = 0;
    };

    const resolveTypingDrainIfReady = () => {
      if (pendingAssistantCharacters.length > 0 || pendingDoneModel || typingFrameId !== null) {
        return;
      }

      const resolvers = typingDrainResolvers;
      typingDrainResolvers = [];
      for (const resolve of resolvers) {
        resolve();
      }
    };

    const waitForTypingDrain = () => {
      if (pendingAssistantCharacters.length === 0 && !pendingDoneModel && typingFrameId === null) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        typingDrainResolvers.push(resolve);
      });
    };

    const markAssistantDoneIfReady = () => {
      if (pendingAssistantCharacters.length > 0 || !pendingDoneModel) {
        resolveTypingDrainIfReady();
        return;
      }

      const model = pendingDoneModel;
      pendingDoneModel = null;
      setMessagesByChat((current) =>
        updateAssistantMessage(current, resolvedChatId, assistantMessage.id, (message) => ({
          ...message,
          status: "done",
          model
        }))
      );
      resolveTypingDrainIfReady();
    };

    const flushAssistantDelta = (characterCount?: number) => {
      if (pendingAssistantCharacters.length === 0) {
        stopTypingLoop();
        markAssistantDoneIfReady();
        return;
      }

      const count = Math.max(1, Math.min(characterCount ?? 1, pendingAssistantCharacters.length));
      const nextDelta = pendingAssistantCharacters.splice(0, count).join("");

      setMessagesByChat((current) =>
        appendAssistantDelta(
          current,
          resolvedChatId,
          assistantMessage.id,
          nextDelta,
          activeModel ?? DEFAULT_ASSISTANT_MODEL
        )
      );

      if (pendingAssistantCharacters.length === 0) {
        stopTypingLoop();
        markAssistantDoneIfReady();
        resolveTypingDrainIfReady();
      }
    };

    const runTypingFrame = (timestamp: number) => {
      typingFrameId = null;

      if (pendingAssistantCharacters.length === 0) {
        stopTypingLoop();
        markAssistantDoneIfReady();
        resolveTypingDrainIfReady();
        return;
      }

      if (lastTypingFrameTime === 0) {
        lastTypingFrameTime = timestamp;
      }

      const elapsedSeconds = Math.min(0.1, Math.max(0, (timestamp - lastTypingFrameTime) / 1000));
      lastTypingFrameTime = timestamp;
      typingCharacterBudget += elapsedSeconds * TYPING_CHARACTERS_PER_SECOND;

      const characterCount = Math.min(
        MAX_TYPING_CHARACTERS_PER_FRAME,
        Math.floor(typingCharacterBudget)
      );

      if (characterCount > 0) {
        typingCharacterBudget -= characterCount;
        flushAssistantDelta(characterCount);
      }

      if (pendingAssistantCharacters.length > 0 || pendingDoneModel) {
        scheduleAssistantDeltaFlush();
        return;
      }

      resolveTypingDrainIfReady();
    };

    const scheduleAssistantDeltaFlush = () => {
      if (typingFrameId !== null) {
        return;
      }

      typingFrameId = window.requestAnimationFrame(runTypingFrame);
    };

    const queueAssistantDelta = (delta: string) => {
      pendingAssistantCharacters.push(...Array.from(delta));
      scheduleAssistantDeltaFlush();
      refreshUsageSoon();
    };

    const handleStreamEvent = (payload: StreamEvent) => {
      if (payload.type === "meta") {
        updateTask(streamId, (task) => ({
          ...task,
          status: "streaming",
          chatId: payload.chatId ?? resolvedChatId
        }));
        refreshUsageSoon();

        if (payload.model) {
          setActiveModel(payload.model);
          setChats((current) =>
            current.map((chat) =>
              chat.id === resolvedChatId
                ? {
                    ...chat,
                    model: payload.model,
                    updatedAt: "Just now"
                  }
                : chat
            )
          );
        }

        return;
      }

      if (payload.type === "delta") {
        queueAssistantDelta(payload.delta);
        return;
      }

      if (payload.type === "quota_exceeded") {
        flushAssistantDelta(pendingAssistantCharacters.length);
        setMessagesByChat((current) =>
          updateAssistantMessage(current, resolvedChatId, assistantMessage.id, (message) => ({
            ...message,
            status: "quota_exceeded",
            content: message.content || payload.error || STREAM_QUOTA_EXCEEDED_HELPER_TEXT
          }))
        );
        completeTask(
          streamId,
          "quota_exceeded",
          payload.error ?? STREAM_QUOTA_EXCEEDED_HELPER_TEXT
        );
        setHelperText?.(payload.error ?? STREAM_QUOTA_EXCEEDED_HELPER_TEXT);
        void onUsageChanged?.();
        return;
      }

      if (payload.type === "error") {
        throw new Error(payload.error ?? "Streaming failed");
      }

      if (payload.type === "done") {
        pendingDoneModel = payload.model ?? activeModel ?? DEFAULT_ASSISTANT_MODEL;
        scheduleAssistantDeltaFlush();
      }
    };

    try {
      if (controller.signal.aborted || pendingStopStreamIdsRef.current.has(streamId)) {
        throw new DOMException("The operation was aborted.", "AbortError");
      }

      streamStarted = true;
      await streamChat(
        {
          streamId,
          chatId: resolvedChatId,
          title,
          mode: activeMode,
          attachmentIds: attachments.map((attachment) => attachment.id),
          messages: promptMessages
        },
        controller.signal,
        handleStreamEvent
      );

      await waitForTypingDrain();
      completeTask(streamId, "done");

      const remainingStreams =
        (useStreamTaskStore.getState().activeStreamIdsByChat[resolvedChatId] ?? []).length;
      if (remainingStreams === 0) {
        setHelperText?.(
          activeMode === "knowledge"
            ? "Answered with knowledge context."
            : DEFAULT_HELPER_TEXT
        );
        await syncChatSnapshot(resolvedChatId);
      } else {
        setHelperText?.("Another response is still generating in this chat.");
        await syncChats();
      }

      await onUsageChanged?.();
    } catch (error) {
      const isAbort = error instanceof Error && error.name === "AbortError";
      const errorCode =
        error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
      const isQuotaError = errorCode === "DAILY_QUOTA_EXCEEDED";

      flushAssistantDelta(pendingAssistantCharacters.length);
      setMessagesByChat((current) =>
        updateAssistantMessage(current, resolvedChatId, assistantMessage.id, (message) => ({
          ...message,
          status: isAbort ? "done" : isQuotaError ? "done" : "error",
          content: isAbort
            ? message.content || "Generation stopped."
            : isQuotaError
              ? message.content || QUOTA_EXCEEDED_HELPER_TEXT
              : `Generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
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
            : "Generation failed. Please try again."
      );

      if (isAbort && streamStarted) {
        await syncChatSnapshot(resolvedChatId);
        await onUsageChanged?.();
      }

      if (isQuotaError) {
        await onUsageChanged?.();
      }
    } finally {
      stopTypingLoop();
      pendingStopStreamIdsRef.current.delete(streamId);
      abortControllersRef.current.delete(streamId);
    }
  };

  return {
    sendMessage,
    stopGeneration
  };
}
