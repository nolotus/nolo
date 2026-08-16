import { describe, expect, test } from "bun:test";

import { createRuntimeHostDescriptor } from "./hostAdapter";
import type { AgentRuntimeHostAdapter } from "./hostAdapter";

describe("agent runtime host adapter boundary", () => {
  test("describes host capabilities without invoking adapter effects", async () => {
    const calls: string[] = [];
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-files", "local-provider"],
      loadAgentConfig: async () => {
        calls.push("loadAgentConfig");
        return { key: "frontend", name: "Frontend Agent", prompt: "Fix UI" };
      },
      loadDialogHistory: async () => {
        calls.push("loadDialogHistory");
        return [];
      },
      saveTurn: async () => {
        calls.push("saveTurn");
        return { dialogId: "dialog-local" };
      },
      resolveProvider: async () => {
        calls.push("resolveProvider");
        return {
          model: "fake-local",
          complete: async () => ({ content: "ok", model: "fake-local" }),
        };
      },
      executeTool: async () => {
        calls.push("executeTool");
        return { content: "tool ok" };
      },
    };

    expect(createRuntimeHostDescriptor(adapter)).toEqual({
      host: "cli",
      capabilities: ["local-files", "local-provider"],
    });
    expect(calls).toEqual([]);
  });
});
