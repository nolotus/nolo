import { describe, expect, it } from "bun:test";
import {
  buildRuntimeGuidanceBlocks,
  resolveRuntimeGuidanceToolOptions,
} from "./runtimeGuidance";

describe("runtimeGuidance", () => {
  it("derives startup and context capabilities from canonical tool names", () => {
    const options = resolveRuntimeGuidanceToolOptions([
      "execShell",
      "rememberMemory",
      "readPage",
    ]);

    expect(options).toEqual({
      hasCheckEnvTool: false,
      hasExecShellTool: true,
      hasRememberMemoryTool: true,
      hasDocTools: true,
      hasBrowserTools: false,
      hasEmailRegistrationTools: false,
      hasEmailRegistrationWorkflow: false,
    });
  });

  it("enables email registration workflow guidance only with browser and email tools", () => {
    expect(
      resolveRuntimeGuidanceToolOptions([
        "browserOpenSession",
        "browser_probePage",
        "browserTypeText",
        "browserClick",
        "browserReadContent",
        "browserCloseSession",
        "email_provision_identity",
        "email_wait_for",
        "email_extract_verification",
      ]).hasEmailRegistrationWorkflow
    ).toBe(true);

    expect(
      resolveRuntimeGuidanceToolOptions([
        "browserOpenSession",
        "browserTypeText",
        "browserClick",
        "browserReadContent",
      ]).hasEmailRegistrationWorkflow
    ).toBe(false);

    expect(
      resolveRuntimeGuidanceToolOptions([
        "browserOpenSession",
        "browserTypeText",
        "browserClick",
        "email_provision_identity",
        "email_wait_for",
        "email_extract_verification",
      ]).hasEmailRegistrationWorkflow
    ).toBe(false);

    expect(
      resolveRuntimeGuidanceToolOptions([
        "email_provision_identity",
        "email_wait_for",
        "email_extract_verification",
      ]).hasEmailRegistrationWorkflow
    ).toBe(false);
  });

  it("builds both runtime guidance blocks from the shared tool resolution", () => {
    const blocks = buildRuntimeGuidanceBlocks([
      "checkEnv",
      "execShell",
      "rememberMemory",
      "createDoc",
    ]);

    expect(blocks.startupProtocol).toContain("checkEnv({ check: 'context' })");
    expect(blocks.contextLayerContract).toContain("rememberMemory");
    expect(blocks.contextLayerContract).toContain(
      "mission / runbook / incident / checkpoint / idea backlog / experiment log"
    );
  });

  it("no longer emits web research policy from runtime guidance (moved to toolGuidedSections.webAccess)", () => {
    const blocks = buildRuntimeGuidanceBlocks(["execShell", "fetchWebpage"]);
    expect("webResearchToolPolicy" in blocks).toBe(false);
  });

  it("builds safe website registration guidance for browser plus email agents", () => {
    const blocks = buildRuntimeGuidanceBlocks([
      "browserOpenSession",
      "browser_probePage",
      "browserTypeText",
      "browserClick",
      "browserReadContent",
      "browserCloseSession",
      "email_provision_identity",
      "email_wait_for",
      "email_extract_verification",
    ]);

    expect(blocks.emailRegistrationWorkflow).toContain("--- 邮箱验证码注册流程 ---");
    expect(blocks.emailRegistrationWorkflow).toContain("用户明确指定");
    expect(blocks.emailRegistrationWorkflow).toContain("email_provision_identity");
    expect(blocks.emailRegistrationWorkflow).toContain("email_wait_for");
    expect(blocks.emailRegistrationWorkflow).toContain("email_extract_verification");
    expect(blocks.emailRegistrationWorkflow).toContain("不要持久化密码");
    expect(blocks.emailRegistrationWorkflow).toContain("CAPTCHA");
    expect(blocks.emailRegistrationWorkflow).toContain("手机号");
    expect(blocks.emailRegistrationWorkflow).toContain("支付");
    expect(blocks.emailRegistrationWorkflow).toContain("身份/KYC");
    expect(blocks.emailRegistrationWorkflow).toContain("OAuth");
    expect(blocks.emailRegistrationWorkflow).toContain("服务条款");
  });

  it("builds staged external registration guidance when browser and email tools are present", () => {
    const blocks = buildRuntimeGuidanceBlocks([
      "browserOpenSession",
      "browser_probePage",
      "browserTypeText",
      "browserClick",
      "browserReadContent",
      "browserCloseSession",
      "email_provision_identity",
      "email_wait_for",
      "email_extract_verification",
    ]);

    expect(blocks.emailRegistrationWorkflow).toContain("discover before acting");
    expect(blocks.emailRegistrationWorkflow).toContain("assess supportability");
    expect(blocks.emailRegistrationWorkflow).toContain("always close sessions");
    expect(blocks.emailRegistrationWorkflow).toContain("CAPTCHA");
    expect(blocks.emailRegistrationWorkflow).toContain("OAuth");
    expect(blocks.emailRegistrationWorkflow).toContain("failedStage");
    expect(blocks.emailRegistrationWorkflow).toContain("blockingReason");
    expect(blocks.emailRegistrationWorkflow).toContain("browser_closeSession");
  });
});
