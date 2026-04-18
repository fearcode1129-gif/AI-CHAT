"use client";

import { create } from "zustand";
import type { Dispatch, SetStateAction } from "react";

import type { Attachment, WorkspaceSection } from "@/shared/types";

export const DEFAULT_HELPER_TEXT =
  "鏀寔 Enter 鍙戦€併€丼hift + Enter 鎹㈣锛屽悗缁彲鎺ュ叆闄勪欢涓婁紶銆佽闊宠緭鍏ヤ笌鐭ヨ瘑搴撴绱€?";

type ChatWorkspaceStore = {
  activeChatId: string | null;
  activeSection: WorkspaceSection;
  draft: string;
  activeMode: string;
  attachments: Attachment[];
  helperText: string;
  setActiveChatId: Dispatch<SetStateAction<string | null>>;
  setActiveSection: Dispatch<SetStateAction<WorkspaceSection>>;
  setDraft: Dispatch<SetStateAction<string>>;
  setActiveMode: Dispatch<SetStateAction<string>>;
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
  setHelperText: Dispatch<SetStateAction<string>>;
  resetDraft: (nextDraft?: string) => void;
  showHome: () => void;
  selectChat: (chatId: string) => void;
  createNewChat: (prefill?: string) => void;
  reset: () => void;
};

function resolveValue<T>(value: SetStateAction<T>, current: T) {
  return typeof value === "function" ? (value as (current: T) => T)(current) : value;
}

export const useChatWorkspaceStore = create<ChatWorkspaceStore>((set) => ({
  activeChatId: null,
  activeSection: "home",
  draft: "",
  activeMode: "fast",
  attachments: [],
  helperText: DEFAULT_HELPER_TEXT,
  setActiveChatId: (value) =>
    set((state) => ({
      activeChatId: resolveValue(value, state.activeChatId)
    })),
  setActiveSection: (value) =>
    set((state) => ({
      activeSection: resolveValue(value, state.activeSection)
    })),
  setDraft: (value) =>
    set((state) => ({
      draft: resolveValue(value, state.draft)
    })),
  setActiveMode: (value) =>
    set((state) => ({
      activeMode: resolveValue(value, state.activeMode)
    })),
  setAttachments: (value) =>
    set((state) => ({
      attachments: resolveValue(value, state.attachments)
    })),
  setHelperText: (value) =>
    set((state) => ({
      helperText: resolveValue(value, state.helperText)
    })),
  resetDraft: (nextDraft = "") =>
    set({
      draft: nextDraft,
      attachments: []
    }),
  showHome: () =>
    set({
      activeSection: "home"
    }),
  selectChat: (chatId) =>
    set({
      activeChatId: chatId,
      activeSection: "home"
    }),
  createNewChat: (prefill) =>
    set({
      activeChatId: null,
      activeSection: "home",
      draft: prefill ?? "",
      attachments: [],
      helperText: DEFAULT_HELPER_TEXT
    }),
  reset: () =>
    set({
      activeChatId: null,
      activeSection: "home",
      draft: "",
      activeMode: "fast",
      attachments: [],
      helperText: DEFAULT_HELPER_TEXT
    })
}));
