import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Use import.meta.dir for file-relative path resolution
const root = import.meta.dir;
const workflowPath = join(root, "../../.github/workflows/cli-npm-publish.yml");
const ciScriptPath = join(root, "../ci/runCliPublishCi.sh");
const scriptPath = join(root, "prepareCliPublishPackage.ts");
const buildPublishPath = join(root, "../../packages/cli/buildPublish.ts");

describe("prepareCliPublishPackage source contract", () => {
  it("contains required workflow contract strings", () => {
    const workflow = readFileSync(workflowPath, "utf8");
    const ciScript = readFileSync(ciScriptPath, "utf8");

    expect(workflow).toContain("bash ./scripts/ci/runCliPublishCi.sh");
    expect(ciScript).toContain("prepareCliPublishPackage.ts");
    expect(ciScript).toContain("./scripts/release/prepareCliPublishPackage.ts --out-dir \"$OUT_DIR\"");
    expect(ciScript).toContain("npm pack");
    expect(ciScript).toContain("prepare-staged-package");
    
    // Task 3: Verify workflow publishes from staged directory
    expect(workflow).toContain("NOLO_CLI_PUBLISH_NPM_PREFIX");
    expect(ciScript).toContain("NPM_CONFIG_PREFIX=\"$NPM_PREFIX\"");
    expect(ciScript).toContain('"$NPM_BIN" install -g "$tarball"');
    expect(ciScript).toContain('"$NPM_PREFIX/bin/nolo" --version');
    expect(ciScript).toContain('cd "$OUT_DIR"');
  });

  it("contains required script contract strings", () => {
    const source = readFileSync(scriptPath, "utf8");
    const buildPublishSource = readFileSync(buildPublishPath, "utf8");

    expect(source).toContain("buildPublishArtifact");
    expect(source).toContain("packages/cli");
    expect(buildPublishSource).toContain("inlineWorkspaceDependencies");
    expect(buildPublishSource).toContain("publishManifest.files");
  });
});
