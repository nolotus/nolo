import { describe, expect, test } from "bun:test";
import { readXPostWithBridge } from "./readXPostWithBridge";

describe("readXPostWithBridge", () => {
  test("starts and stops the bridge around a read", async () => {
    const calls: string[] = [];
    const result = await readXPostWithBridge("https://x.com/user/status/123", {
      bridge: {
        async start() {
          calls.push("start");
          return {
            endpoint: "http://127.0.0.1:9222",
            port: 9222,
            profileDir: "profile",
            webSocketDebuggerUrl: "ws://example",
          };
        },
        async stop() {
          calls.push("stop");
        },
        getSession() {
          return null;
        },
      },
      readerFactory: (endpoint) => {
        calls.push(`reader:${endpoint}`);
        return {
          async readVisiblePost(url) {
            calls.push(`read:${url}`);
            return {
              ok: true,
              backend: "desktop_local_browser",
              fetchedAt: "2026-05-06T05:00:00.000Z",
              data: {
                id: "123",
                url,
                author: { handle: "user" },
                text: "hello",
                media: [],
                sourceBackend: "desktop_local_browser",
                fetchedAt: "2026-05-06T05:00:00.000Z",
              },
            };
          },
          async readVisibleThread(url) {
            throw new Error(`Unexpected thread read: ${url}`);
          },
        };
      },
    });

    expect(calls).toEqual([
      "start",
      "reader:http://127.0.0.1:9222",
      "read:https://x.com/user/status/123",
      "stop",
    ]);
    expect(result.ok).toBe(true);
  });

  test("passes profile and headed options to the default bridge", async () => {
    const previousProfile = process.env.NOLO_X_READER_PROFILE_DIR;
    const previousHeadless = process.env.NOLO_X_READER_HEADLESS;
    process.env.NOLO_X_READER_PROFILE_DIR = "C:\\tmp\\nolo-x-persistent";
    process.env.NOLO_X_READER_HEADLESS = "false";
    const calls: string[] = [];

    try {
      const result = await readXPostWithBridge("https://x.com/user/status/123", {
        bridge: {
          async start() {
            calls.push("start");
            return {
              endpoint: "http://127.0.0.1:9222",
              port: 9222,
              profileDir: "C:\\tmp\\nolo-x-persistent",
              webSocketDebuggerUrl: "ws://example",
            };
          },
          async stop() {
            calls.push("stop");
          },
          getSession() {
            return null;
          },
        },
        readerFactory: () => ({
          async readVisiblePost(url) {
            return {
              ok: true,
              backend: "desktop_local_browser",
              fetchedAt: "2026-05-06T05:00:00.000Z",
              data: {
                id: "123",
                url,
                author: { handle: "user" },
                text: "hello",
                media: [],
                sourceBackend: "desktop_local_browser",
                fetchedAt: "2026-05-06T05:00:00.000Z",
              },
            };
          },
          async readVisibleThread(url) {
            throw new Error(`Unexpected thread read: ${url}`);
          },
        }),
      });

      expect(result.ok).toBe(true);
      expect(calls).toEqual(["start", "stop"]);
    } finally {
      if (previousProfile === undefined) delete process.env.NOLO_X_READER_PROFILE_DIR;
      else process.env.NOLO_X_READER_PROFILE_DIR = previousProfile;
      if (previousHeadless === undefined) delete process.env.NOLO_X_READER_HEADLESS;
      else process.env.NOLO_X_READER_HEADLESS = previousHeadless;
    }
  });
});
