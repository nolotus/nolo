import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const pkg = JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "package.json"), "utf8"));

describe("build and typecheck package scripts", () => {
  it("separates fast production builds from release precompression", () => {
    expect(pkg.scripts.build).toBe("bun ./scripts/dev/esBuild.js");
    expect(pkg.scripts["build:production"]).toBe("NODE_ENV=production bun ./scripts/dev/esBuild.js");
    expect(pkg.scripts["build:release"]).toBe(
      "NODE_ENV=production NOLO_WEB_PRECOMPRESS=1 bun ./scripts/dev/esBuild.js"
    );
  });

  it("provides explicit typecheck scopes", () => {
    expect(pkg.scripts["typecheck:build-tools"]).toBe("tsc -p tsconfig.typecheck.build-tools.json --pretty false");
    expect(pkg.scripts["typecheck:scripts-dev"]).toBe("tsc -p tsconfig.typecheck.scripts-dev.json --pretty false");
    expect(pkg.scripts["typecheck:full"]).toBe("tsc --noEmit --pretty false");
  });

  it("provides green per-package typecheck gates", () => {
    expect(pkg.scripts["typecheck:core"]).toBe("tsc -p tsconfig.typecheck.core.json --pretty false");
    expect(pkg.scripts["typecheck:llama-runtime"]).toBe("tsc -p tsconfig.typecheck.llama-runtime.json --pretty false");
    expect(pkg.scripts["typecheck:agent-runtime"]).toBe("tsc -p tsconfig.typecheck.agent-runtime.json --pretty false");
    expect(pkg.scripts["typecheck:lab"]).toBe("tsc -p tsconfig.typecheck.lab.json --pretty false");
    expect(pkg.scripts["typecheck:ai"]).toBe("tsc -p tsconfig.typecheck.ai.json --pretty false");
  });

  it("runs all green tooling and package gates via the parallel typecheckGreen runner", () => {
    expect(pkg.scripts["typecheck:green"]).toBe(
      "bun ./scripts/dev/typecheckGreen.ts"
    );
  });

  it("exposes workspace:link to materialize worktree package symlinks", () => {
    expect(pkg.scripts["workspace:link"]).toBe(
      "bun ./scripts/dev/workspaceLinkGuard.ts --ensure",
    );
  });

  it("keeps TypeScript major-version experiments opt-in", () => {
    expect(pkg.scripts["typecheck:ts6:full"]).toContain("typecheckMajorExperiment.ts");
    expect(pkg.scripts["typecheck:ts6:full"]).toContain("typescript@6");
    expect(pkg.scripts["typecheck:ts7:full"]).toContain("typecheckMajorExperiment.ts");
    expect(pkg.scripts["typecheck:ts7:full"]).toContain("typescript@7");
    expect(pkg.scripts["typecheck:compare-majors"]).toContain("typecheckMajorExperiment.ts");
    expect(pkg.scripts["typecheck:compare-majors"]).toContain("--compare");
  });
});

