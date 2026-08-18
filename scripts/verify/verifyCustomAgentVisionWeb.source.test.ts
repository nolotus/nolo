import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const scriptPath = join(import.meta.dir, "verifyCustomAgentVisionWeb.ts");
const packagePath = join(import.meta.dir, "..", "..", "package.json");
const readmePath = join(import.meta.dir, "..", "README.md");

const scriptExists = existsSync(scriptPath);
const scriptSource = scriptExists ? readFileSync(scriptPath, "utf8") : "";
const packageSource = readFileSync(packagePath, "utf8");
const readmeSource = readFileSync(readmePath, "utf8");

describe("verifyCustomAgentVisionWeb source contract", () => {
  it("adds a deployment-gating custom agent vision verifier entrypoint", () => {
    expect(scriptExists).toBe(true);
    expect(packageSource).toContain('"verify:custom-agent-vision:web"');
    expect(packageSource).toContain("bun ./scripts/verify/verifyCustomAgentVisionWeb.ts");
    expect(readmeSource).toContain("verify:custom-agent-vision:web");
    expect(readmeSource).toContain("verifyCustomAgentVisionWeb.ts");
  });

  it("uses real browser upload and dialog persistence instead of a pure API shortcut", () => {
    expect(scriptSource).toContain('from "../helpers/playwrightAuth"');
    expect(scriptSource).toContain("buildPlaywrightAuthBootstrap");
    expect(scriptSource).toContain("installPlaywrightAuthBootstrap");
    expect(scriptSource).toContain('from "../probes/helpers/playwrightLaunch"');
    expect(scriptSource).toContain("launchBrowserProbe");
    expect(scriptSource).toContain('input[type="file"]');
    expect(scriptSource).toContain(".message-input__textarea");
    expect(scriptSource).toContain("/rpc/getConvMsgs");
  });

  it("targets the Mimo custom agent by default while supporting explicit overrides", () => {
    expect(scriptSource).toContain("CUSTOM_VISION_DEFAULT_SPACE_ID");
    expect(scriptSource).toContain("CUSTOM_VISION_SPACE_ID");
    expect(scriptSource).toContain("DEFAULT_CUSTOM_VISION_AGENT_KEY");
    expect(scriptSource).toContain("fullstack");
    expect(scriptSource).toContain("CUSTOM_VISION_AGENT_KEY");
    expect(scriptSource).toContain("CUSTOM_VISION_EXISTING_DIALOG");
  });

  it("requires the assistant reply to identify the uploaded image content", () => {
    expect(scriptSource).toContain("buildVisionFixturePng");
    expect(scriptSource).toContain("red square");
    expect(scriptSource).toContain("红色方块");
    expect(scriptSource).toContain("assertVisionReply");
    expect(scriptSource).toContain("localVisionBlock");
  });

  it("guards against persisting inline image payloads after upload", () => {
    expect(scriptSource).toContain("hasDurableInlineImagePayload");
    expect(scriptSource).toContain("original_data_url");
    expect(scriptSource).toContain("google_native?.inlineData?.data");
    expect(scriptSource).toContain("persisted image message still contains inline image payload");
  });
});
