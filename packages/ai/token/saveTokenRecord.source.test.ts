import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "saveTokenRecord.ts"), "utf-8");

describe("saveTokenRecord source contract", () => {
  it("uses the cross-platform toast helper for RN compatibility", () => {
    expect(source).toContain('import { toast } from "app/utils/toast";');
    expect(source).not.toContain("react-hot-toast");
  });

  it("uses a per-call key when stable provider-call evidence is available", () => {
    expect(source).toContain("createTokenKey.recordForStableCall(ownerUserId, callId)");
  });
});
