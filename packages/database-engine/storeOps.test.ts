import { describe, expect, it } from "bun:test";
import { storeGetMany } from "./storeOps";

describe("storeGetMany", () => {
  it("dedupes keys, omits misses, and fetches concurrently", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const store = {
      async get(key: string) {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await Promise.resolve();
        inFlight -= 1;
        if (key === "missing") {
          throw Object.assign(new Error("NotFound"), { notFound: true });
        }
        return { key };
      },
    };

    const map = await storeGetMany(store, ["a", "b", "a", "missing", "c"]);
    expect([...map.keys()].sort()).toEqual(["a", "b", "c"]);
    expect(map.get("a")).toEqual({ key: "a" });
    expect(maxInFlight).toBeGreaterThanOrEqual(2);
  });

  it("respects concurrency cap", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const store = {
      async get(key: string) {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((r) => setTimeout(r, 5));
        inFlight -= 1;
        return key;
      },
    };

    await storeGetMany(
      store,
      Array.from({ length: 10 }, (_, i) => `k${i}`),
      { concurrency: 2 }
    );
    expect(maxInFlight).toBeLessThanOrEqual(2);
  });
});