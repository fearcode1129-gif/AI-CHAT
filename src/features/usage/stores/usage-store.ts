"use client";

import { create } from "zustand";

import { fetchUsage } from "@/features/chat/client/chat-api";
import type { UsageCredits } from "@/shared/types";

type UsageStore = {
  usage: UsageCredits | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  reset: () => void;
};

const DEFAULT_ERROR_MESSAGE = "Failed to load usage credits";

export const useUsageStore = create<UsageStore>((set) => ({
  usage: null,
  isLoading: true,
  error: null,
  refresh: async () => {
    set({ isLoading: true, error: null });

    try {
      const usage = await fetchUsage();
      set({ usage, isLoading: false, error: null });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : DEFAULT_ERROR_MESSAGE
      });
    }
  },
  reset: () => set({ usage: null, isLoading: true, error: null })
}));
