"use client";

import { useChatWorkspaceStore } from "@/features/chat/stores/chat-workspace-store";

export function useChatWorkspaceState() {
  return useChatWorkspaceStore((state) => state);
}
