import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "ShareImportPage.tsx"), "utf8");

describe("ShareImportPage live table redirect source contract", () => {
  it("reads originServer from live table share payload", () => {
    expect(source).toContain('from "share/shareReadResolver"');
    expect(source).toContain("normalizeShareReadServerOrigin(");
    expect(source).toContain("shared.type !== DataType.TABLE");
    expect(source).toContain("(shared.data as unknown as Record<string, unknown> | undefined)?.originServer ??");
    expect(source).toContain("(shared.meta as unknown as Record<string, unknown> | undefined)?.originServer");
  });

  it("keeps non-origin live table shares on the current page so replicas can render previews", () => {
    expect(source).not.toContain("window.location.assign(`${originServer}/share/${token}`)");
    expect(source).toContain("const tableServers = buildShareReadServerCandidates(");
  });

  it("prefers the current local runtime when opening share details client-side", () => {
    expect(source).toContain("preferredServerOrigin: localRuntimeOrigin ?? currentServer");
    expect(source).toContain("const remoteFirst = await tryReadFromFallbackServers");
    expect(source).toContain("fetchSharedRecordFromServers");
  });
});
