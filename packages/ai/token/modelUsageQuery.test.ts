import { describe, expect, it } from "bun:test";
import { MemoryDB } from "database-engine/MemoryDB";
import { createTokenKey } from "database/keys";
import { DataType } from "create/types";
import { queryModelUsage } from "./modelUsageQuery";

const putToken = async (
  db: MemoryDB,
  userId: string,
  timestamp: number,
  overrides: Record<string, unknown>,
) => {
  const key = createTokenKey.record(userId, timestamp);
  await db.put(key, {
    id: key,
    type: DataType.TOKEN,
    userId,
    timestamp,
    createdAt: timestamp,
    provider: "google",
    model: "gemini-3.5-flash",
    billing_service_tier: "standard",
    input_tokens: 10,
    output_tokens: 20,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    cost: 0.25,
    ...overrides,
  });
};

describe("queryModelUsage", () => {
  it("aggregates exact provider, model, and service tier usage for the requesting user", async () => {
    const db = new MemoryDB();
    const day = Date.UTC(2026, 4, 6, 3, 0, 0);

    await putToken(db, "user-a", day, {
      model: "gemini-3.5-flash",
      billing_service_tier: "flex",
      input_tokens: 100,
      output_tokens: 50,
      cost: 1.25,
    });
    await putToken(db, "user-a", day + 1_000, {
      model: "gemini-2.5-pro",
      billing_service_tier: "standard",
      cost: 2,
    });
    await putToken(db, "user-b", day + 2_000, {
      model: "gemini-3.5-flash",
      billing_service_tier: "flex",
      cost: 99,
    });

    const result = await queryModelUsage(db, {
      requestUserId: "user-a",
      scope: "user",
      provider: "google",
      model: "gemini-3.5-flash",
      serviceTier: "flex",
      startDate: "2026-05-06",
      endDate: "2026-05-06",
      creditsPerUsd: 8,
    });

    expect(result.scope).toBe("user");
    expect(result.userId).toBe("user-a");
    expect(result.total.count).toBe(1);
    expect(result.total.costCredits).toBe(1.25);
    expect(result.total.costUsd).toBe(0.15625);
    expect(result.total.inputTokens).toBe(100);
    expect(result.models["gemini-3.5-flash"]?.costCredits).toBe(1.25);
    expect(result.providers.google?.count).toBe(1);
    expect(result.serviceTiers.flex?.count).toBe(1);
  });

  it("rejects non-admin requests for another user or all-site usage", async () => {
    const db = new MemoryDB();

    await expect(
      queryModelUsage(db, {
        requestUserId: "user-a",
        userId: "user-b",
        scope: "user",
      }),
    ).rejects.toThrow("MODEL_USAGE_FORBIDDEN");

    await expect(
      queryModelUsage(db, {
        requestUserId: "user-a",
        scope: "all",
      }),
    ).rejects.toThrow("MODEL_USAGE_FORBIDDEN");
  });

  it("allows admins to aggregate all-site usage across users and currencies", async () => {
    const db = new MemoryDB();
    const day = Date.UTC(2026, 4, 6, 9, 0, 0);

    await putToken(db, "user-a", day, { provider: "google", cost: 4 });
    await putToken(db, "user-b", day + 1_000, { provider: "openai", cost: 12 });

    const result = await queryModelUsage(db, {
      requestUserId: "admin",
      isAdmin: true,
      scope: "all",
      startDate: "2026-05-06",
      endDate: "2026-05-06",
      creditsPerUsd: 4,
      currency: "CNY",
    });

    expect(result.scope).toBe("all");
    expect(result.total.count).toBe(2);
    expect(result.total.costCredits).toBe(16);
    expect(result.total.costUsd).toBe(4);
    expect(result.currency).toBe("CNY");
    expect(result.providers.google?.costCredits).toBe(4);
    expect(result.providers.openai?.costCredits).toBe(12);
  });

  it("returns threshold usage as a 0-100 display percent for credits and usd thresholds", async () => {
    const db = new MemoryDB();
    const day = Date.UTC(2026, 4, 6, 9, 0, 0);

    await putToken(db, "user-a", day, { cost: 2 });

    const creditsThreshold = await queryModelUsage(db, {
      requestUserId: "user-a",
      scope: "user",
      startDate: "2026-05-06",
      endDate: "2026-05-06",
      thresholdCredits: 8,
      creditsPerUsd: 4,
    });

    expect(creditsThreshold.threshold.costCredits).toBe(8);
    expect(creditsThreshold.threshold.costUsd).toBe(2);
    expect(creditsThreshold.threshold.usedPercent).toBe(25);
    expect(creditsThreshold.threshold.exceeded).toBe(false);

    const usdThreshold = await queryModelUsage(db, {
      requestUserId: "user-a",
      scope: "user",
      startDate: "2026-05-06",
      endDate: "2026-05-06",
      thresholdUsd: 1,
      creditsPerUsd: 4,
    });

    expect(usdThreshold.threshold.costCredits).toBe(4);
    expect(usdThreshold.threshold.costUsd).toBe(1);
    expect(usdThreshold.threshold.usedPercent).toBe(50);
    expect(usdThreshold.threshold.exceeded).toBe(false);
  });

  it("caps threshold usedPercent at 100 when usage exceeds the threshold", async () => {
    const db = new MemoryDB();
    const day = Date.UTC(2026, 4, 6, 9, 0, 0);

    await putToken(db, "user-a", day, { cost: 12 });

    const result = await queryModelUsage(db, {
      requestUserId: "user-a",
      scope: "user",
      startDate: "2026-05-06",
      endDate: "2026-05-06",
      thresholdCredits: 8,
    });

    expect(result.threshold.usedPercent).toBe(100);
    expect(result.threshold.exceeded).toBe(true);
  });
});
