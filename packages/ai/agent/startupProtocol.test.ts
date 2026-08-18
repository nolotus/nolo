import { describe, expect, it } from "bun:test";
import { buildStartupProtocolBlock } from "./startupProtocol";

describe("startupProtocol", () => {
  it("defines the startup order around policy, mission, and recent memory", () => {
    const block = buildStartupProtocolBlock();

    expect(block).toContain("--- 启动协议 ---");
    expect(block).toContain("1. 先读取 policy / knowledge");
    expect(block).toContain("2. 再提炼 current mission");
    expect(block).toContain("3. 再吸收 recent memory");
    expect(block).toContain("current_goal");
    expect(block).toContain("constraints");
    expect(block).toContain("missing_facts");
    expect(block).toContain("next_action");
  });

  it("adds environment verification guidance when shell tools are available", () => {
    const block = buildStartupProtocolBlock({
      hasCheckEnvTool: true,
      hasExecShellTool: true,
    });

    expect(block).toContain("checkEnv({ check: 'context' })");
    expect(block).toContain("Windows 默认 PowerShell");
    expect(block).toContain("Linux/macOS 默认 bash");
  });
});
