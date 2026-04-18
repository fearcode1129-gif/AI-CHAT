"use client";

import type { Dispatch, SetStateAction } from "react";
import { create } from "zustand";

import { recentChats, seededMessages } from "@/features/chat/mock-data";
import type { ChatSummary, Message } from "@/shared/types";

type Updater<T> = SetStateAction<T>;

type ChatCacheStore = {
  chats: ChatSummary[];
  messagesByChat: Record<string, Message[]>;
  isHydrating: boolean;
  setChats: Dispatch<SetStateAction<ChatSummary[]>>;
  setMessagesByChat: Dispatch<SetStateAction<Record<string, Message[]>>>;
  setIsHydrating: Dispatch<SetStateAction<boolean>>;
  reset: () => void;
};

function resolveValue<T>(value: Updater<T>, current: T) {
  return typeof value === "function" ? (value as (current: T) => T)(current) : value;
}

export const useChatCacheStore = create<ChatCacheStore>((set) => ({
  chats: recentChats,
  messagesByChat: seededMessages,
  isHydrating: true,
  setChats: (value) =>
    set((state) => ({
      chats: resolveValue(value, state.chats)
    })),
  setMessagesByChat: (value) =>
    set((state) => ({
      messagesByChat: resolveValue(value, state.messagesByChat)
    })),
  setIsHydrating: (value) =>
    set((state) => ({
      isHydrating: resolveValue(value, state.isHydrating)
    })),
  reset: () =>
    set({
      chats: recentChats,
      messagesByChat: seededMessages,
      isHydrating: true
    })
}));
