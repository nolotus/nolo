import { describe, expect, test } from "bun:test";

import { AGENT_RUNTIME_MESSAGE_ROLES } from "./types";
import type {
  AgentRuntimeChatMessage,
  AgentRuntimeResult,
  AgentRuntimeToolPolicy,
  AgentRuntimeToolCall,
} from "./types";

describe("agent runtime shared contracts", () => {
  test("exports the stable chat message roles", () => {
    expect(AGENT_RUNTIME_MESSAGE_ROLES).toEqual(["system", "user", "assistant", "tool"]);
  });

  test("accepts text, image, tool-call, and result contract shapes", () => {
    const toolCall: AgentRuntimeToolCall = {
      id: "call-1",
      type: "function",
      function: { name: "search", arguments: "{}" },
    };
    const messages: AgentRuntimeChatMessage[] = [
      { role: "user", content: "hello" },
      { role: "user", content: [{ type: "image_url", image_url: { url: "file:///tmp/a.png" } }] },
      { role: "assistant", content: null, tool_calls: [toolCall] },
      { role: "tool", content: "ok", tool_call_id: "call-1" },
    ];
    const result: AgentRuntimeResult = {
      content: "done",
      model: "fake-local",
      trace: messages,
      runtimeToolNames: ["search"],
      toolCallCount: 1,
    };

    expect(result.trace?.[2]?.tool_calls?.[0]?.function.name).toBe("search");
  });

  test("keeps runtime tool policy generic enough for host-provided tools", () => {
    const policy: AgentRuntimeToolPolicy = {
      version: 1,
      agentTools: ["queryTableRows"],
      runtimeTools: ["execShell"],
      workspace: { mode: "current", writableRoots: ["/work/task-1"] },
      shell: {
        enabled: true,
        mode: "worktree",
        commandPolicy: "denylist",
        networkPolicy: "default-deny",
        maxOutputBytes: 20000,
      },
      git: { canCommit: true, canPushAlpha: false, canMergeMain: false },
      audit: { logToolCalls: true, logShellCommands: true, writeToDialog: true, writeToTask: true },
    };

    expect(policy.workspace?.mode).toBe("current");
    expect(policy.runtimeTools).toContain("execShell");
  });
});
