import { describe, expect, it, vi } from "vitest";

import { formatRelativeTime } from "@/lib/utils";

describe("formatRelativeTime", () => {
  it("formats recent minutes", () => {
    vi.setSystemTime(new Date("2026-04-10T12:00:00Z"));
    expect(formatRelativeTime(new Date("2026-04-10T11:55:00Z"))).toBe("5 分钟前");
    vi.useRealTimers();
  });

  it("formats recent hours", () => {
    vi.setSystemTime(new Date("2026-04-10T12:00:00Z"));
    expect(formatRelativeTime(new Date("2026-04-10T09:00:00Z"))).toBe("3 小时前");
    vi.useRealTimers();
  });
});
