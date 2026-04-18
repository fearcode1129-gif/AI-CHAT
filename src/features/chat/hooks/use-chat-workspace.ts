"use client";

import { useMemo, useState } from "react";

import { deleteChat, updateChat, uploadFiles } from "@/features/chat/client/chat-api";
import { DEFAULT_ASSISTANT_MODEL } from "@/features/chat/constants/chat";
import { useChatHydration } from "@/features/chat/hooks/chat-workspace/use-chat-hydration";
import { useChatStreaming } from "@/features/chat/hooks/chat-workspace/use-chat-streaming";
import { useChatWorkspaceState } from "@/features/chat/hooks/chat-workspace/use-chat-workspace-state";
import { useChatCacheStore } from "@/features/chat/stores/chat-cache-store";
import { DEFAULT_HELPER_TEXT } from "@/features/chat/stores/chat-workspace-store";
import { useStreamTaskStore } from "@/features/chat/stores/stream-task-store";
import type { Message } from "@/shared/types";

type UseChatWorkspaceOptions = {
  isQuotaExceeded?: boolean;
  onUsageChanged?: () => Promise<void> | void;
};

const EMPTY_MESSAGES: Message[] = [];

export function useChatWorkspace(options: UseChatWorkspaceOptions = {}) {
  const [activeModel, setActiveModel] = useState<string | null>(DEFAULT_ASSISTANT_MODEL);
  const {
    activeChatId,
    activeSection,
    draft,
    activeMode,
    attachments,
    helperText,
    setActiveChatId,
    setActiveSection,
    setDraft,
    setActiveMode,
    setAttachments,
    setHelperText,
    showHome,
    selectChat,
    createNewChat: createNewChatState
  } = useChatWorkspaceState();
  const {
    setChats,
    setMessagesByChat,
    isHydrating,
    syncChatSnapshot,
    syncChats
  } = useChatHydration({ activeChatId });
  const chats = useChatCacheStore((state) => state.chats);
  const messagesByChat = useChatCacheStore((state) => state.messagesByChat);
  const activeMessages = useChatCacheStore((state) =>
    activeChatId ? state.messagesByChat[activeChatId] ?? EMPTY_MESSAGES : EMPTY_MESSAGES
  );
  const activeStreamCount = useStreamTaskStore((state) =>
    activeChatId ? state.activeStreamIdsByChat[activeChatId]?.length ?? 0 : 0
  );

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) ?? null,
    [activeChatId, chats]
  );

  const createNewChat = (prefill?: string) => {
    createNewChatState(prefill);
  };

  const renameChat = async (chatId: string, title: string) => {
    const nextTitle = title.trim();
    if (!nextTitle) {
      return;
    }

    const updated = await updateChat(chatId, { title: nextTitle });
    setChats((current) => current.map((chat) => (chat.id === chatId ? updated : chat)));
  };

  const togglePinnedChat = async (chatId: string) => {
    const target = chats.find((chat) => chat.id === chatId);
    if (!target) {
      return;
    }

    const updated = await updateChat(chatId, { pinned: !target.pinned });
    setChats((current) => {
      const next = current.map((chat) => (chat.id === chatId ? updated : chat));
      return [...next].sort((a, b) => {
        const pinOrder = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
        if (pinOrder !== 0) {
          return pinOrder;
        }

        return 0;
      });
    });
  };

  const removeChat = async (chatId: string) => {
    await deleteChat(chatId);
    setChats((current) => current.filter((chat) => chat.id !== chatId));
    setMessagesByChat((current) => {
      const next = { ...current };
      delete next[chatId];
      return next;
    });

    if (activeChatId === chatId) {
      setActiveChatId(null);
      showHome();
    }
  };

  const { sendMessage, stopGeneration } = useChatStreaming({
    activeChatId,
    activeMode,
    activeModel,
    attachments,
    draft,
    isQuotaExceeded: options.isQuotaExceeded ?? false,
    messagesByChat,
    setActiveChatId,
    setActiveSectionHome: showHome,
    setChats,
    setMessagesByChat,
    setDraft,
    setAttachments,
    setActiveModel,
    syncChatSnapshot,
    syncChats,
    setHelperText,
    onUsageChanged: options.onUsageChanged
  });

  const uploadAttachments = async (files: File[]) => {
    const uploaded = await uploadFiles({
      files,
      purpose: "attachment"
    });

    setAttachments((current) => [...current, ...uploaded]);
    setHelperText(`Uploaded ${uploaded.length} attachment(s). You can send them to AI now.`);
  };

  const uploadKnowledgeDocuments = async (files: File[]) => {
    const uploaded = await uploadFiles({
      files,
      purpose: "knowledge"
    });

    setActiveMode("knowledge");
    setHelperText(`Added ${uploaded.length} knowledge document(s). Your next question will use them first.`);
  };

  return {
    chats,
    activeChatId,
    activeChat,
    activeMessages,
    activeSection,
    draft,
    activeMode,
    attachments,
    helperText: helperText || DEFAULT_HELPER_TEXT,
    isGenerating: activeStreamCount > 0,
    activeStreamCount,
    activeModel,
    isHydrating,
    setActiveSection,
    setDraft,
    setActiveMode,
    setAttachments,
    setHelperText,
    createNewChat,
    selectChat,
    renameChat,
    togglePinnedChat,
    removeChat,
    uploadAttachments,
    uploadKnowledgeDocuments,
    sendMessage,
    stopGeneration
  };
}
