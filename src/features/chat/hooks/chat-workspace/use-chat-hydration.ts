"use client";

import { startTransition, useEffect, useRef } from "react";

import { fetchChatMessages, fetchChats } from "@/features/chat/client/chat-api";
import { useChatCacheStore } from "@/features/chat/stores/chat-cache-store";

type UseChatHydrationArgs = {
  activeChatId: string | null;
};

export function useChatHydration({ activeChatId }: UseChatHydrationArgs) {
  const chats = useChatCacheStore((state) => state.chats);
  const messagesByChat = useChatCacheStore((state) => state.messagesByChat);
  const isHydrating = useChatCacheStore((state) => state.isHydrating);
  const setChats = useChatCacheStore((state) => state.setChats);
  const setMessagesByChat = useChatCacheStore((state) => state.setMessagesByChat);
  const setIsHydrating = useChatCacheStore((state) => state.setIsHydrating);
  const hydratedMessageChatIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    const hydrateChats = async () => {
      try {
        const nextChats = await fetchChats();
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setChats(nextChats);
        });
      } finally {
        if (!cancelled) {
          setIsHydrating(false);
        }
      }
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(() => {
        void hydrateChats();
      }, { timeout: 300 });

      return () => {
        cancelled = true;
        window.cancelIdleCallback(idleId);
      };
    }

    const timeoutId = globalThis.setTimeout(() => {
      void hydrateChats();
    }, 0);

    return () => {
      cancelled = true;
      globalThis.clearTimeout(timeoutId);
    };
  }, [setChats, setIsHydrating]);

  useEffect(() => {
    if (!activeChatId) {
      return;
    }

    const hasLocalMessages = (messagesByChat[activeChatId]?.length ?? 0) > 0;
    const chatExists = chats.some((chat) => chat.id === activeChatId);

    if (hasLocalMessages || !chatExists || hydratedMessageChatIdsRef.current.has(activeChatId)) {
      return;
    }

    const hydrateMessages = async () => {
      const serverMessages = await fetchChatMessages(activeChatId);
      if (hydratedMessageChatIdsRef.current.has(activeChatId)) {
        return;
      }

      hydratedMessageChatIdsRef.current.add(activeChatId);
      startTransition(() => {
        setMessagesByChat((current) => ({ ...current, [activeChatId]: serverMessages }));
      });
    };

    void hydrateMessages();
  }, [activeChatId, chats, messagesByChat, setMessagesByChat]);

  const syncChatSnapshot = async (chatId: string) => {
    const [nextChats, nextMessages] = await Promise.all([fetchChats(), fetchChatMessages(chatId)]);

    startTransition(() => {
      setChats(nextChats);
      setMessagesByChat((current) => ({ ...current, [chatId]: nextMessages }));
    });
  };

  const syncChats = async () => {
    const nextChats = await fetchChats();
    startTransition(() => {
      setChats(nextChats);
    });
  };

  return {
    chats,
    setChats,
    messagesByChat,
    setMessagesByChat,
    isHydrating,
    syncChatSnapshot,
    syncChats
  };
}
