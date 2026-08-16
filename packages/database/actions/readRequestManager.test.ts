import { describe, it, expect } from "bun:test";
import { ReadRequestManager } from "./readRequestManager";

describe("ReadRequestManager", () => {
  it("tracks and clears in-flight reads safely", async () => {
    const manager = new ReadRequestManager();
    const promise = Promise.resolve({ ok: true });

    manager.setInFlight("k1", promise);
    expect(manager.getInFlight("k1")).toBe(promise);

    // different promise should not clear current in-flight
    manager.clearInFlight("k1", Promise.resolve(null));
    expect(manager.getInFlight("k1")).toBe(promise);

    manager.clearInFlight("k1", promise);
    expect(manager.getInFlight("k1")).toBeUndefined();

    const value = await promise;
    expect(value).toEqual({ ok: true });
  });

  it("applies miss cooldown and expires suppression", () => {
    const manager = new ReadRequestManager();

    manager.markMiss("k1", 1000, 2000); // suppress until t=3000
    expect(manager.getRetryInMs("k1", 2000)).toBe(1000);
    expect(manager.getRetryInMs("k1", 2999)).toBe(1);
    expect(manager.getRetryInMs("k1", 3000)).toBeNull();
    expect(manager.getRetryInMs("k1", 3500)).toBeNull();
  });

  it("keeps miss cache bounded and evicts oldest overflow", () => {
    const manager = new ReadRequestManager({ missCacheMaxSize: 3 });

    manager.markMiss("k1", 1000, 5000);
    manager.markMiss("k2", 1000, 5000);
    manager.markMiss("k3", 1000, 5000);
    manager.markMiss("k4", 1000, 5000); // overflow by 1, should evict oldest

    expect(manager.getMissCacheSize()).toBe(3);
    expect(manager.getRetryInMs("k1", 1001)).toBeNull();
    expect(manager.getRetryInMs("k2", 1001)).toBeGreaterThan(0);
    expect(manager.getRetryInMs("k3", 1001)).toBeGreaterThan(0);
    expect(manager.getRetryInMs("k4", 1001)).toBeGreaterThan(0);
  });

  it("applies local-hit revalidation cooldown and expires correctly", () => {
    const manager = new ReadRequestManager();

    manager.markLocalHitRevalidated("k1", 1000, 1500); // cooldown until t=2500
    expect(manager.getLocalHitRevalidateInMs("k1", 2000)).toBe(500);
    expect(manager.getLocalHitRevalidateInMs("k1", 2499)).toBe(1);
    expect(manager.getLocalHitRevalidateInMs("k1", 2500)).toBeNull();
  });

  it("keeps local-hit revalidation cache bounded and evicts oldest overflow", () => {
    const manager = new ReadRequestManager({ missCacheMaxSize: 2 });

    manager.markLocalHitRevalidated("k1", 1000, 5000);
    manager.markLocalHitRevalidated("k2", 1000, 5000);
    manager.markLocalHitRevalidated("k3", 1000, 5000); // overflow by 1

    expect(manager.getLocalHitRevalidationCacheSize()).toBe(2);
    expect(manager.getLocalHitRevalidateInMs("k1", 1001)).toBeNull();
    expect(manager.getLocalHitRevalidateInMs("k2", 1001)).toBeGreaterThan(0);
    expect(manager.getLocalHitRevalidateInMs("k3", 1001)).toBeGreaterThan(0);
  });
});
