import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";

const source = readFileSync(join(import.meta.dir, "src/bun/index.ts"), "utf8");

describe("desktop packaged cwd resolution", () => {
  it("defaults packaged installs to the user home dir instead of the install dir", () => {
    // Regression: packaged builds used to `process.chdir(EXECUTABLE_DIR)`, so
    // the embedded server and every execShell call inherited the Windows
    // install dir (`...\Nolo Desktop\bin\`) as cwd and relative paths broke.
    expect(source).toContain("process.chdir(homedir())");
    expect(source).not.toContain("process.chdir(EXECUTABLE_DIR)");
    // The home-dir chdir must stay inside the packaged branch (version.json).
    const packagedMarker = source.indexOf('join(PACKAGED_RESOURCES_DIR, "version.json")');
    const chdirHome = source.indexOf("process.chdir(homedir())");
    expect(packagedMarker).toBeGreaterThan(-1);
    expect(chdirHome).toBeGreaterThan(packagedMarker);
  });

  it("keeps NOLO_DESKTOP_CWD as the highest-priority override", () => {
    const override = source.indexOf("process.chdir(desktopCwdOverride)");
    const chdirHome = source.indexOf("process.chdir(homedir())");
    expect(override).toBeGreaterThan(-1);
    expect(override).toBeLessThan(chdirHome);
  });
});
