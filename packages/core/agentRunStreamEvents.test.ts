import { describe, expect, it } from "bun:test";
import { isAgentRunStreamEvent } from "./agentRunStreamEvents";
import type { AgentRunStreamEvent } from "./agentRunStreamEvents";

describe("agentRunStreamEvents", () => {
  it("narrows text event via isAgentRunStreamEvent", () => {
    const event: AgentRunStreamEvent = { type: "text", content: "hello" };
    if (isAgentRunStreamEvent(event, "text")) {
      expect(event.content).toBe("hello");
    } else {
      expect.unreachable("should have narrowed to text");
    }
  });

  it("narrows done event via isAgentRunStreamEvent", () => {
    const event: AgentRunStreamEvent = {
      type: "done",
      usage: { prompt_tokens: 10 },
      provider: "openai",
      model: "gpt-4",
    };
    if (isAgentRunStreamEvent(event, "done")) {
      expect(event.usage?.prompt_tokens).toBe(10);
      expect(event.provider).toBe("openai");
    } else {
      expect.unreachable("should have narrowed to done");
    }
  });

  it("narrows error event via isAgentRunStreamEvent", () => {
    const event: AgentRunStreamEvent = {
      type: "error",
      message: "something went wrong",
    };
    if (isAgentRunStreamEvent(event, "error")) {
      expect(event.message).toBe("something went wrong");
    } else {
      expect.unreachable("should have narrowed to error");
    }
  });

  it("narrows turn_warning event via isAgentRunStreamEvent", () => {
    const event: AgentRunStreamEvent = {
      type: "turn_warning",
      reason: "empty_completion",
      message: "模型连续返回空消息",
    };
    if (isAgentRunStreamEvent(event, "turn_warning")) {
      expect(event.reason).toBe("empty_completion");
      expect(event.message).toContain("空消息");
    } else {
      expect.unreachable("should have narrowed to turn_warning");
    }
  });

  it("narrows turn_warning length_truncated reason", () => {
    const event: AgentRunStreamEvent = {
      type: "turn_warning",
      reason: "length_truncated",
      message: "输出达到长度上限",
    };
    if (isAgentRunStreamEvent(event, "turn_warning")) {
      expect(event.reason).toBe("length_truncated");
    } else {
      expect.unreachable("should have narrowed to turn_warning");
    }
  });

  it("narrows thinking event via isAgentRunStreamEvent", () => {
    const event: AgentRunStreamEvent = {
      type: "thinking",
      content: "思考中...",
    };
    if (isAgentRunStreamEvent(event, "thinking")) {
      expect(event.content).toBe("思考中...");
    } else {
      expect.unreachable("should have narrowed to thinking");
    }
  });

  it("narrows tool_start event via isAgentRunStreamEvent", () => {
    const event: AgentRunStreamEvent = {
      type: "tool_start",
      calls: ["fetchWebpage"],
    };
    if (isAgentRunStreamEvent(event, "tool_start")) {
      expect(event.calls).toEqual(["fetchWebpage"]);
    } else {
      expect.unreachable("should have narrowed to tool_start");
    }
  });

  it("narrows tool_result event via isAgentRunStreamEvent", () => {
    const event: AgentRunStreamEvent = {
      type: "tool_result",
      toolCallId: "call_1",
      toolName: "fetchWebpage",
      content: "page content",
    };
    if (isAgentRunStreamEvent(event, "tool_result")) {
      expect(event.toolName).toBe("fetchWebpage");
      expect(event.content).toBe("page content");
    } else {
      expect.unreachable("should have narrowed to tool_result");
    }
  });

  it("narrows agent_handoff event via isAgentRunStreamEvent", () => {
    const event: AgentRunStreamEvent = {
      type: "agent_handoff",
      agentKey: "specialist",
      agentName: "Specialist",
      inline: true,
    };
    if (isAgentRunStreamEvent(event, "agent_handoff")) {
      expect(event.agentKey).toBe("specialist");
      expect(event.inline).toBe(true);
    } else {
      expect.unreachable("should have narrowed to agent_handoff");
    }
  });

  it("narrows doc_created event via isAgentRunStreamEvent", () => {
    const event: AgentRunStreamEvent = {
      type: "doc_created",
      dbKey: "doc_abc",
      title: "Test Doc",
    };
    if (isAgentRunStreamEvent(event, "doc_created")) {
      expect(event.dbKey).toBe("doc_abc");
      expect(event.title).toBe("Test Doc");
    } else {
      expect.unreachable("should have narrowed to doc_created");
    }
  });

  it("narrows dialog event via isAgentRunStreamEvent", () => {
    const event: AgentRunStreamEvent = {
      type: "dialog",
      dialogId: "dialog_1",
      dialogKey: "key_1",
      status: "running",
    };
    if (isAgentRunStreamEvent(event, "dialog")) {
      expect(event.dialogId).toBe("dialog_1");
      expect(event.status).toBe("running");
    } else {
      expect.unreachable("should have narrowed to dialog");
    }
  });

  it("narrows status event via isAgentRunStreamEvent", () => {
    const event: AgentRunStreamEvent = {
      type: "status",
      status: "running",
    };
    if (isAgentRunStreamEvent(event, "status")) {
      expect(event.status).toBe("running");
    } else {
      expect.unreachable("should have narrowed to status");
    }
  });

  it("returns false for mismatched type", () => {
    const event: AgentRunStreamEvent = { type: "text", content: "hello" };
    expect(isAgentRunStreamEvent(event, "done")).toBe(false);
  });
});
