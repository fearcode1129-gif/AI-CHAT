import { getServerConfig } from "@/lib/server/config";

type QuotaSnapshotInput = {
  plan: string;
  usedTokens: number;
};

export type DailyUsageSnapshot = {
  plan: string;
  tierLabel: string;
  memberLabel: string;
  limitTokens: number;
  usedTokens: number;
  remainingTokens: number;
  percentUsed: number;
  isExceeded: boolean;
  isNearLimit: boolean;
  dateKey: string;
};

function formatDateKeyPart(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export function getDailyDateKey(date = new Date()) {
  const { quota } = getServerConfig();
  return formatDateKeyPart(date, quota.timezone);
}

export function getPlanDailyTokenLimit(plan: string) {
  const { quota } = getServerConfig();

  if (plan === "pro") {
    return quota.dailyTokenLimits.pro;
  }

  if (plan === "enterprise") {
    return quota.dailyTokenLimits.enterprise;
  }

  return quota.dailyTokenLimits.free;
}

export function getTierLabel(plan: string) {
  if (plan === "pro") {
    return "Pro Tier";
  }

  if (plan === "enterprise") {
    return "Enterprise Tier";
  }

  return "Free Tier";
}

export function getMemberLabel(plan: string) {
  if (plan === "pro") {
    return "Pro Member";
  }

  if (plan === "enterprise") {
    return "Enterprise";
  }

  return "Free Member";
}

export function estimateTokensFromText(content: string) {
  const trimmed = content.trim();
  if (!trimmed) {
    return 0;
  }

  return Math.max(1, Math.ceil(trimmed.length / 4));
}

export function estimateTokensFromMessages(
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>
) {
  return messages.reduce((total, message) => total + estimateTokensFromText(message.content) + 4, 0);
}

export function buildDailyUsageSnapshot(
  input: QuotaSnapshotInput,
  dateKey = getDailyDateKey()
): DailyUsageSnapshot {
  const { quota } = getServerConfig();
  const limitTokens = getPlanDailyTokenLimit(input.plan);
  const usedTokens = Math.max(0, input.usedTokens);
  const remainingTokens = Math.max(0, limitTokens - usedTokens);
  const percentUsed = limitTokens > 0 ? Math.min(100, Math.round((usedTokens / limitTokens) * 100)) : 0;
  const usageRatio = limitTokens > 0 ? usedTokens / limitTokens : 0;

  return {
    plan: input.plan,
    tierLabel: getTierLabel(input.plan),
    memberLabel: getMemberLabel(input.plan),
    limitTokens,
    usedTokens,
    remainingTokens,
    percentUsed,
    isExceeded: usedTokens >= limitTokens,
    isNearLimit: usageRatio >= quota.warningThreshold,
    dateKey
  };
}
