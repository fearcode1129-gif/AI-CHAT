"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchUsage } from "@/lib/client/chat-api";
import type { UsageCredits } from "@/lib/types";

export function useUsageCredits() {
  const [usage, setUsage] = useState<UsageCredits | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextUsage = await fetchUsage();
      setUsage(nextUsage);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "加载额度失败");
    } finally {
      setIsLoading(false);
    }
  }, []);

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
