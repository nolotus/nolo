import { describe, expect, it } from "bun:test";
import { clampInteger } from "./clampedInteger";

describe("clampInteger pure seam", () => {
  it("returns fallback for non-finite inputs", () => {
    expect(clampInteger(undefined, 50, 1, 200)).toBe(50);
    expect(clampInteger(Number.NaN, 50, 1, 200)).toBe(50);
    expect(clampInteger("not-a-number", 50, 1, 200)).toBe(50);
    expect(clampInteger(Number.POSITIVE_INFINITY, 20, 1, 200)).toBe(20);
    expect(clampInteger({}, 10, 1, 100)).toBe(10);
  });

  it("truncates toward zero then clamps into [min, max]", () => {
    expect(clampInteger(3.9, 50, 1, 200)).toBe(3);
    expect(clampInteger("12.7", 50, 1, 200)).toBe(12);
    expect(clampInteger(0, 50, 1, 200)).toBe(1);
    expect(clampInteger(-5, 50, 1, 200)).toBe(1);
    expect(clampInteger(500, 50, 1, 200)).toBe(200);
    expect(clampInteger("999", 50, 1, 200)).toBe(200);
  });

  it("treats null/blank string as 0 (finite) then clamps to min", () => {
    // Matches historical parseLimit clones: Number(null|""|"   ") === 0.
    expect(clampInteger(null, 50, 1, 200)).toBe(1);
    expect(clampInteger("", 50, 1, 200)).toBe(1);
    expect(clampInteger("   ", 50, 1, 200)).toBe(1);
  });

  it("preserves in-range integers including string digits", () => {
    expect(clampInteger(1, 50, 1, 200)).toBe(1);
    expect(clampInteger(50, 50, 1, 200)).toBe(50);
    expect(clampInteger(200, 50, 1, 200)).toBe(200);
    expect(clampInteger("42", 50, 1, 200)).toBe(42);
  });

  it("honors custom min/max/fallback for other count fields", () => {
    expect(clampInteger("0", 24, 0, 1_000_000)).toBe(0);
    expect(clampInteger(undefined, 24, 0, 48)).toBe(24);
    expect(clampInteger(100, 24, 0, 48)).toBe(48);
  });

  it("pins residual rewire call-site ranges (billing/email/workspace/health)", () => {
    // providerBillingHealthReport / adminUsageReport / drilldown limits
    expect(clampInteger(undefined, 20, 1, 200)).toBe(20);
    expect(clampInteger(undefined, 50, 1, 200)).toBe(50);
    expect(clampInteger(0, 20, 1, 200)).toBe(1);
    expect(clampInteger(999, 20, 1, 200)).toBe(200);
    // ledgerWitness page size (fallback == max)
    expect(clampInteger(undefined, 1_000, 1, 1_000)).toBe(1_000);
    expect(clampInteger(2_500, 1_000, 1, 1_000)).toBe(1_000);
    // emailDelivery report days
    expect(clampInteger(undefined, 7, 1, 90)).toBe(7);
    expect(clampInteger(0, 7, 1, 90)).toBe(1);
    expect(clampInteger(120, 7, 1, 90)).toBe(90);
    // email_wait_for budgets (server + client tools)
    expect(clampInteger(undefined, 60, 1, 180)).toBe(60);
    expect(clampInteger(undefined, 3000, 500, 10_000)).toBe(3000);
    expect(clampInteger(100, 3000, 500, 10_000)).toBe(500);
    // provider health attempts
    expect(clampInteger(undefined, 2, 1, 10)).toBe(2);
    expect(clampInteger(0, 2, 1, 10)).toBe(1);
    expect(clampInteger(99, 2, 1, 10)).toBe(10);
    // app workspace search
    expect(clampInteger(undefined, 2, 0, 5)).toBe(2);
    expect(clampInteger(-1, 2, 0, 5)).toBe(0);
    expect(clampInteger(undefined, 20, 1, 50)).toBe(20);
    expect(clampInteger(100, 20, 1, 50)).toBe(50);
  });
});
