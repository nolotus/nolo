import { afterEach, describe, expect, it, mock } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { createOAuthApiKeyRefResolver } from "./apiKeyRefResolver";

describe("createOAuthApiKeyRefResolver", () => {
  let homeDir: string;

  afterEach(() => {
    if (homeDir) {
      try {
        rmSync(homeDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  });

  it("returns non-expired access token without calling refresh", async () => {
    homeDir = mkdtempSync(join(tmpdir(), "nolo-oauth-ref-"));
    const credDir = join(homeDir, ".nolo", "credentials");
    mkdirSync(credDir, { recursive: true });
    writeFileSync(
      join(credDir, "antigravity.json"),
      JSON.stringify({
        provider: "antigravity",
        accessToken: "fresh-token",
        refreshToken: "refresh-1",
        expiresAt: Date.now() + 60 * 60 * 1000,
      })
    );

    const resolver = createOAuthApiKeyRefResolver({ homeDir });
    await expect(resolver("antigravity")).resolves.toBe("fresh-token");
  });

  it("wires antigravity refresh when access token is expired", async () => {
    homeDir = mkdtempSync(join(tmpdir(), "nolo-oauth-ref-"));
    const credDir = join(homeDir, ".nolo", "credentials");
    mkdirSync(credDir, { recursive: true });
    writeFileSync(
      join(credDir, "antigravity.json"),
      JSON.stringify({
        provider: "antigravity",
        accessToken: "stale-token",
        refreshToken: "refresh-1",
        expiresAt: Date.now() - 60_000,
        metadata: { projectId: "proj-1" },
      })
    );

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async () => {
      return new Response(
        JSON.stringify({
          access_token: "refreshed-token",
          expires_in: 3600,
          refresh_token: "refresh-2",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    try {
      const resolver = createOAuthApiKeyRefResolver({ homeDir });
      await expect(resolver("antigravity")).resolves.toBe("refreshed-token");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
