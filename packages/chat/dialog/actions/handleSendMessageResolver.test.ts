import { describe, expect, it } from "bun:test";
import { PERSONALIZATION_DIALOG_CATEGORY } from "ai/policy/personalizationDialog";
import { resolveHandleSendMessageContext } from "./handleSendMessageResolver";

describe("resolveHandleSendMessageContext", () => {
  it("prefers an explicit target agent over the dialog primary agent", () => {
    const result = resolveHandleSendMessageContext({
      dialogConfig: {
        dbKey: "dialog-1",
        cybots: ["agent-a"],
      } as any,
      targetAgentKey: "agent-b",
    });

    expect(result.agentKeyToUse).toBe("agent-b");
  });

  it("applies personalization runtime shaping only for personalization dialogs", () => {
    const result = resolveHandleSendMessageContext({
      dialogConfig: {
        dbKey: "dialog-1",
        cybots: ["agent-a"],
        category: PERSONALIZATION_DIALOG_CATEGORY,
      } as any,
      runtimeOptions: {
        toolNames: ["demo"],
      } as any,
    });

    expect(result.agentKeyToUse).toBe("agent-a");
    expect(result.effectiveRuntimeOptions as any).toEqual({
      toolNames: ["demo"],
      extraTools: ["ask_user", "updateUserPreferenceProfile"],
    });

    const nonPersonalization = resolveHandleSendMessageContext({
      dialogConfig: {
        dbKey: "dialog-2",
        cybots: ["agent-a"],
        category: "chat",
      } as any,
      runtimeOptions: {
        toolNames: ["demo"],
      } as any,
    });

    expect(nonPersonalization.effectiveRuntimeOptions as any).toEqual({
      toolNames: ["demo"],
    });
  });

  it("uses the shared code-owned fallback for an auto dialog", () => {
    const result = resolveHandleSendMessageContext({
      dialogConfig: {
        dbKey: "dialog-auto",
        agentMode: "auto",
        cybots: [],
      } as any,
    });

    expect(result.agentKeyToUse).toBe(
      "agent-pub-01NOLOAPPBLD000000019KCKT0",
    );
  });

  it("carries a code-owned execution config for auto dialogs so no record read is needed", () => {
    const result = resolveHandleSendMessageContext({
      dialogConfig: {
        dbKey: "dialog-auto",
        agentMode: "auto",
        cybots: [],
      } as any,
    });

    expect(result.agentConfigToUse).toMatchObject({
      dbKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
      provider: "nolo",
      model: "glm-5-3-flash",
      useServerProxy: true,
    });
  });

  it("maps legacy image-tier stickyTier to flash (preprocessing handles images)", () => {
    const result = resolveHandleSendMessageContext({
      dialogConfig: {
        dbKey: "dialog-auto-image",
        agentMode: "auto",
        cybots: [],
        autoRoute: { stickyTier: "image" },
      } as any,
    });

    // 旧 dialog 的 stickyTier="image" 映射到 flash 档（图片由预处理管道处理）
    expect(result.agentConfigToUse).toMatchObject({
      provider: "nolo",
      model: "glm-5-3-flash",
    });
  });

  it("does not shadow a real Agent record for fixed dialogs", () => {
    const result = resolveHandleSendMessageContext({
      dialogConfig: {
        dbKey: "dialog-fixed",
        agentMode: "fixed",
        cybots: ["agent-pub-01DSV4FLASHPB00000000JFPFD"],
      } as any,
    });

    expect(result.agentConfigToUse).toBeUndefined();
  });

  it("does not synthesize a config when an auto dialog targets a non-builtin agent", () => {
    const result = resolveHandleSendMessageContext({
      dialogConfig: {
        dbKey: "dialog-auto",
        agentMode: "auto",
        cybots: [],
      } as any,
      targetAgentKey: "agent-pub-01SOMEUSERAGENT",
    });

    expect(result.agentKeyToUse).toBe("agent-pub-01SOMEUSERAGENT");
    expect(result.agentConfigToUse).toBeUndefined();
  });

  it("uses the dialog primaryAgentKey as the default continuation agent", () => {
    const result = resolveHandleSendMessageContext({
      dialogConfig: {
        dbKey: "dialog-1",
        primaryAgentKey: "agent-handoff",
        cybots: ["agent-original", "agent-handoff"],
      } as any,
    });

    expect(result.agentKeyToUse).toBe("agent-handoff");
  });
});
