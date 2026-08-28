import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "bun:test";
import { TOKEN } from "../testUtils";
import {
  parseUserIdFromAuthToken,
  resolveAuthToken,
  resolveExplicitAuthToken,
  resolveUserAuthToken,
} from "./authContext";

const ENV_KEYS = [
  "SUPERVISOR_AUTH_TOKEN",
  "NOLO_AUTH_TOKEN",
  "AUTH_TOKEN",
  "AUTH",
  "BENCHMARK_AUTH_TOKEN",
] as const;

function clearAuthEnv() {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
}

describe("authContext", () => {
  afterEach(() => {
    clearAuthEnv();
  });

  it("resolves explicit token from extra env keys before standard auth envs", () => {
    process.env.AUTH_TOKEN = "standard-token";
    process.env.SUPERVISOR_AUTH_TOKEN = "supervisor-token";

    expect(
      resolveExplicitAuthToken(["SUPERVISOR_AUTH_TOKEN", "NOLO_AUTH_TOKEN"]),
    ).toBe("supervisor-token");
  });

  it("does not fall back to test token when resolving explicit auth token", () => {
    clearAuthEnv();
    expect(resolveExplicitAuthToken(["SUPERVISOR_AUTH_TOKEN"])).toBe("");
  });

  it("uses current CLI profile token when auth env is absent", () => {
    clearAuthEnv();
    const dir = mkdtempSync(join(tmpdir(), "nolo-auth-context-"));
    const path = join(dir, "config.json");
    const profileToken = Buffer.from(
      JSON.stringify({ userId: "profile-user" }),
    ).toString("base64url");
    writeFileSync(
      path,
      `${JSON.stringify({
        currentProfile: "default",
        profiles: {
          default: {
            serverUrl: "https://nolo.chat",
            authToken: profileToken,
          },
        },
      })}\n`,
      "utf8",
    );

    expect(resolveAuthToken({ profileConfigPath: path })).toBe(profileToken);
  });

  it("keeps env auth ahead of current CLI profile token", () => {
    const dir = mkdtempSync(join(tmpdir(), "nolo-auth-context-"));
    const path = join(dir, "config.json");
    writeFileSync(
      path,
      `${JSON.stringify({
        currentProfile: "default",
        profiles: {
          default: {
            serverUrl: "https://nolo.chat",
            authToken: "profile-token",
          },
        },
      })}\n`,
      "utf8",
    );
    process.env.AUTH_TOKEN = "env-token";

    expect(resolveAuthToken({ profileConfigPath: path })).toBe("env-token");
  });

  it("skips opaque env tokens for user-auth resolution and falls back to profile", () => {
    const dir = mkdtempSync(join(tmpdir(), "nolo-auth-context-"));
    const path = join(dir, "config.json");
    const profileToken = Buffer.from(
      JSON.stringify({ userId: "profile-user" }),
    ).toString("base64url");
    writeFileSync(
      path,
      `${JSON.stringify({
        currentProfile: "default",
        profiles: {
          default: {
            serverUrl: "https://nolo.chat",
            authToken: profileToken,
          },
        },
      })}\n`,
      "utf8",
    );
    process.env.AUTH_TOKEN = "opaque-machine-token";

    expect(resolveUserAuthToken({ profileConfigPath: path })).toBe(profileToken);
  });

  it("keeps valid env tokens ahead of profile for user-auth resolution", () => {
    const dir = mkdtempSync(join(tmpdir(), "nolo-auth-context-"));
    const path = join(dir, "config.json");
    const profileToken = Buffer.from(
      JSON.stringify({ userId: "profile-user" }),
    ).toString("base64url");
    const envToken = Buffer.from(
      JSON.stringify({ userId: "env-user" }),
    ).toString("base64url");
    writeFileSync(
      path,
      `${JSON.stringify({
        currentProfile: "default",
        profiles: {
          default: {
            serverUrl: "https://nolo.chat",
            authToken: profileToken,
          },
        },
      })}\n`,
      "utf8",
    );
    process.env.AUTH_TOKEN = envToken;

    expect(resolveUserAuthToken({ profileConfigPath: path })).toBe(envToken);
  });

  it("keeps legacy test-token fallback for generic auth resolution", () => {
    clearAuthEnv();
    expect(resolveAuthToken({ includeProfile: false })).toBe(TOKEN);
  });

  it("parses the repository two-part script token user id", () => {
    expect(parseUserIdFromAuthToken(TOKEN)).toBe("b2e06f801f");
  });

  it("parses standard three-part JWT user id", () => {
    const payload = Buffer.from(
      JSON.stringify({ userId: "user-standard" }),
    ).toString("base64url");

    expect(parseUserIdFromAuthToken(`header.${payload}.signature`)).toBe(
      "user-standard",
    );
  });
});
