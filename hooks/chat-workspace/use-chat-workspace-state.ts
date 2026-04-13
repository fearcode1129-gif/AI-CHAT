"use client";

import { useState } from "react";

import type { Attachment, WorkspaceSection } from "@/lib/types";

const DEFAULT_HELPER_TEXT =
  "支持 Enter 发送、Shift + Enter 换行，后续可接入附件上传、语音输入与知识库检索。";

export function useChatWorkspaceState() {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<WorkspaceSection>("home");
  const [draft, setDraft] = useState("");
  const [activeMode, setActiveMode] = useState("fast");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [helperText, setHelperText] = useState(DEFAULT_HELPER_TEXT);

  const resetDraft = (nextDraft = "") => {
    setDraft(nextDraft);
    setAttachments([]);
  };

  const showHome = () => {
    setActiveSection("home");
  };

  const selectChat = (chatId: string) => {
    setActiveChatId(chatId);
    showHome();
  };

  const createNewChat = (prefill?: string) => {
    setActiveChatId(null);
    showHome();
    resetDraft(prefill ?? "");
    setHelperText(DEFAULT_HELPER_TEXT);
  };

  return {
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
    resetDraft,
    showHome,
    selectChat,
    createNewChat
  };
}
