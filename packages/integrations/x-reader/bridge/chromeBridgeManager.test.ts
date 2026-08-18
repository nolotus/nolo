import { describe, expect, test } from "bun:test";
import { EventEmitter } from "node:events";
import { createChromeBridgeManager } from "./chromeBridgeManager";

class FakeChildProcess extends EventEmitter {
  killed = false;
  exitCode: number | null = null;

  kill() {
    this.killed = true;
    this.exitCode = 0;
    this.emit("exit", 0);
    return true;
  }
}

describe("createChromeBridgeManager", () => {
  test("starts Chrome with a temporary profile and CDP port", async () => {
    const child = new FakeChildProcess();
    const spawnCalls: any[][] = [];
    let fetchCalls = 0;

    const manager = createChromeBridgeManager({
      chromePath: "chrome-test",
      profileRoot: "C:\\tmp\\bridge-test",
      headless: true,
      startupTimeoutMs: 1000,
      pollIntervalMs: 1,
      portAllocator: async () => 9333,
      ensureDir: async () => {},
      spawnProcess: (command, args, options) => {
        spawnCalls.push([command, args, options]);
        return child as any;
      },
      fetchVersion: async (endpoint) => {
        fetchCalls += 1;
        expect(endpoint).toBe("http://127.0.0.1:9333/json/version");
        return {
          webSocketDebuggerUrl: "ws://127.0.0.1:9333/devtools/browser/test",
        };
      },
    });

    const session = await manager.start();

    expect(session).toMatchObject({
      endpoint: "http://127.0.0.1:9333",
      port: 9333,
      webSocketDebuggerUrl: "ws://127.0.0.1:9333/devtools/browser/test",
    });
    expect(session.profileDir).toContain("C:\\tmp\\bridge-test");
    expect(fetchCalls).toBe(1);
    expect(spawnCalls).toHaveLength(1);
    expect(spawnCalls[0][0]).toBe("chrome-test");
    expect(spawnCalls[0][1]).toContain("--headless=new");
    expect(spawnCalls[0][1]).toContain("--remote-debugging-address=127.0.0.1");
    expect(spawnCalls[0][1]).toContain("--remote-debugging-port=9333");
    expect(spawnCalls[0][1].some((arg: string) => arg.startsWith("--user-data-dir="))).toBe(true);
    expect(spawnCalls[0][2].stdio).toBe("ignore");

    await manager.stop();
    expect(child.killed).toBe(true);
  });

  test("can include Linux-safe sandbox flags", async () => {
    const child = new FakeChildProcess();
    const spawnCalls: any[][] = [];

    const manager = createChromeBridgeManager({
      chromePath: "chrome-test",
      disableSandbox: true,
      portAllocator: async () => 9446,
      ensureDir: async () => {},
      spawnProcess: (command, args, options) => {
        spawnCalls.push([command, args, options]);
        return child as any;
      },
      fetchVersion: async () => ({
        webSocketDebuggerUrl: "ws://127.0.0.1:9446/devtools/browser/test",
      }),
    });

    await manager.start();

    expect(spawnCalls[0][1]).toContain("--no-sandbox");
    expect(spawnCalls[0][1]).toContain("--disable-dev-shm-usage");

    await manager.stop();
  });

  test("reuses the active session until stopped", async () => {
    const child = new FakeChildProcess();
    let spawnCount = 0;

    const manager = createChromeBridgeManager({
      chromePath: "chrome-test",
      profileRoot: "C:\\tmp\\bridge-test",
      portAllocator: async () => 9444,
      ensureDir: async () => {},
      spawnProcess: () => {
        spawnCount += 1;
        return child as any;
      },
      fetchVersion: async () => ({
        webSocketDebuggerUrl: "ws://127.0.0.1:9444/devtools/browser/test",
      }),
    });

    const first = await manager.start();
    const second = await manager.start();

    expect(second).toBe(first);
    expect(spawnCount).toBe(1);

    await manager.stop();
    expect(child.killed).toBe(true);
  });

  test("reports browser spawn failures as read_x_post browser unavailability", async () => {
    const manager = createChromeBridgeManager({
      chromePath: async () => "missing-chrome",
      profileRoot: "C:\\tmp\\bridge-test",
      portAllocator: async () => 9445,
      ensureDir: async () => {},
      spawnProcess: () => {
        throw Object.assign(new Error("Executable not found"), { code: "ENOENT" });
      },
      fetchVersion: async () => {
        throw new Error("Unexpected fetchVersion call");
      },
    });

    await expect(manager.start()).rejects.toMatchObject({
      code: "READ_X_POST_BROWSER_UNAVAILABLE",
      message: expect.stringContaining("missing-chrome"),
    });
  });

  test("can start Chrome with a fixed persistent profile directory", async () => {
    const child = new FakeChildProcess();
    const spawnCalls: any[][] = [];
    const ensuredDirs: string[] = [];

    const manager = createChromeBridgeManager({
      chromePath: "chrome-test",
      profileDir: "C:\\Users\\demo\\AppData\\Local\\Nolo\\x-reader-profile",
      profileRoot: "C:\\tmp\\unused-root",
      headless: false,
      portAllocator: async () => 9555,
      ensureDir: async (path) => {
        ensuredDirs.push(path);
      },
      spawnProcess: (command, args, options) => {
        spawnCalls.push([command, args, options]);
        return child as any;
      },
      fetchVersion: async () => ({
        webSocketDebuggerUrl: "ws://127.0.0.1:9555/devtools/browser/test",
      }),
    });

    const session = await manager.start();

    expect(session.profileDir).toBe("C:\\Users\\demo\\AppData\\Local\\Nolo\\x-reader-profile");
    expect(ensuredDirs).toEqual(["C:\\Users\\demo\\AppData\\Local\\Nolo\\x-reader-profile"]);
    expect(spawnCalls[0][1]).toContain("--user-data-dir=C:\\Users\\demo\\AppData\\Local\\Nolo\\x-reader-profile");
    expect(spawnCalls[0][1]).not.toContain("--headless=new");

    await manager.stop();
  });
});
