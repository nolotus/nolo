import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("prepareCliOpenSourceMirror source contract", () => {
  test("builds a source mirror tree and applies public repo metadata", () => {
    const mirrorScript = readFileSync(
      join(import.meta.dir, "prepareCliOpenSourceMirror.ts"),
      "utf8"
    );
    const mirrorCi = readFileSync(
      join(import.meta.dir, "../ci/runCliMirrorOpenSource.sh"),
      "utf8"
    );

    expect(mirrorScript).toContain("buildPublishArtifact");
    expect(mirrorScript).toContain("applyOpenSourcePackageOverlay");
    expect(mirrorCi).toContain("prepareCliOpenSourceMirror.ts");
    expect(mirrorCi).toContain("nolotus/nolo-cli");
    expect(mirrorCi).toContain("README.md");
    expect(mirrorCi).toContain(".github/workflows/test.yml");
    expect(mirrorCi).not.toContain("npm-publish.yml");
  });
});