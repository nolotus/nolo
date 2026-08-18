import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("desktop pre-build source contract", () => {
  test("uses the current web build script path", () => {
    const scriptSource = readFileSync(
      join(import.meta.dir, "scripts", "pre-build.ts"),
      "utf8",
    );
    const packageJson = readFileSync(
      join(import.meta.dir, "package.json"),
      "utf8",
    );

    expect(scriptSource).toContain("./scripts/dev/esBuild.js");
    expect(packageJson).toContain("./scripts/dev/esBuild.js");
    expect(scriptSource).not.toContain("./scripts/esBuild.js");
    expect(packageJson).not.toContain("./scripts/esBuild.js");
  });
});
