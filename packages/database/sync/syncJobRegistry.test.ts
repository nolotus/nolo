import { describe, expect, test } from "bun:test";

import { createSyncJobRegistry } from "./syncJobRegistry";

describe("syncJobRegistry", () => {
  test("register returns AbortSignal and cancel aborts it", () => {
    const registry = createSyncJobRegistry({ now: () => 10 });
    const job = registry.register({
      id: "job-1",
      accountUserId: "user1",
      label: "push-agent",
    });

    expect(job.signal.aborted).toBe(false);
    expect(registry.size()).toBe(1);
    expect(registry.list({ accountUserId: "user1" })).toHaveLength(1);

    expect(registry.cancel("job-1")).toBe(true);
    expect(job.signal.aborted).toBe(true);
    expect(registry.size()).toBe(0);
    expect(registry.get("job-1")).toBeNull();
  });

  test("cancelByAccountUserId only targets that account", () => {
    const registry = createSyncJobRegistry();
    const a = registry.register({ accountUserId: "user-a" });
    const b = registry.register({ accountUserId: "user-b" });
    const orphan = registry.register({ label: "no-account" });

    expect(registry.cancelByAccountUserId("user-a")).toBe(1);
    expect(a.signal.aborted).toBe(true);
    expect(b.signal.aborted).toBe(false);
    expect(orphan.signal.aborted).toBe(false);
    expect(registry.size()).toBe(2);
  });

  test("cancelAll aborts every active job", () => {
    const registry = createSyncJobRegistry();
    const jobs = [
      registry.register({ accountUserId: "u1" }),
      registry.register({ accountUserId: "u2" }),
      registry.register({}),
    ];

    expect(registry.cancelAll(new Error("logout"))).toBe(3);
    expect(jobs.every((job) => job.signal.aborted)).toBe(true);
    expect(registry.size()).toBe(0);
  });

  test("external AbortController abort removes the job", () => {
    const registry = createSyncJobRegistry();
    const controller = new AbortController();
    const job = registry.register({
      id: "external",
      controller,
      accountUserId: "user1",
    });

    expect(registry.size()).toBe(1);
    controller.abort();
    expect(job.signal.aborted).toBe(true);
    expect(registry.size()).toBe(0);
  });

  test("rejects duplicate job ids", () => {
    const registry = createSyncJobRegistry();
    registry.register({ id: "dup" });
    expect(() => registry.register({ id: "dup" })).toThrow(/already registered/);
  });
});
