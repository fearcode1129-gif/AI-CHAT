"use client";

import { useMemo, useState } from "react";

import { deleteChat, updateChat, uploadFiles } from "@/lib/client/chat-api";
import { DEFAULT_ASSISTANT_MODEL } from "@/lib/constants/chat";
import { useChatHydration } from "@/hooks/chat-workspace/use-chat-hydration";
import { useChatStreaming } from "@/hooks/chat-workspace/use-chat-streaming";
import { useChatWorkspaceState } from "@/hooks/chat-workspace/use-chat-workspace-state";

type UseChatWorkspaceOptions = {
  isQuotaExceeded?: boolean;
  onUsageChanged?: () => Promise<void> | void;
};

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
    chats,
    setChats,
    messagesByChat,
    setMessagesByChat,
    isHydrating,
    syncChatSnapshot
  } = useChatHydration({ activeChatId });

  const activeMessages = activeChatId ? messagesByChat[activeChatId] ?? [] : [];
  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) ?? null,
    [activeChatId, chats]
  );

  const createNewChat = (prefill?: string) => {
    stopGeneration();
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

  const { isGenerating, sendMessage, stopGeneration } = useChatStreaming({
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
    setHelperText,
    onUsageChanged: options.onUsageChanged
  });

  const uploadAttachments = async (files: File[]) => {
    const uploaded = await uploadFiles({
      files,
      purpose: "attachment"
    });

    setAttachments((current) => [...current, ...uploaded]);
    setHelperText(`已添加 ${uploaded.length} 个附件，可以直接发送给 AI。`);
  };

  const uploadKnowledgeDocuments = async (files: File[]) => {
    const uploaded = await uploadFiles({
      files,
      purpose: "knowledge"
    });

    setActiveMode("knowledge");
    setHelperText(`知识库已新增 ${uploaded.length} 份文档，接下来提问会优先检索这些资料。`);
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
    helperText,
    isGenerating,
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
