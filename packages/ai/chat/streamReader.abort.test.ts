import { describe, expect, test } from "bun:test";
import { createAbortError, readStreamChunk } from "./streamReader";

describe("readStreamChunk abort race", () => {
  test("rejects immediately when signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const reader = new ReadableStream<Uint8Array>().getReader();

    await expect(readStreamChunk(reader, { signal: controller.signal })).rejects.toMatchObject({
      name: "AbortError",
    });
  });

  test("cancels a blocked reader when signal aborts mid-read", async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      pull() {
        // Stay pending until cancel arrives.
        return new Promise(() => {});
      },
      cancel() {
        cancelled = true;
      },
    });
    const reader = stream.getReader();
    const abortController = new AbortController();

    const pending = readStreamChunk(reader, { signal: abortController.signal });
    // Let the read attach before aborting.
    await Promise.resolve();
    abortController.abort();

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(cancelled).toBe(true);
    expect(createAbortError().name).toBe("AbortError");
  });

  test("still enforces stall timeout when no abort fires", async () => {
    const stream = new ReadableStream<Uint8Array>({
      pull() {
        // Never enqueue — timeout should win.
        return new Promise(() => {});
      },
    });
    const reader = stream.getReader();

    await expect(
      readStreamChunk(reader, {
        timeoutMs: 20,
        timeoutErrorMessage: "stalled",
      }),
    ).rejects.toThrow("stalled");
  });
});
