import { describe, it, expect } from "bun:test";
import { MemoryDB } from "database-engine/MemoryDB";
import { createTokenKey } from "database/keys";
import { queryUserTokens } from "./queryUserTokens";

describe("queryUserTokens", () => {
  it("returns filtered total with pagination and normalizes createdAt from timestamp", async () => {
    const db = new MemoryDB();
    const userId = "u-token-test";
    const dayStart = Date.UTC(2026, 2, 2, 0, 0, 0, 0);

    await db.put(createTokenKey.record(userId, dayStart + 1_000), {
      id: "r1",
      model: "m1",
      createdAt: dayStart + 1_000,
    });
    await db.put(createTokenKey.record(userId, dayStart + 2_000), {
      id: "r2",
      model: "m1",
      timestamp: dayStart + 2_000,
    });
    await db.put(createTokenKey.record(userId, dayStart + 3_000), {
      id: "r3",
      model: "m2",
      timestamp: dayStart + 3_000,
    });
    await db.put(createTokenKey.record(userId, dayStart + 4_000), {
      id: "r4",
      model: "m1",
      timestamp: dayStart + 4_000,
    });
    await db.put(createTokenKey.recordForStableCall(userId, "provider-call-stable"), {
      id: "stable",
      model: "m1",
      timestamp: dayStart + 5_000,
    });

    const result = await queryUserTokens(db, {
      userId,
      startTime: dayStart,
      model: "m1",
      offset: 1,
      pageSize: 1,
    });

    expect(result.total).toBe(4);
    expect(result.records).toHaveLength(1);
    expect(result.records[0].id).toBe("r4");
    expect(result.records[0].createdAt).toBe(dayStart + 4_000);
  });
});
