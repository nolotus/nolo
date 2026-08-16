import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const fileContentActionSource = readFileSync(
  new URL("./fileContent.ts", import.meta.url),
  "utf8"
);

describe("readFileContentAction source contract", () => {
  it("uses shared server planning for remote fallback", () => {
    expect(fileContentActionSource).toContain('import { getRuntimeServerContext } from "database/runtimeServerContext"');
    expect(fileContentActionSource).toContain("getRuntimeServerContext(state)");
    expect(fileContentActionSource).not.toContain("...syncServers.filter((s) => s !== currentServer)");
  });
});
