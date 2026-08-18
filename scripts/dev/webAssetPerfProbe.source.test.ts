import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "webAssetPerfProbe.cjs"), "utf8");

describe("webAssetPerfProbe source contract", () => {
  it("records browser network protocol evidence for navigation and resources", () => {
    expect(source).toContain("nextHopProtocol: entry.nextHopProtocol || \"\"");
    expect(source).toContain("const resourceTimings = await page.evaluate");
    expect(source).toContain("record.nextHopProtocol = timing?.nextHopProtocol || \"\"");
    expect(source).toContain("record.encodedBodySize = timing?.encodedBodySize || 0");
    expect(source).toContain("record.decodedBodySize = timing?.decodedBodySize || 0");
  });

  it("summarizes observed protocols for release comparisons", () => {
    expect(source).toContain("protocols: []");
    expect(source).toContain("bucket.protocols.push(record.nextHopProtocol)");
    expect(source).toContain("protocols: [...new Set(resources.flatMap");
  });
});
