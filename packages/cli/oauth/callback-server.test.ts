import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

import { describe, expect, test } from "bun:test";

import { startCallbackServer } from "./callback-server";

describe("startCallbackServer", () => {
  test("falls back to a random loopback port when the preferred port is busy", async () => {
    const blocker = createServer();
    await new Promise<void>((resolve, reject) => {
      blocker.once("error", reject);
      blocker.listen(0, "127.0.0.1", resolve);
    });
    const occupiedPort = (blocker.address() as AddressInfo).port;

    const callback = await startCallbackServer({
      port: occupiedPort,
      hostname: "127.0.0.1",
      fallbackToRandomPort: true,
    });
    try {
      expect(callback.port).toBeGreaterThan(0);
      expect(callback.port).not.toBe(occupiedPort);
    } finally {
      await callback.close();
      await new Promise<void>((resolve) => blocker.close(() => resolve()));
    }
  });
});
