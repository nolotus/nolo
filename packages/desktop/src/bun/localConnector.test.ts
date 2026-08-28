import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  resolveDesktopConnectorServerUrl,
  resolveDesktopProfileEnv,
  startDesktopLocalConnector,
} from "./localConnector";

describe("desktop local connector", () => {
  test("resolves CLI profile auth for desktop connector autostart", () => {
    const dir = mkdtempSync(join(tmpdir(), "nolo-desktop-connector-"));
    const configPath = join(dir, "config.json");
    writeFileSync(configPath, JSON.stringify({
      currentProfile: "default",
      profiles: {
        default: {
          serverUrl: "https://agent.nolo.chat",
          authToken: "token-abc",
        },
      },
    }));

    expect(resolveDesktopProfileEnv(configPath)).toEqual({
      NOLO_PROFILE: "default",
      NOLO_SERVER: "https://agent.nolo.chat",
      AUTH_TOKEN: "token-abc",
    });
  });

  test("routes canary desktop connector traffic to us when the CLI profile points at localhost", () => {
    const dir = mkdtempSync(join(tmpdir(), "nolo-desktop-connector-"));
    const configPath = join(dir, "config.json");
    writeFileSync(configPath, JSON.stringify({
      currentProfile: "default",
      profiles: {
        default: {
          serverUrl: "http://127.0.0.1:38123",
          authToken: "token-abc",
        },
      },
    }));

    expect(resolveDesktopProfileEnv(configPath, { channel: "canary" })).toEqual({
      NOLO_PROFILE: "default",
      NOLO_SERVER: "https://us.nolo.chat",
      AUTH_TOKEN: "token-abc",
    });
  });

  test("lets an explicit desktop connector server override channel defaults", () => {
    expect(resolveDesktopConnectorServerUrl({
      channel: "canary",
      env: { NOLO_DESKTOP_CONNECTOR_SERVER: "https://agent.nolo.chat/" },
      profileServerUrl: "http://127.0.0.1:38123",
    })).toBe("https://agent.nolo.chat");
  });

  test("skips connector autostart when no CLI profile exists", async () => {
    const chunks: string[] = [];
    const result = await startDesktopLocalConnector({
      configPath: join(tmpdir(), "missing-nolo-profile.json"),
      output: { write(chunk) { chunks.push(chunk); } },
      runConnect: async () => {
        throw new Error("should not run without auth");
      },
    });

    expect(result.started).toBe(false);
    if (result.started) throw new Error("expected missing-profile result");
    expect(result.reason).toBe("missing-profile");
    expect(typeof result.stop).toBe("function");
    expect(chunks.join("")).toContain("connector autostart skipped");
  });

  test("starts from desktop-owned auth when no CLI profile exists", async () => {
    const chunks: string[] = [];
    const calls: Array<{
      args: string[];
      env: Record<string, string | undefined>;
      signal: AbortSignal | undefined;
    }> = [];

    const result = await startDesktopLocalConnector({
      configPath: join(tmpdir(), "missing-nolo-profile.json"),
      output: { write(chunk) { chunks.push(chunk); } },
      desktopAuthEnv: {
        NOLO_SERVER: "https://desktop.nolo.chat",
        AUTH_TOKEN: "desktop-token",
      },
      runConnect: async (args, deps) => {
        calls.push({ args, env: deps.env, signal: deps.signal });
        return 0;
      },
    });
    await Bun.sleep(0);

    expect(result.started).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].args).toEqual(["--ws"]);
    expect(calls[0].env.NOLO_SERVER).toBe("https://desktop.nolo.chat");
    expect(calls[0].env.AUTH_TOKEN).toBe("desktop-token");
    expect(chunks.join("")).toContain("autostarted");
  });

  test("starts connector websocket silently when CLI profile exists", async () => {
    const dir = mkdtempSync(join(tmpdir(), "nolo-desktop-connector-"));
    const configPath = join(dir, "config.json");
    const chunks: string[] = [];
    const calls: Array<{
      args: string[];
      env: Record<string, string | undefined>;
      signal: AbortSignal | undefined;
    }> = [];
    writeFileSync(configPath, JSON.stringify({
      currentProfile: "default",
      profiles: {
        default: {
          serverUrl: "https://agent.nolo.chat",
          authToken: "token-abc",
        },
      },
    }));

    const result = await startDesktopLocalConnector({
      configPath,
      output: { write(chunk) { chunks.push(chunk); } },
      runConnect: async (args, deps) => {
        calls.push({ args, env: deps.env, signal: deps.signal });
        return 0;
      },
      channel: "stable",
    });
    await Bun.sleep(0);

    expect(result.started).toBe(true);
    expect(typeof result.stop).toBe("function");
    expect(calls).toHaveLength(1);
    expect(calls[0].args).toEqual(["--ws"]);
    expect(calls[0].env.NOLO_SERVER).toBe("https://agent.nolo.chat");
    expect(calls[0].env.AUTH_TOKEN).toBe("token-abc");
    expect(calls[0].signal).toBeInstanceOf(AbortSignal);
    expect(chunks.join("")).toContain("autostarted");

    result.stop();
    expect(calls[0].signal?.aborted).toBe(true);
  });
});
