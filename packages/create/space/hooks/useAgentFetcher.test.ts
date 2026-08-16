import { describe, it, expect } from "bun:test";
import { calculateRetryDelayMs } from "./agentFetchRetry";

describe("calculateRetryDelayMs", () => {
  it("grows exponentially by attempt and includes jitter", () => {
    const d1 = calculateRetryDelayMs(1, 0);
    const d2 = calculateRetryDelayMs(2, 0);
    const d3 = calculateRetryDelayMs(3, 0);

    expect(d1).toBe(1200);
    expect(d2).toBe(2400);
    expect(d3).toBe(4800);

    const withJitter = calculateRetryDelayMs(2, 0.5);
    expect(withJitter).toBeGreaterThan(2400);
    expect(withJitter).toBeLessThan(3000);
  });

  it("caps at max delay window for high attempts", () => {
    const d6 = calculateRetryDelayMs(6, 0);
    const d10 = calculateRetryDelayMs(10, 0);
    expect(d6).toBe(15000);
    expect(d10).toBe(15000);
  });
});
