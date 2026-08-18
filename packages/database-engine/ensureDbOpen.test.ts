import { describe, expect, it } from "bun:test";
import { ensureDbOpen } from "./ensureDbOpen";

describe("ensureDbOpen", () => {
  it("waits for an in-flight open before returning", async () => {
    const openGate: { resolve: (() => void) | null } = { resolve: null };
    let resolved = false;
    let openCalls = 0;

    const db = {
      status: "opening",
      open: () => {
        openCalls += 1;
        return new Promise<void>((resolve) => {
          openGate.resolve = resolve;
        });
      },
    };

    const ensurePromise = ensureDbOpen(db).then(() => {
      resolved = true;
    });

    await Promise.resolve();

    expect(openCalls).toBe(1);
    expect(resolved).toBe(false);

    openGate.resolve?.();
    await ensurePromise;

    expect(resolved).toBe(true);
  });

  it("does not re-open an already open database", async () => {
    let openCalls = 0;

    await ensureDbOpen({
      status: "open",
      open: async () => {
        openCalls += 1;
      },
    });

    expect(openCalls).toBe(0);
  });
});
