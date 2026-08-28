import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  NOLO_CLI_VERSION,
  getCliInstallCommand,
  getCliInstallTag,
  getCurlCliInstallCommand,
} from "./cliDownloads";

describe("cliDownloads", () => {
  it("keeps the displayed CLI version aligned with packages/cli/package.json", () => {
    const packageJsonPath = join(import.meta.dir, "../../cli/package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      version?: string;
    };

    expect(packageJson.version).toBe(NOLO_CLI_VERSION);
  });

  it("returns the stable npm install command by default", () => {
    expect(getCliInstallCommand()).toBe("npm install -g nolo-cli");
    expect(getCliInstallTag()).toBe("latest");
  });

  it("switches the CLI install command to the alpha dist-tag on alpha", () => {
    expect(getCliInstallCommand("https://us.nolo.chat/")).toBe(
      "npm install -g nolo-cli@alpha",
    );
    expect(getCliInstallTag("https://us.nolo.chat")).toBe("alpha");
  });

  it("returns the curl installer on stable and alpha", () => {
    expect(getCurlCliInstallCommand()).toBe(
      "curl -fsSL https://nolo.chat/install-nolo.sh | sh",
    );
    expect(getCurlCliInstallCommand("https://us.nolo.chat/")).toBe(
      "curl -fsSL https://us.nolo.chat/install-nolo.sh | sh",
    );
  });
});