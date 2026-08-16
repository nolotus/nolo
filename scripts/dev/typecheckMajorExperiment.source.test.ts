import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = readFileSync(join(import.meta.dir, "typecheckMajorExperiment.ts"), "utf8");

describe("typecheckMajorExperiment source contract", () => {
  it("resolves majors via bunx without replacing default typescript", () => {
    expect(src).toContain('bunx", "-p"');
    expect(src).toContain("typescript@6");
    expect(src).toContain("typescript@7");
    expect(src).toContain("--compare");
    expect(src).toContain("--noEmit");
  });

  it("prints wall time and error counts for repeatable comparison", () => {
    expect(src).toContain("performance.now");
    expect(src).toContain("errorCount");
    expect(src).toContain("realSec");
  });
});
