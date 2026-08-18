import { describe, expect, it } from "bun:test";
import {
  addDialogAgentIds,
  getActiveDialogAgentId,
  getDialogAgentIds,
  getPrimaryDialogAgentId,
  removeDialogAgentId,
  replacePrimaryDialogAgentId,
} from "./dialogAgents";

describe("dialogAgents", () => {
  it("reads dialog agent ids from the compat cybots field", () => {
    expect(
      getDialogAgentIds({
        cybots: ["agent-a", "agent-b", "" as any],
      } as any),
    ).toEqual(["agent-a", "agent-b"]);
  });

  it("prefers primaryAgentKey while keeping cybots as participants", () => {
    const config = {
      primaryAgentKey: "agent-b",
      cybots: ["agent-a", "agent-b", "agent-c"],
    } as any;

    expect(getDialogAgentIds(config)).toEqual([
      "agent-b",
      "agent-a",
      "agent-c",
    ]);
    expect(getPrimaryDialogAgentId(config)).toBe("agent-b");
  });

  it("getActiveDialogAgentId: explicit activeAgentKey wins after a switch", () => {
    const config = {
      primaryAgentKey: "agent-b",
      cybots: ["agent-a", "agent-b"],
      activeAgentKey: "agent-x",
    } as any;

    expect(getActiveDialogAgentId(config)).toBe("agent-x");
  });

  it("getActiveDialogAgentId: without a switch it matches primary (no drift when cybots[0] differs)", () => {
    // 历史数据 cybots[0] ≠ primaryAgentKey 时，未切换 dialog 必须读 primary，
    // 与 getPrimaryDialogAgentId 行为完全一致（active 层只在显式切换后生效）。
    const config = {
      primaryAgentKey: "agent-b",
      cybots: ["agent-a", "agent-b"],
    } as any;

    expect(getActiveDialogAgentId(config)).toBe("agent-b");
    expect(getActiveDialogAgentId(config)).toBe(getPrimaryDialogAgentId(config));
  });

  it("getActiveDialogAgentId: falls back to cybots[0] only when primary is absent", () => {
    expect(
      getActiveDialogAgentId({ cybots: ["agent-a", "agent-b"] } as any),
    ).toBe("agent-a");
  });

  it("getActiveDialogAgentId: returns defaultAgentId for empty config", () => {
    expect(getActiveDialogAgentId(null, "agent-default")).toBe("agent-default");
    expect(getActiveDialogAgentId({} as any)).toBeNull();
  });

  it("falls back to legacy llmId when cybots are absent", () => {
    expect(getDialogAgentIds({ llmId: "agent-legacy" } as any)).toEqual([
      "agent-legacy",
    ]);
    expect(getPrimaryDialogAgentId({ llmId: "agent-legacy" } as any)).toBe(
      "agent-legacy",
    );
  });

  it("deduplicates when adding dialog agents", () => {
    expect(
      addDialogAgentIds(["agent-a", "agent-b"], ["agent-b", "agent-c"]),
    ).toEqual(["agent-a", "agent-b", "agent-c"]);
  });

  it("moves the next primary agent to the front", () => {
    expect(
      replacePrimaryDialogAgentId(
        ["agent-a", "agent-b", "agent-c"],
        "agent-c",
      ),
    ).toEqual(["agent-c", "agent-a", "agent-b"]);
  });

  it("removes a dialog agent without mutating the others", () => {
    expect(removeDialogAgentId(["agent-a", "agent-b"], "agent-a")).toEqual([
      "agent-b",
    ]);
  });
});
