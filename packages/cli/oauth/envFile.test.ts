import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { parseFlagWithOptionalValue, upsertEnvVariable } from "./envFile";

describe("envFile upsertEnvVariable", () => {
  const testDir = join(tmpdir(), `nolo-env-test-${Date.now()}`);
  const testFile = join(testDir, ".env");

  beforeEach(() => {
    const { mkdirSync } = require("node:fs");
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (existsSync(testFile)) {
      unlinkSync(testFile);
    }
  });

  it("creates an env file when it does not exist", () => {
    upsertEnvVariable(testFile, "CLOUDFLARE_EMAIL_ROUTING_API_TOKEN", "token-123");
    const content = readFileSync(testFile, "utf8");
    expect(content).toBe("CLOUDFLARE_EMAIL_ROUTING_API_TOKEN=token-123");
  });

  it("replaces an existing variable", () => {
    writeFileSync(testFile, "CLOUDFLARE_EMAIL_ROUTING_API_TOKEN=old-token\n", "utf8");
    upsertEnvVariable(testFile, "CLOUDFLARE_EMAIL_ROUTING_API_TOKEN", "new-token");
    const content = readFileSync(testFile, "utf8");
    expect(content).toBe("CLOUDFLARE_EMAIL_ROUTING_API_TOKEN=new-token\n");
  });

  it("preserves comments and other variables", () => {
    writeFileSync(
      testFile,
      "# Cloudflare config\nOTHER_KEY=value\nCLOUDFLARE_EMAIL_ROUTING_API_TOKEN=old\n",
      "utf8"
    );
    upsertEnvVariable(testFile, "CLOUDFLARE_EMAIL_ROUTING_API_TOKEN", "new");
    const content = readFileSync(testFile, "utf8");
    expect(content).toBe(
      "# Cloudflare config\nOTHER_KEY=value\nCLOUDFLARE_EMAIL_ROUTING_API_TOKEN=new\n"
    );
  });

  it("appends the variable when missing", () => {
    writeFileSync(testFile, "OTHER_KEY=value\n", "utf8");
    upsertEnvVariable(testFile, "CLOUDFLARE_EMAIL_ROUTING_API_TOKEN", "token");
    const content = readFileSync(testFile, "utf8");
    expect(content).toBe(
      "OTHER_KEY=value\n\nCLOUDFLARE_EMAIL_ROUTING_API_TOKEN=token"
    );
  });
});

describe("envFile parseFlagWithOptionalValue", () => {
  it("returns undefined when flag is absent", () => {
    expect(parseFlagWithOptionalValue(["--other"], "--write-to-env")).toBeUndefined();
  });

  it("returns the next value when present", () => {
    expect(parseFlagWithOptionalValue(["--write-to-env", "config.env"], "--write-to-env")).toBe(
      "config.env"
    );
  });

  it("returns true when flag has no value", () => {
    expect(parseFlagWithOptionalValue(["--write-to-env", "--next"], "--write-to-env")).toBe(true);
  });

  it("returns true when flag is the last argument", () => {
    expect(parseFlagWithOptionalValue(["--write-to-env"], "--write-to-env")).toBe(true);
  });
});
