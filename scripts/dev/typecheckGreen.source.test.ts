import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GREEN_TYPECHECK_GATES } from "./typecheckGreen.ts";

const source = readFileSync(join(import.meta.dir, "typecheckGreen.ts"), "utf8");
const pkg = JSON.parse(
  readFileSync(join(import.meta.dir, "..", "..", "package.json"), "utf8")
);

describe("typecheckGreen parallel runner", () => {
  it("covers every historical green gate in stable order", () => {
    expect([...GREEN_TYPECHECK_GATES]).toEqual([
      "typecheck:build-tools",
      "typecheck:scripts-dev",
      "typecheck:core",
      "typecheck:server",
      "typecheck:llama-runtime",
      "typecheck:agent-runtime",
      "typecheck:lab",
      "typecheck:ai",
    ]);
  });

  it("is wired as the package.json typecheck:green entrypoint", () => {
    expect(pkg.scripts["typecheck:green"]).toBe(
      "bun ./scripts/dev/typecheckGreen.ts"
    );
  });

  it("runs gates concurrently and aggregates labeled failures", () => {
    expect(source).toContain("Promise.all");
    expect(source).toContain("typecheck:green summary");
    expect(source).toContain("failed:");
    expect(source).toContain("process.exit");
  });
});
