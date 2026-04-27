import { usageRepository } from "@/features/usage/server/repositories/usage-repository";
import {
  buildDailyUsageSnapshot,
  estimateTokensFromMessages,
  estimateTokensFromText,
  getDailyDateKey,
  getPlanDailyTokenLimit
} from "@/features/usage/server/services/quota";

const DEFAULT_COMPLETION_TOKEN_RESERVATION = 16;

type PromptMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

function createQuotaExceededError() {
  const error = new Error("Today's quota has been exhausted. It resets at 00:00.") as Error & {
    code?: string;
  };
  error.code = "DAILY_QUOTA_EXCEEDED";
  return error;
}

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
    throw createQuotaExceededError();
  }

  return snapshot;
}

export async function reserveDailyUsage(input: {
  plan: string;
  userId: string;
  promptMessages: PromptMessage[];
  reservedCompletionTokens?: number;
}) {
  const dateKey = getDailyDateKey();
  const limitTokens = getPlanDailyTokenLimit(input.plan);
  const promptTokens = estimateTokensFromMessages(input.promptMessages);
  const completionTokens = input.reservedCompletionTokens ?? DEFAULT_COMPLETION_TOKEN_RESERVATION;
  const totalTokens = promptTokens + completionTokens;

  const consumed = await usageRepository.tryConsumeDailyTokens({
    userId: input.userId,
    dateKey,
    promptTokens,
    completionTokens,
    totalTokens,
    limitTokens
  });

  if (!consumed) {
    throw createQuotaExceededError();
  }

  return {
    dateKey,
    promptTokens,
    reservedCompletionTokens: completionTokens,
    reservedTotalTokens: totalTokens
  };
}

export async function settleDailyUsageReservation(input: {
  plan: string;
  userId: string;
  reservation: Awaited<ReturnType<typeof reserveDailyUsage>>;
  completionText: string;
}) {
  const actualCompletionTokens = estimateTokensFromText(input.completionText);
  const completionDelta = actualCompletionTokens - input.reservation.reservedCompletionTokens;

  if (completionDelta > 0) {
    const consumed = await usageRepository.tryConsumeDailyTokens({
      userId: input.userId,
      dateKey: input.reservation.dateKey,
      promptTokens: 0,
      completionTokens: completionDelta,
      totalTokens: completionDelta,
      limitTokens: getPlanDailyTokenLimit(input.plan)
    });

    if (!consumed) {
      throw createQuotaExceededError();
    }
  }

  if (completionDelta < 0) {
    const refundTokens = Math.abs(completionDelta);
    await usageRepository.refundDailyTokens({
      userId: input.userId,
      dateKey: input.reservation.dateKey,
      promptTokens: 0,
      completionTokens: refundTokens,
      totalTokens: refundTokens
    });
  }

  const nextUsedTokens =
    (await usageRepository.getDailyUsage(input.userId, input.reservation.dateKey))?.totalTokens ?? 0;

  return buildDailyUsageSnapshot(
    {
      plan: input.plan,
      usedTokens: nextUsedTokens
    },
    input.reservation.dateKey
  );
}

export async function consumeAdditionalCompletionTokens(input: {
  plan: string;
  userId: string;
  dateKey: string;
  completionTokens: number;
}) {
  if (input.completionTokens <= 0) {
    return;
  }

  const consumed = await usageRepository.tryConsumeDailyTokens({
    userId: input.userId,
    dateKey: input.dateKey,
    promptTokens: 0,
    completionTokens: input.completionTokens,
    totalTokens: input.completionTokens,
    limitTokens: getPlanDailyTokenLimit(input.plan)
  });

  if (!consumed) {
    throw createQuotaExceededError();
  }
}

export async function refundDailyUsageReservation(input: {
  userId: string;
  reservation: Awaited<ReturnType<typeof reserveDailyUsage>>;
}) {
  return usageRepository.refundDailyTokens({
    userId: input.userId,
    dateKey: input.reservation.dateKey,
    promptTokens: input.reservation.promptTokens,
    completionTokens: input.reservation.reservedCompletionTokens,
    totalTokens: input.reservation.reservedTotalTokens
  });
}

export async function recordDailyUsage(input: {
  plan: string;
  userId: string;
  promptMessages: PromptMessage[];
  completionText: string;
}) {
  const dateKey = getDailyDateKey();
  const promptTokens = estimateTokensFromMessages(input.promptMessages);
  const completionTokens = estimateTokensFromText(input.completionText);
  const totalTokens = promptTokens + completionTokens;

  const consumed = await usageRepository.tryConsumeDailyTokens({
    userId: input.userId,
    dateKey,
    promptTokens,
    completionTokens,
    totalTokens,
    limitTokens: getPlanDailyTokenLimit(input.plan)
  });

  if (!consumed) {
    throw createQuotaExceededError();
  }

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
