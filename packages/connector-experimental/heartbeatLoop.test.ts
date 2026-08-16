import { describe, expect, test } from "bun:test";

import { runHeartbeatLoop } from "./heartbeatLoop";

describe("connector heartbeat loop", () => {
  test("sends the first heartbeat immediately and then repeats", async () => {
    const sentAt: number[] = [];
    const waits: number[] = [];
    let now = 10;

    await runHeartbeatLoop({
      intervalMs: 250,
      maxBeats: 3,
      sendHeartbeat: async () => {
        sentAt.push(now);
      },
      sleep: async (ms) => {
        waits.push(ms);
        now += ms;
      },
    });

    expect(sentAt).toEqual([10, 260, 510]);
    expect(waits).toEqual([250, 250]);
  });

  test("stops before the next sleep when aborted", async () => {
    const controller = new AbortController();
    let count = 0;

    await runHeartbeatLoop({
      intervalMs: 100,
      signal: controller.signal,
      sendHeartbeat: async () => {
        count += 1;
        controller.abort();
      },
      sleep: async () => {
        throw new Error("sleep should not run after abort");
      },
    });

    expect(count).toBe(1);
  });
});
