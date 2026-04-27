import { beforeEach, describe, expect, it, vi } from "vitest";

const usageRepositoryMock = {
  getDailyUsage: vi.fn(),
  tryConsumeDailyTokens: vi.fn(),
  refundDailyTokens: vi.fn(),
  addDailyUsage: vi.fn()
};

vi.mock("@/features/usage/server/repositories/usage-repository", () => ({
  usageRepository: usageRepositoryMock
}));

vi.mock("@/server/config/config", () => ({
  getServerConfig: () => ({
    quota: {
      timezone: "Asia/Shanghai",
      warningThreshold: 0.8,
      dailyTokenLimits: {
        free: 100,
        pro: 500,
        enterprise: 1000
      }
    }
  })
}));

describe("usage service reservations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usageRepositoryMock.tryConsumeDailyTokens.mockResolvedValue(true);
    usageRepositoryMock.refundDailyTokens.mockResolvedValue({ count: 1 });
    usageRepositoryMock.getDailyUsage.mockResolvedValue({ totalTokens: 20 });
  });

  it("reserves prompt and completion tokens atomically", async () => {
    const { reserveDailyUsage } = await import("@/features/usage/server/services/usage-service");

    const reservation = await reserveDailyUsage({
      plan: "free",
      userId: "user-1",
      promptMessages: [{ role: "user", content: "hello" }],
      reservedCompletionTokens: 10
    });

    expect(usageRepositoryMock.tryConsumeDailyTokens).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        completionTokens: 10,
        limitTokens: 100
      })
    );
    expect(reservation.reservedCompletionTokens).toBe(10);
  });

  it("throws when atomic reservation cannot fit in the quota", async () => {
    usageRepositoryMock.tryConsumeDailyTokens.mockResolvedValueOnce(false);
    const { reserveDailyUsage } = await import("@/features/usage/server/services/usage-service");

    await expect(
      reserveDailyUsage({
        plan: "free",
        userId: "user-1",
        promptMessages: [{ role: "user", content: "hello" }],
        reservedCompletionTokens: 10
      })
    ).rejects.toMatchObject({ code: "DAILY_QUOTA_EXCEEDED" });
  });

  it("refunds unused reserved completion tokens during settlement", async () => {
    const { settleDailyUsageReservation } = await import("@/features/usage/server/services/usage-service");

    await settleDailyUsageReservation({
      plan: "free",
      userId: "user-1",
      reservation: {
        dateKey: "2026-04-25",
        promptTokens: 5,
        reservedCompletionTokens: 10,
        reservedTotalTokens: 15
      },
      completionText: "ok"
    });

    expect(usageRepositoryMock.refundDailyTokens).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        completionTokens: 9,
        totalTokens: 9
      })
    );
  });
});
