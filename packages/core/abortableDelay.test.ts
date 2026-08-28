import { describe, expect, test } from "bun:test";
import { waitForAbortableDelay } from "./abortableDelay";

describe("waitForAbortableDelay", () => {
  test("resolves after the delay", async () => {
    const started = Date.now();
    await waitForAbortableDelay(30);
    expect(Date.now() - started).toBeGreaterThanOrEqual(25);
  });

  test("rejects immediately when signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      waitForAbortableDelay(100, controller.signal),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  test("rejects on abort while waiting and clears the timer", async () => {
    const controller = new AbortController();
    const promise = waitForAbortableDelay(10_000, controller.signal);
    setTimeout(() => controller.abort(), 10);
    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  });

  test("coerces non-finite/negative delays to zero", async () => {
    await waitForAbortableDelay(Number.NaN);
    await waitForAbortableDelay(-5);
  });

  test("works without a signal", async () => {
    await waitForAbortableDelay(5);
  });
});
