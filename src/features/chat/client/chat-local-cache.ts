"use client";

import type { ChatSummary } from "@/shared/types";

const CHAT_LIST_CACHE_KEY = "ai-chat:chat-list:v1";
const MAX_CACHED_CHATS = 50;

type ChatListCachePayload = {
  savedAt: number;
  chats: ChatSummary[];
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isChatSummary(value: unknown): value is ChatSummary {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ChatSummary>;
  return typeof candidate.id === "string" && typeof candidate.title === "string";
}

export function readCachedChatList() {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CHAT_LIST_CACHE_KEY);
    if (!raw) {
      return [];
    }

    const payload = JSON.parse(raw) as Partial<ChatListCachePayload>;
    if (!Array.isArray(payload.chats)) {
      return [];
    }

    return payload.chats.filter(isChatSummary);
  } catch {
    return [];
  }
}

export function writeCachedChatList(chats: ChatSummary[]) {
  if (!canUseStorage()) {
    return;
  }

  try {
    const payload: ChatListCachePayload = {
      savedAt: Date.now(),
      chats: chats.slice(0, MAX_CACHED_CHATS)
    };

    window.localStorage.setItem(CHAT_LIST_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Cache writes are best effort. The server remains the source of truth.
  }
}
