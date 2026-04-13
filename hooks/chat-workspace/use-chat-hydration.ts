"use client";

import { startTransition, useEffect, useRef, useState } from "react";

import { fetchChatMessages, fetchChats } from "@/lib/client/chat-api";
import { recentChats, seededMessages } from "@/lib/mock-data";
import type { ChatSummary, Message } from "@/lib/types";

type UseChatHydrationArgs = {
  activeChatId: string | null;
};

export function useChatHydration({ activeChatId }: UseChatHydrationArgs) {
  const [chats, setChats] = useState<ChatSummary[]>(recentChats);
  const [messagesByChat, setMessagesByChat] =
    useState<Record<string, Message[]>>(seededMessages);
  const [isHydrating, setIsHydrating] = useState(true);
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
  }, []);

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
  }, [activeChatId, chats, messagesByChat]);

  const syncChatSnapshot = async (chatId: string) => {
    const [nextChats, nextMessages] = await Promise.all([
      fetchChats(),
      fetchChatMessages(chatId)
    ]);

    startTransition(() => {
      setChats(nextChats);
      setMessagesByChat((current) => ({ ...current, [chatId]: nextMessages }));
    });
  };

  return {
    chats,
    setChats,
    messagesByChat,
    setMessagesByChat,
    isHydrating,
    syncChatSnapshot
  };
}
