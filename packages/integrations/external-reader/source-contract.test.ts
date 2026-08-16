import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "../../..");

function readSource(path: string) {
  return readFileSync(join(repoRoot, path), "utf8");
}

describe("external reader shared contract", () => {
  it("keeps provider state contracts in the shared integration package", () => {
    const typeSource = readSource("packages/integrations/external-reader/types.ts");
    const handlerSource = readSource("packages/server/handlers/externalReaderStateHandler.ts");

    expect(typeSource).toContain("ExternalReaderProviderDescriptor");
    expect(typeSource).toContain("ExternalReaderStateResponse");
    expect(typeSource).toContain("isValidExternalReaderAction");
    expect(handlerSource).toContain("ExternalReaderProviderDescriptor");
    expect(handlerSource).toContain("isValidExternalReaderAction(action)");
  });

  it("keeps desktop-first safety posture explicit", () => {
    const handlerSource = readSource("packages/server/handlers/externalReaderStateHandler.ts");
    const toolSource = readSource("packages/ai/tools/readXhsProfileTool.ts");

    expect(handlerSource).toContain("desktop_required");
    expect(handlerSource).toContain("NOLO_DESKTOP");
    expect(toolSource).not.toMatch(/stealth|anti[-_ ]?detect|fingerprint/i);
  });
});
