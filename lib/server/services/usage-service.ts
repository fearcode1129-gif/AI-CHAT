import { usageRepository } from "@/lib/server/repositories/usage-repository";
import {
  buildDailyUsageSnapshot,
  estimateTokensFromMessages,
  estimateTokensFromText,
  getDailyDateKey,
  getPlanDailyTokenLimit
} from "@/lib/server/quota";

export async function getUserDailyUsage(plan: string, userId: string) {
  const dateKey = getDailyDateKey();
  const usage = await usageRepository.getDailyUsage(userId, dateKey);

  return buildDailyUsageSnapshot(
    {
      plan,
      usedTokens: usage?.totalTokens ?? 0
    },
    dateKey
  );
}

export async function assertDailyQuotaAvailable(plan: string, userId: string) {
  const snapshot = await getUserDailyUsage(plan, userId);

  if (snapshot.isExceeded) {
    const error = new Error("今日额度已用完，将于每日 0 点重置。") as Error & { code?: string };
    error.code = "DAILY_QUOTA_EXCEEDED";
    throw error;
  }

  return snapshot;
}

export async function recordDailyUsage(input: {
  plan: string;
  userId: string;
  promptMessages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  completionText: string;
}) {
  const dateKey = getDailyDateKey();
  const promptTokens = estimateTokensFromMessages(input.promptMessages);
  const completionTokens = estimateTokensFromText(input.completionText);
  const totalTokens = promptTokens + completionTokens;

  await usageRepository.addDailyUsage({
    userId: input.userId,
    dateKey,
    promptTokens,
    completionTokens,
    totalTokens
  });

  const nextUsedTokens = (await usageRepository.getDailyUsage(input.userId, dateKey))?.totalTokens ?? totalTokens;

  return buildDailyUsageSnapshot(
    {
      plan: input.plan,
      usedTokens: nextUsedTokens
    },
    dateKey
  );
}

export function getDailyQuotaLimit(plan: string) {
  return getPlanDailyTokenLimit(plan);
}
