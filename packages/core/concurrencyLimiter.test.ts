import { describe, expect, test } from "bun:test";
import { createConcurrencyLimiter } from "./concurrencyLimiter";

describe("createConcurrencyLimiter", () => {
  test("runs at most maxConcurrent tasks simultaneously", async () => {
    const limiter = createConcurrencyLimiter(2);
    let active = 0;
    let maxActive = 0;

    const tasks = Array.from({ length: 10 }, () =>
      limiter.run(async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise<void>((r) => setTimeout(r, 10));
        active -= 1;
      })
    );

    await Promise.all(tasks);
    expect(maxActive).toBe(2);
  });

  test("queues excess tasks and runs them when slots free", async () => {
    const limiter = createConcurrencyLimiter(1);
    const order: number[] = [];

    const tasks = [1, 2, 3].map((n) =>
      limiter.run(async () => {
        order.push(n);
        await new Promise<void>((r) => setTimeout(r, 5));
      })
    );

    await Promise.all(tasks);
    expect(order).toEqual([1, 2, 3]);
  });

  test("propagates results and errors", async () => {
    const limiter = createConcurrencyLimiter(3);

    const ok = await limiter.run(async () => 42);
    expect(ok).toBe(42);

    await expect(limiter.run(async () => { throw new Error("boom"); })).rejects.toThrow("boom");
  });

  test("a rejected task frees its slot for pending tasks", async () => {
    const limiter = createConcurrencyLimiter(1);
    let reached = false;

    await limiter.run(async () => { throw new Error("fail"); }).catch(() => {});
    await limiter.run(async () => { reached = true; });
    expect(reached).toBe(true);
  });

  test("H-1: a sync-throwing task does not leak its slot", async () => {
    const limiter = createConcurrencyLimiter(1);
    let reached = false;

    // task throws synchronously when called (not returning a rejected promise)
    const syncThrowTask = (): Promise<unknown> => {
      throw new Error("sync boom");
    };
    await expect(limiter.run(syncThrowTask)).rejects.toThrow("sync boom");
    // .finally() runs as a microtask after the rejection — flush it before
    // asserting activeCount (the slot is freed in .finally, not in .rejects).
    await new Promise<void>((r) => setTimeout(r, 0));

    // slot must be freed — next task should run
    await limiter.run(async () => { reached = true; });
    expect(reached).toBe(true);
    // flush .finally() microtask before asserting activeCount
    await new Promise<void>((r) => setTimeout(r, 0));
    expect(limiter.activeCount).toBe(0);
  });

  test("reports active and pending counts", async () => {
    const limiter = createConcurrencyLimiter(2);
    const gate = new Promise<void>((resolve) => {
      setTimeout(resolve, 50);
    });

    const p1 = limiter.run(async () => { await gate; });
    const p2 = limiter.run(async () => { await gate; });
    const p3 = limiter.run(async () => {});

    // p1 and p2 are active (gate not yet resolved), p3 is pending
    expect(limiter.activeCount).toBe(2);
    expect(limiter.pendingCount).toBe(1);

    await Promise.all([p1, p2, p3]);
  });

  test("rejects invalid maxConcurrent", () => {
    expect(() => createConcurrencyLimiter(0)).toThrow(RangeError);
    expect(() => createConcurrencyLimiter(-1)).toThrow(RangeError);
    expect(() => createConcurrencyLimiter(1.5)).toThrow(RangeError);
  });
});