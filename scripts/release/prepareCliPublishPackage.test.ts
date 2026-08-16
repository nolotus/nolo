import { describe, expect, it } from "bun:test";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { prepareCliPublishPackage } from "./prepareCliPublishPackage";

describe("prepareCliPublishPackage", () => {
  it("keeps the source cli manifest aligned with staged runtime files", () => {
    const sourcePkg = JSON.parse(
      readFileSync(join(process.cwd(), "packages/cli/package.json"), "utf8")
    );

    expect(sourcePkg.files).toContain("client/**/*.ts");
    expect(sourcePkg.files).toContain("connectorRunArtifact.ts");
    expect(sourcePkg.files).toContain("tui/**/*.ts");
    expect(sourcePkg.files).toContain("ai/**/*.ts");
    expect(sourcePkg.files).toContain("connector-experimental/**/*.ts");
  });

  it("creates a publish-safe package without workspace deps", async () => {
    const outDir = join(process.cwd(), ".tmp", "nolo-cli-test-stage");
    const databasePkg = JSON.parse(
      readFileSync(join(process.cwd(), "packages/database/package.json"), "utf8")
    );

    rmSync(outDir, { recursive: true, force: true });

    await prepareCliPublishPackage({
      repoRoot: process.cwd(),
      outDir,
      version: "0.1.12",
    });

    const pkg = JSON.parse(readFileSync(join(outDir, "package.json"), "utf8"));
    expect(JSON.stringify(pkg)).not.toContain("workspace:*");
    expect(pkg.dependencies.level).toBe(databasePkg.dependencies.level);
    expect(pkg.files).toEqual(["*.js", "README.md"]);
    expect(pkg.bin).toEqual({ nolo: "index.js" });
    expect(pkg.module).toBe("index.js");
    expect(pkg.devDependencies).toBeUndefined();
    expect(pkg.peerDependencies).toBeUndefined();

    rmSync(outDir, { recursive: true, force: true });
  });

  it("rewrites staged runtime imports so CLI runtime modules load", async () => {
    const outDir = join(process.cwd(), ".tmp", "nolo-cli-runtime-stage");
    rmSync(outDir, { recursive: true, force: true });

    await prepareCliPublishPackage({
      repoRoot: process.cwd(),
      outDir,
      version: "0.1.12",
    });

    await expect(
      import(pathToFileURL(join(outDir, "machineCommands.ts")).href)
    ).resolves.toBeDefined();
    await expect(
      import(pathToFileURL(join(outDir, "agentRuntimeCommands.ts")).href)
    ).resolves.toBeDefined();

    rmSync(outDir, { recursive: true, force: true });
  });
});
