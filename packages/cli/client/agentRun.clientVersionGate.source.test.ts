import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NOLO_CLIENT_VERSION_HEADER } from "core/clientVersionGate";

describe("CLI agentRun client version header source contract", () => {
  const agentRunPath = join(import.meta.dir, "agentRun.ts");
  const agentRunSource = readFileSync(agentRunPath, "utf-8");

  it("imports NOLO_CLIENT_VERSION_HEADER and resolveClientVersion", () => {
    expect(agentRunSource).toContain('import { NOLO_CLIENT_VERSION_HEADER } from "core/clientVersionGate"');
    expect(agentRunSource).toContain("resolveClientVersion");
  });

  it("extracts client version from options.env and injects it into HTTP turn headers", () => {
    expect(agentRunSource).toContain("const clientVersionHeader = resolveClientVersion(options.env ?? {});");
    expect(agentRunSource).toContain("[NOLO_CLIENT_VERSION_HEADER]: clientVersionHeader");
  });

  it("matches the constant definition across core and CLI", () => {
    expect(NOLO_CLIENT_VERSION_HEADER).toBe("x-nolo-client-version");
  });
});
