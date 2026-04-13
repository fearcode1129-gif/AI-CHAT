import { describe, expect, it, vi } from "vitest";

describe("quota helpers", () => {
  it("builds a daily usage snapshot with remaining quota", async () => {
    vi.resetModules();
    vi.doMock("@/lib/server/config", () => ({
      getServerConfig: () => ({
        quota: {
          timezone: "Asia/Shanghai",
          warningThreshold: 0.8,
          dailyTokenLimits: {
            free: 20000,
            pro: 500000,
            enterprise: 2000000
          }
        }
      })
    }));

    const { buildDailyUsageSnapshot } = await import("@/lib/server/quota");
    const snapshot = buildDailyUsageSnapshot(
      {
        plan: "free",
        usedTokens: 2450
      },
      "2026-04-13"
    );

    expect(snapshot.tierLabel).toBe("Free Tier");
    expect(snapshot.memberLabel).toBe("Free Member");
    expect(snapshot.remainingTokens).toBe(17550);
    expect(snapshot.isExceeded).toBe(false);
  });

  it("marks a snapshot as exceeded when usage reaches the plan limit", async () => {
    vi.resetModules();
    vi.doMock("@/lib/server/config", () => ({
      getServerConfig: () => ({
        quota: {
          timezone: "Asia/Shanghai",
          warningThreshold: 0.8,
          dailyTokenLimits: {
            free: 20000,
            pro: 500000,
            enterprise: 2000000
          }
        }
      })
    }));

    const { buildDailyUsageSnapshot } = await import("@/lib/server/quota");
    const snapshot = buildDailyUsageSnapshot(
      {
        plan: "free",
        usedTokens: 20000
      },
      "2026-04-13"
    );

    expect(snapshot.remainingTokens).toBe(0);
    expect(snapshot.isExceeded).toBe(true);
  });
});
