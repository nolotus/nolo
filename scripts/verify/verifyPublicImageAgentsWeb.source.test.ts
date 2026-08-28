import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const scriptPath = join(import.meta.dir, "verifyPublicImageAgentsWeb.ts");
const packagePath = join(import.meta.dir, "..", "..", "package.json");
const readmePath = join(import.meta.dir, "..", "README.md");

const scriptExists = existsSync(scriptPath);
const scriptSource = scriptExists ? readFileSync(scriptPath, "utf8") : "";
const packageSource = readFileSync(packagePath, "utf8");
const readmeSource = readFileSync(readmePath, "utf8");

function readEmbeddedPngDimensions(constantName: string) {
  const match = scriptSource.match(
    new RegExp(
      String.raw`const ${constantName} = Buffer\.from\(\s*"([^"]+)"\s*,\s*"base64"\s*\)`,
      "m"
    )
  );
  expect(match).toBeTruthy();
  const bytes = Buffer.from(match![1], "base64");
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  return {
    byteLength: bytes.length,
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

describe("verifyPublicImageAgentsWeb source contract", () => {
  it("adds the repo-native public image web verifier entrypoints", () => {
    expect(scriptExists).toBe(true);
    expect(packageSource).toContain('"verify:public-image-agents:web"');
    expect(packageSource).toContain("bun ./scripts/verify/verifyPublicImageAgentsWeb.ts");
    expect(readmeSource).toContain("verify:public-image-agents:web");
    expect(readmeSource).toContain("verifyPublicImageAgentsWeb.ts");
  });

  it("reuses existing auth/bootstrap/browser helpers instead of inventing a new browser stack", () => {
    expect(scriptSource).toContain('from "../helpers/playwrightAuth"');
    expect(scriptSource).toContain("buildPlaywrightAuthBootstrap");
    expect(scriptSource).toContain("installPlaywrightAuthBootstrap");
    expect(scriptSource).toContain('from "../probes/helpers/playwrightLaunch"');
    expect(scriptSource).toContain("launchBrowserProbe");
    expect(scriptSource).toContain("probeHeadless");
    expect(scriptSource).toContain("resolveAuthToken");
  });

  it("discovers the three public image agents from shared-space truth while supporting explicit overrides", () => {
    expect(scriptSource).toContain("PUBLIC_IMAGE_AGENT_DEFAULT_SPACE_ID");
    expect(scriptSource).toContain("PUBLIC_IMAGE_AGENT_SPACE_ID");
    expect(scriptSource).toContain("readSpaceRecord");
    expect(scriptSource).toContain("readAgentRecord");
    expect(scriptSource).toContain("GPT Image 2 图片生成器");
    expect(scriptSource).toContain("GPT Image 2 图片编辑器");
    expect(scriptSource).toContain("GPT Image 2 连续创作助手");
    expect(scriptSource).toContain("PUBLIC_IMAGE_GENERATOR_AGENT_KEY");
    expect(scriptSource).toContain("PUBLIC_IMAGE_EDITOR_AGENT_KEY");
    expect(scriptSource).toContain("PUBLIC_IMAGE_CONTINUOUS_AGENT_KEY");
  });

  it("drives the real web chat flows for generation, editing, and continuous revision", () => {
    expect(scriptSource).toContain(".message-input__textarea");
    expect(scriptSource).toContain('input[type="file"]');
    expect(scriptSource).toContain("/rpc/getConvMsgs");
    expect(scriptSource).toContain(".g-img-card");
    expect(scriptSource).toContain("clickStartChatUntilDialog");
    expect(scriptSource).toContain("generator-text-to-image");
    expect(scriptSource).toContain("editor-single-image-edit");
    expect(scriptSource).toContain("editor-multi-image-edit");
    expect(scriptSource).toContain("editor-mask-validation");
    expect(scriptSource).toContain("continuous-generate");
    expect(scriptSource).toContain("continuous-revise-1");
    expect(scriptSource).toContain("continuous-revise-2");
  });

  it("explicitly verifies continuous carry-forward against the latest generated artifact keys", () => {
    expect(scriptSource).toContain("assertCarryForwardForScenario");
    expect(scriptSource).toContain("reusedLatestArtifactKeys");
    expect(scriptSource).toContain("continuous-revise-1");
    expect(scriptSource).toContain("continuous-revise-2");
    expect(scriptSource).toContain("forbiddenArtifactKeys");
    expect(scriptSource).toContain("without older carry-forward leakage");
  });

  it("requires multi-image edit success while keeping the mask branch best-effort", () => {
    const multiStart = scriptSource.indexOf('scenario: "editor-multi-image-edit"');
    expect(multiStart).toBeGreaterThan(-1);
    expect(scriptSource.slice(multiStart, multiStart + 220)).not.toContain("bestEffort");
    const maskStart = scriptSource.indexOf('scenario: "editor-mask-validation"');
    expect(maskStart).toBeGreaterThan(-1);
    expect(scriptSource.slice(maskStart, maskStart + 220)).toContain("bestEffort: true");
    expect(scriptSource).toContain("validation/error");
    expect(scriptSource).toContain("mask");
    expect(scriptSource).toContain("silent failure");
  });

  it("does not accept generic mask/upload guidance as a validation signal", () => {
    const match = scriptSource.match(/const VALIDATION_SIGNAL = (\/.*\/[a-z]*);/);
    expect(match).toBeTruthy();
    expect(match![1]).toContain("validation");
    expect(match![1]).toContain("error");
    expect(match![1]).not.toContain("mask");
    expect(match![1]).not.toContain("蒙版");
    expect(match![1]).not.toContain("上传");
  });

  it("fails fast on upstream provider errors instead of waiting for timeout", () => {
    expect(scriptSource).toContain("UPSTREAM_ERROR_SIGNAL");
    expect(scriptSource).toContain("pickUpstreamErrorSignal");
    expect(scriptSource).toContain("upstream image provider error");
    expect(scriptSource).toContain("quota");
    expect(scriptSource).toContain("billing");
    expect(scriptSource).toContain("invalid_image_file");
    expect(scriptSource).toContain("organization must be verified");
    expect(scriptSource).toContain("bad gateway");
    expect(scriptSource).toContain("OPENAI_IMAGE_FAILED");
    expect(scriptSource).toContain("ToolApiError");
    expect(scriptSource).toContain("执行失败");
  });

  it("supports targeted scenario reruns and includes dialog URLs in failures", () => {
    expect(scriptSource).toContain("PUBLIC_IMAGE_AGENT_SCENARIOS");
    expect(scriptSource).toContain("PUBLIC_IMAGE_AGENT_CASES");
    expect(scriptSource).toContain("PUBLIC_IMAGE_CONTINUOUS_DIALOG_URL");
    expect(scriptSource).toContain("shouldRunScenario");
    expect(scriptSource).toContain("shouldRunCase");
    expect(scriptSource).toContain("editor-single");
    expect(scriptSource).toContain("editor-multi");
    expect(scriptSource).toContain("editor-mask");
    expect(scriptSource).toContain("continuous-generate");
    expect(scriptSource).toContain("continuous-revise-1");
    expect(scriptSource).toContain("continuous-revise-2");
    expect(scriptSource).toContain("openExistingDialog");
    expect(scriptSource).toContain("runContinuousReviseStep");
    expect(scriptSource).toContain("dialogUrl");
    expect(scriptSource).toContain("Dialog:");
    expect(scriptSource).toContain("${BASE_URL}/${args.dialogKey}");
  });

  it("uses non-tiny embedded PNG fixtures for editor and continuous image inputs", () => {
    for (const constantName of ["PNG_RED", "PNG_GREEN", "PNG_BLACK", "PNG_MASK"]) {
      const dimensions = readEmbeddedPngDimensions(constantName);
      const minimumEdge =
        constantName === "PNG_RED" || constantName === "PNG_GREEN" ? 128 : 32;
      expect(dimensions.width).toBeGreaterThanOrEqual(minimumEdge);
      expect(dimensions.height).toBeGreaterThanOrEqual(minimumEdge);
    }
    expect(readEmbeddedPngDimensions("PNG_RED").byteLength).toBeGreaterThanOrEqual(500);
    expect(readEmbeddedPngDimensions("PNG_GREEN").byteLength).toBeGreaterThanOrEqual(500);
  });
});
