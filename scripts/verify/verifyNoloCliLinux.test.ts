import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = process.cwd();
const SCRIPT_PATH = join(REPO_ROOT, "scripts/verify/verifyNoloCliLinux.ts");

describe("verifyNoloCliLinux", () => {
  it("exists and is executable", () => {
    expect(existsSync(SCRIPT_PATH)).toBe(true);
    const source = readFileSync(SCRIPT_PATH, "utf8");
    // The shebang tells the runtime to use Bun, so the file must contain
    // `#!/usr/bin/env bun` on the first line.
    expect(source.startsWith("#!/usr/bin/env bun")).toBe(true);
  });

  it("refuses to run on non-Linux hosts", () => {
    const source = readFileSync(SCRIPT_PATH, "utf8");
    expect(source).toContain('process.platform !== "linux"');
  });

  it("checks the shebang of the bundled entrypoint", () => {
    const source = readFileSync(SCRIPT_PATH, "utf8");
    expect(source).toContain('"#!/usr/bin/env node"');
  });

  it("asserts the bundle advertises linux-x64 as a supported platform", () => {
    const source = readFileSync(SCRIPT_PATH, "utf8");
    expect(source).toContain('"linux-x64"');
  });

  it("runs --version and doctor on the bundle", () => {
    const source = readFileSync(SCRIPT_PATH, "utf8");
    expect(source).toContain('"--version"');
    expect(source).toContain('"doctor"');
    expect(source).toContain("Nolo CLI doctor");
  });
});
