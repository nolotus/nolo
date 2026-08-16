import { describe, expect, it } from "bun:test";

import {
  resolveAgentKeyAlias,
  resolveAgentKeyInput,
} from "./agentAliases";

describe("agentAliases", () => {
  it("does not hardcode product agent aliases in scripts", () => {
    expect(resolveAgentKeyAlias("nolo-frontend")).toBeUndefined();
    expect(resolveAgentKeyAlias("frontend-implementer")).toBeUndefined();
    expect(resolveAgentKeyAlias("frontend")).toBeUndefined();
    expect(resolveAgentKeyAlias("前端")).toBeUndefined();
    expect(resolveAgentKeyAlias("project-manager")).toBeUndefined();
    expect(resolveAgentKeyAlias("项目经理")).toBeUndefined();
    expect(resolveAgentKeyAlias("fullstack")).toBeUndefined();
    expect(resolveAgentKeyAlias("全栈")).toBeUndefined();
    expect(resolveAgentKeyAlias("senior-fullstack")).toBeUndefined();
    expect(resolveAgentKeyAlias("高级全栈")).toBeUndefined();
    expect(resolveAgentKeyAlias("reviewer")).toBeUndefined();
    expect(resolveAgentKeyAlias("代码审查")).toBeUndefined();
    expect(resolveAgentKeyAlias("win-qwen")).toBeUndefined();
    expect(resolveAgentKeyAlias("包月mimo")).toBeUndefined();
  });

  it("leaves raw agent keys and URLs untouched after normal parsing", () => {
    expect(resolveAgentKeyInput("agent-pub-01APPBUILDER00000001YAII3I")).toBe(
      "agent-pub-01APPBUILDER00000001YAII3I"
    );
    expect(
      resolveAgentKeyInput("https://us.nolo.chat/agent-pub-01APPBUILDER00000001YAII3I")
    ).toBe("agent-pub-01APPBUILDER00000001YAII3I");
  });
});
