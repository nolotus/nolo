import { describe, expect, test } from "bun:test";
import {
  DEFAULT_AUTO_EXECUTION_PROFILE,
  resolveAutoExecutionProfile,
} from "./autoExecutionProfiles";
import { BUILTIN_NOLO_AGENT_KEY } from "core/builtinAgents";

describe("auto execution profiles", () => {
  test("uses a complete code-owned default profile", () => {
    expect(DEFAULT_AUTO_EXECUTION_PROFILE).toMatchObject({
      id: "builtin:auto:nolo",
      tier: "flash",
      provider: "nolo",
      model: "glm-5-3-flash",
      apiSource: "platform",
      useServerProxy: true,
    });
  });

  test("auto continuation answers as the same agent as the QuickChat first turn (nolo)", () => {
    // 回归锁：auto 对话续聊曾指向旧广场档 DeepSeek V4 Flash，与 QuickChat
    // 首条（默认档 = 内置 nolo 本体）分裂——同一对话消息头名字从 nolo 漂移成
    // DeepSeek V4 Flash Vision Exp。见 settings/quickChatTierDefaults.ts 同款历史。
    expect(DEFAULT_AUTO_EXECUTION_PROFILE.legacyAgentKey).toBe(
      BUILTIN_NOLO_AGENT_KEY,
    );
    expect(DEFAULT_AUTO_EXECUTION_PROFILE.legacyAgentKey).toBe(
      "agent-pub-01NOLOAPPBLD000000019KCKT0",
    );
  });

  test("shares the current flash runtime for balanced and quality", () => {
    expect(resolveAutoExecutionProfile("balanced").model).toBe("glm-5-3-flash");
    expect(resolveAutoExecutionProfile("quality").model).toBe("glm-5-3-flash");
  });

  test("maps image tier to flash (preprocessing pipeline handles images)", () => {
    const imageProfile = resolveAutoExecutionProfile("image");
    expect(imageProfile.tier).toBe("image");
    expect(imageProfile.model).toBe("glm-5-3-flash");
    expect(imageProfile.provider).toBe("nolo");
  });
});
