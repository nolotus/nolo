import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const webSource = readFileSync(
  join(import.meta.dir, "..", "fetchUtils.ts"),
  "utf-8"
);
const nativeSource = readFileSync(
  join(import.meta.dir, "..", "fetchUtils.native.ts"),
  "utf-8"
);
const resolveSource = readFileSync(
  join(import.meta.dir, "..", "resolveDirectRequestApiKey.ts"),
  "utf-8"
);

describe("fetchUtils source contract", () => {
  it("routes web and native server-proxy retries through the shared helper", () => {
    for (const source of [webSource, nativeSource]) {
      expect(source).toContain('import { performServerProxyFetchWithRetry } from "./serverProxyRetry"');
      expect(source).toContain("performServerProxyFetchWithRetry({");
      expect(source).not.toContain('if (response.status === 503)');
      expect(source).not.toContain("检测到503状态，重试一次");
    }
  });

  it("resolves direct-path API keys via shared helper + provider auth headers", () => {
    for (const source of [webSource, nativeSource]) {
      expect(source).toContain(
        'import { resolveDirectRequestApiKey } from "./resolveDirectRequestApiKey"',
      );
      expect(source).toContain("buildProviderAuthHeaders");
      expect(source).toContain("resolveDirectRequestApiKey(agentConfig");
      // Proxy KEY must stay raw-only — never broker hydrate.
      expect(source).toContain(
        "Server-proxy KEY: only transient/raw apiKey. Never hydrate from local broker.",
      );
      expect(source).toContain(
        'import { asOptionalTrimmedString } from "core/optionalString"',
      );
      expect(source).toMatch(
        /const apiKey = asOptionalTrimmedString\(agentConfig\.apiKey\);[\s\S]*?KEY: apiKey/,
      );
    }
  });

  it("shared helper uses bare createFileCredentialBroker import (platform resolution)", () => {
    expect(resolveSource).toContain(
      'from "../../agent-runtime/fileCredentialBroker"',
    );
    expect(resolveSource).toContain("createFileCredentialBroker");
    expect(resolveSource).toContain("safeBrokerGet(broker, credentialRef)");
  });
});
