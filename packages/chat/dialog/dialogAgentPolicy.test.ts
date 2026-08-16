import { describe, expect, test } from "bun:test";
import {
  isAutoDialog,
  resolveDialogAgentMode,
  resolveDialogRuntimeAgentKey,
} from "./dialogAgentPolicy";
import { DEFAULT_AUTO_EXECUTION_PROFILE } from "agent-runtime/autoExecutionProfiles";

describe("dialog agent policy", () => {
  test("honors explicit auto even when legacy fields remain", () => {
    const dialog = { agentMode: "auto", cybots: ["agent-legacy"] } as any;
    expect(isAutoDialog(dialog)).toBe(true);
    expect(resolveDialogRuntimeAgentKey(dialog)).toBe(
      DEFAULT_AUTO_EXECUTION_PROFILE.legacyAgentKey,
    );
  });

  test("honors explicit fixed and legacy fixed dialogs", () => {
    expect(
      resolveDialogRuntimeAgentKey({
        agentMode: "fixed",
        primaryAgentKey: "agent-fixed",
        cybots: [],
      } as any),
    ).toBe("agent-fixed");
    expect(resolveDialogAgentMode({ cybots: ["agent-legacy"] } as any)).toBe(
      "fixed",
    );
  });

  test("activeAgentKey wins over primary for mode and runtime key", () => {
    const dialog = {
      primaryAgentKey: "agent-primary",
      cybots: ["agent-primary"],
      activeAgentKey: "agent-switched",
    } as any;
    expect(resolveDialogAgentMode(dialog)).toBe("fixed");
    expect(resolveDialogRuntimeAgentKey(dialog)).toBe("agent-switched");
  });

  test("activeAgentKey alone still counts as fixed (in-dialog switch)", () => {
    const dialog = { activeAgentKey: "agent-switched", cybots: [] } as any;
    expect(resolveDialogAgentMode(dialog)).toBe("fixed");
    expect(resolveDialogRuntimeAgentKey(dialog)).toBe("agent-switched");
  });

  test("treats legacy empty dialogs as auto", () => {
    const dialog = { cybots: [] } as any;
    expect(resolveDialogAgentMode(dialog)).toBe("auto");
    expect(resolveDialogRuntimeAgentKey(dialog)).toBe(
      DEFAULT_AUTO_EXECUTION_PROFILE.legacyAgentKey,
    );
  });

  test("maps legacy image-tier stickyTier to flash for continuation", () => {
    expect(
      resolveDialogRuntimeAgentKey({
        agentMode: "auto",
        cybots: [],
        autoRoute: { stickyTier: "image" },
      } as any),
    ).toBe("agent-pub-01DSV4FLASHPB00000000JFPFD");
  });

  test("prefers an explicit per-turn target", () => {
    expect(
      resolveDialogRuntimeAgentKey(
        { agentMode: "auto", cybots: [] } as any,
        "agent-mentioned",
      ),
    ).toBe("agent-mentioned");
  });
});
