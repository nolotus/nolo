import { describe, expect, it } from "bun:test";
import { computeNextScheduledAt } from "./schedule";

describe("computeNextScheduledAt", () => {
  it("returns the next matching timestamp after now", () => {
    const now = new Date(2026, 3, 24, 10, 15, 0).getTime();
    const next = computeNextScheduledAt("30 10 * * *", now);

    expect(next).toBe(new Date(2026, 3, 24, 10, 30, 0).getTime());
  });

  it("rolls over to the next day when today's run has passed", () => {
    const now = new Date(2026, 3, 24, 10, 45, 0).getTime();
    const next = computeNextScheduledAt("30 10 * * *", now);

    expect(next).toBe(new Date(2026, 3, 25, 10, 30, 0).getTime());
  });

  it("returns null for invalid cron expressions", () => {
    expect(computeNextScheduledAt("not-a-cron")).toBeNull();
  });
});

