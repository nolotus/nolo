import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { loadProfileConfig } from "./client/profileConfig";
import {
  LOGIN_HELP_TEXT,
  runLoginCommand,
  runLogoutCommand,
  runWhoamiCommand,
} from "./authCommands";

describe("cli auth commands source", () => {
  test("profile config supports command-saved login values", () => {
    const dir = mkdtempSync(join(tmpdir(), "nolo-auth-"));
    try {
      const configPath = join(dir, "config.json");
      const config = {
        currentProfile: "default",
        profiles: {
          default: {
            serverUrl: "https://nolo.chat",
            authToken: "token-abc",
          },
        },
      };
      writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

      expect(loadProfileConfig(configPath)).toEqual(config);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("login --help prints usage without starting web login", async () => {
    const logs: string[] = [];
    const exitCode = await runLoginCommand(["--help"], {
      output: { log: (message: string) => logs.push(message) },
      error: { error: (message: string) => logs.push(message) },
      fetchImpl: async () => {
        throw new Error("login --help should not call the network");
      },
    });

    expect(exitCode).toBe(0);
    expect(logs.join("\n").trimEnd()).toBe(LOGIN_HELP_TEXT.trimEnd());
  });

  test("login --token keeps the direct profile save path", async () => {
    const dir = mkdtempSync(join(tmpdir(), "nolo-auth-token-"));
    try {
      const configPath = join(dir, "config.json");
      const exitCode = await runLoginCommand(
        ["--server", "http://us.nolo.chat", "--token", "token-direct"],
        {
          configPath,
          question: async () => {
            throw new Error("login --token should not prompt");
          },
          output: { log() {} },
          error: { error() {} },
        }
      );

      expect(exitCode).toBe(0);
      expect(loadProfileConfig(configPath)).toEqual({
        currentProfile: "default",
        profiles: {
          default: {
            serverUrl: "https://us.nolo.chat",
            authToken: "token-direct",
          },
        },
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("whoami shows profile and effective server when env overrides the profile", () => {
    const dir = mkdtempSync(join(tmpdir(), "nolo-auth-whoami-"));
    const logs: string[] = [];
    try {
      const configPath = join(dir, "config.json");
      writeFileSync(configPath, `${JSON.stringify({
        currentProfile: "default",
        profiles: {
          default: {
            serverUrl: "https://nolo.chat",
            authToken: "token-direct",
          },
        },
      }, null, 2)}\n`, "utf8");

      const exitCode = runWhoamiCommand({
        configPath,
        env: { NOLO_SERVER: "https://us.nolo.chat" } as NodeJS.ProcessEnv,
        output: { log: (message: string) => logs.push(message) },
      });

      expect(exitCode).toBe(0);
      expect(logs).toContain("profile server: https://nolo.chat");
      expect(logs).toContain("effective server: https://us.nolo.chat");
      expect(logs).toContain("server source: env");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("default login starts browser authorization, polls, and saves the approved token", async () => {
    const dir = mkdtempSync(join(tmpdir(), "nolo-auth-web-"));
    const logs: string[] = [];
    const opened: string[] = [];
    const requests: Array<{ url: string; body: any }> = [];
    try {
      const configPath = join(dir, "config.json");
      const exitCode = await runLoginCommand(["--server", "https://nolo.chat"], {
        configPath,
        question: async () => {
          throw new Error("web login should not prompt for a token");
        },
        output: { log: (message: string) => logs.push(message) },
        error: { error: (message: string) => logs.push(message) },
        openBrowser: async (url) => {
          opened.push(url);
          return true;
        },
        sleep: async () => {},
        fetchImpl: async (url, init) => {
          const body = init?.body ? JSON.parse(String(init.body)) : {};
          requests.push({ url: String(url), body });
          if (String(url).endsWith("/api/v1/users/cli-login/start")) {
            return Response.json({
              deviceCode: "device-1",
              userCode: "ABCD1234",
              verificationUri: "https://nolo.chat/cli/authorize",
              verificationUriComplete: "https://nolo.chat/cli/authorize?code=ABCD1234",
              interval: 1,
              expiresIn: 600,
            });
          }
          return Response.json({
            status: "approved",
            token: "token-from-browser",
            serverUrl: "http://nolo.chat",
            userId: "user-1",
          });
        },
      });

      expect(exitCode).toBe(0);
      expect(opened).toEqual(["https://nolo.chat/cli/authorize?code=ABCD1234"]);
      expect(requests.map((request) => request.url)).toEqual([
        "https://nolo.chat/api/v1/users/cli-login/start",
        "https://nolo.chat/api/v1/users/cli-login/poll",
      ]);
      expect(requests[1]?.body).toEqual({ deviceCode: "device-1" });
      expect(logs.join("\n")).toContain("ABCD1234");
      expect(logs.join("\n")).toContain(
        "[nolo] Waiting for browser authorization (10m 0s remaining)..."
      );
      expect(loadProfileConfig(configPath)).toEqual({
        currentProfile: "default",
        profiles: {
          default: {
            serverUrl: "https://nolo.chat",
            authToken: "token-from-browser",
          },
        },
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("web login prints periodic waiting status while polling", async () => {
    const dir = mkdtempSync(join(tmpdir(), "nolo-auth-web-wait-"));
    const logs: string[] = [];
    let pollCount = 0;
    const startTime = 1_000_000;
    try {
      const configPath = join(dir, "config.json");
      const exitCode = await runLoginCommand(["--server", "https://nolo.chat", "--no-browser"], {
        configPath,
        output: { log: (message: string) => logs.push(message) },
        error: { error: (message: string) => logs.push(message) },
        openBrowser: async () => false,
        sleep: async () => {},
        now: () => startTime + pollCount * 16_000,
        fetchImpl: async (url) => {
          if (String(url).endsWith("/api/v1/users/cli-login/start")) {
            return Response.json({
              deviceCode: "device-1",
              userCode: "ABCD1234",
              verificationUri: "https://nolo.chat/cli/authorize",
              verificationUriComplete: "https://nolo.chat/cli/authorize?code=ABCD1234",
              interval: 1,
              expiresIn: 600,
            });
          }
          pollCount += 1;
          if (pollCount < 3) {
            return new Response(JSON.stringify({ status: "pending" }), { status: 202 });
          }
          return Response.json({
            status: "approved",
            token: "token-from-browser",
            serverUrl: "https://nolo.chat",
            userId: "user-1",
          });
        },
      });

      expect(exitCode).toBe(0);
      expect(logs.join("\n")).toContain("[nolo] Still waiting...");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("logout clears only the auth token and keeps other profile fields", () => {
    const dir = mkdtempSync(join(tmpdir(), "nolo-auth-logout-"));
    const logs: string[] = [];
    try {
      const configPath = join(dir, "config.json");
      writeFileSync(
        configPath,
        `${JSON.stringify(
          {
            currentProfile: "default",
            profiles: {
              default: {
                serverUrl: "https://nolo.chat",
                authToken: "token-direct",
                agentKey: "agent-pub-abc",
                agentName: "app-builder",
              },
            },
          },
          null,
          2
        )}\n`,
        "utf8"
      );

      const exitCode = runLogoutCommand({
        configPath,
        env: {},
        output: { log: (message: string) => logs.push(message) },
      });

      expect(exitCode).toBe(0);
      expect(logs).toEqual(["Logged out."]);
      expect(loadProfileConfig(configPath)).toEqual({
        currentProfile: "default",
        profiles: {
          default: {
            serverUrl: "https://nolo.chat",
            agentKey: "agent-pub-abc",
            agentName: "app-builder",
          },
        },
      });
      expect(
        runWhoamiCommand({
          configPath,
          env: {},
          output: { log: (message: string) => logs.push(message) },
        })
      ).toBe(1);
      expect(logs).toContain("Not logged in. Run: nolo login");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("login after logout preserves agent preferences in the profile", async () => {
    const dir = mkdtempSync(join(tmpdir(), "nolo-auth-relogin-"));
    try {
      const configPath = join(dir, "config.json");
      writeFileSync(
        configPath,
        `${JSON.stringify(
          {
            currentProfile: "default",
            profiles: {
              default: {
                serverUrl: "https://nolo.chat",
                agentKey: "agent-pub-abc",
                agentName: "app-builder",
              },
            },
          },
          null,
          2
        )}\n`,
        "utf8"
      );

      const exitCode = await runLoginCommand(
        ["--server", "https://us.nolo.chat", "--token", "token-after-logout"],
        {
          configPath,
          output: { log() {} },
          error: { error() {} },
        }
      );

      expect(exitCode).toBe(0);
      expect(loadProfileConfig(configPath)).toEqual({
        currentProfile: "default",
        profiles: {
          default: {
            serverUrl: "https://us.nolo.chat",
            authToken: "token-after-logout",
            agentKey: "agent-pub-abc",
            agentName: "app-builder",
          },
        },
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("whoami reports env AUTH_TOKEN when profile token was cleared", () => {
    const dir = mkdtempSync(join(tmpdir(), "nolo-auth-whoami-env-"));
    const logs: string[] = [];
    try {
      const configPath = join(dir, "config.json");
      writeFileSync(
        configPath,
        `${JSON.stringify(
          {
            currentProfile: "default",
            profiles: {
              default: {
                serverUrl: "https://nolo.chat",
                agentKey: "agent-pub-abc",
              },
            },
          },
          null,
          2
        )}\n`,
        "utf8"
      );

      const exitCode = runWhoamiCommand({
        configPath,
        env: { AUTH_TOKEN: "ambient-token-123" } as NodeJS.ProcessEnv,
        output: { log: (message: string) => logs.push(message) },
      });

      expect(exitCode).toBe(0);
      expect(logs).toContain("profile: not logged in (no saved token)");
      expect(logs).toContain("env token: ambient-... (source: environment)");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("logout warns when AUTH_TOKEN remains in the environment", () => {
    const dir = mkdtempSync(join(tmpdir(), "nolo-auth-logout-env-"));
    const logs: string[] = [];
    try {
      const configPath = join(dir, "config.json");
      writeFileSync(
        configPath,
        `${JSON.stringify(
          {
            currentProfile: "default",
            profiles: {
              default: {
                serverUrl: "https://nolo.chat",
                authToken: "token-direct",
              },
            },
          },
          null,
          2
        )}\n`,
        "utf8"
      );

      const exitCode = runLogoutCommand({
        configPath,
        env: { AUTH_TOKEN: "ambient-token-123" } as NodeJS.ProcessEnv,
        output: { log: (message: string) => logs.push(message) },
      });

      expect(exitCode).toBe(0);
      expect(logs).toContain("Logged out.");
      expect(logs.some((line) => line.includes("AUTH_TOKEN in the environment"))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
