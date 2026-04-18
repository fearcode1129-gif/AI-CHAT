"use client";

import { useEffect } from "react";

import { useUsageStore } from "@/features/usage/stores/usage-store";

export function useUsageCredits() {
  const usage = useUsageStore((state) => state.usage);
  const isLoading = useUsageStore((state) => state.isLoading);
  const error = useUsageStore((state) => state.error);
  const refresh = useUsageStore((state) => state.refresh);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    usage,
    isLoading,
    error,
    refresh
  };
}
