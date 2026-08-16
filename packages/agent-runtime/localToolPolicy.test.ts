import { describe, expect, test } from "bun:test";

import {
  executeLocalToolWithPolicy,
  resolveLocalToolPolicy,
} from "./localToolPolicy";

describe("local tool policy", () => {
  test("allows execShell when enabled for local runtime", () => {
    expect(resolveLocalToolPolicy({
      env: {},
      agentToolNames: ["execShell"],
      toolName: "execShell",
    })).toEqual({ allowed: true, toolName: "execShell" });

    expect(resolveLocalToolPolicy({
      env: { NOLO_LOCAL_TOOL_MODE: "restricted", NOLO_LOCAL_ALLOWED_TOOLS: "execShell" },
      agentToolNames: ["execShell"],
      toolName: "execShell",
    })).toEqual({ allowed: true, toolName: "execShell" });

    expect(resolveLocalToolPolicy({
      env: { NOLO_LOCAL_TOOL_MODE: "restricted" },
      agentToolNames: [],
      toolName: "execShell",
    })).toMatchObject({ allowed: false, toolName: "execShell" });
  });

  test("allows declared local tools by default so agents can work first", () => {
    expect(resolveLocalToolPolicy({
      env: {},
      agentToolNames: ["searchFiles"],
      toolName: "searchFiles",
    })).toEqual({ allowed: true, toolName: "searchFiles" });

    expect(resolveLocalToolPolicy({
      env: { NOLO_LOCAL_TOOL_MODE: "restricted" },
      agentToolNames: ["searchFiles"],
      toolName: "searchFiles",
    })).toEqual({ allowed: true, toolName: "searchFiles" });

    expect(resolveLocalToolPolicy({
      env: { NOLO_LOCAL_TOOL_MODE: "restricted" },
      agentToolNames: ["someFutureTool"],
      toolName: "someFutureTool",
    })).toMatchObject({
      allowed: false,
    });
  });

  test("blocks dangerous self-mutating tools in local runtimes", () => {
    expect(resolveLocalToolPolicy({
      env: { NOLO_LOCAL_ALLOWED_TOOLS: "updateSelf" },
      agentToolNames: ["updateSelf"],
      toolName: "updateSelf",
    })).toEqual({
      allowed: false,
      toolName: "updateSelf",
      reason: "updateSelf is blocked by the local runtime safety policy.",
    });
  });

  test("requires env allowlist and agent declaration for ordinary tools", () => {
    expect(resolveLocalToolPolicy({
      env: { NOLO_LOCAL_ALLOWED_TOOLS: "readFile" },
      agentToolNames: ["readFile"],
      toolName: "readFile",
    })).toEqual({ allowed: true, toolName: "readFile" });

    expect(resolveLocalToolPolicy({
      env: { NOLO_LOCAL_ALLOWED_TOOLS: "readFile" },
      agentToolNames: [],
      toolName: "readFile",
    })).toMatchObject({ allowed: false });
  });

  test("allows controlled workspace file tools when the agent declares them", () => {
    expect(resolveLocalToolPolicy({
      env: {},
      agentToolNames: ["writeFile"],
      toolName: "writeFile",
    })).toEqual({ allowed: true, toolName: "writeFile" });

    expect(resolveLocalToolPolicy({
      env: {},
      agentToolNames: ["editFile"],
      toolName: "editFile",
    })).toEqual({ allowed: true, toolName: "editFile" });

    expect(resolveLocalToolPolicy({
      env: {},
      agentToolNames: [],
      toolName: "writeFile",
    })).toMatchObject({ allowed: false });
  });

  test("allows sub-agent scheduling tools by default so local sub-agent tasks work out of the box", () => {
    // Non-restricted mode: agent declaration alone is enough (these are
    // default-enabled because their blast radius is narrower than execShell,
    // which is also default-enabled).
    expect(resolveLocalToolPolicy({
      env: {},
      agentToolNames: ["startAgentRun"],
      toolName: "startAgentRun",
    })).toEqual({ allowed: true, toolName: "startAgentRun" });
    expect(resolveLocalToolPolicy({
      env: {},
      agentToolNames: ["controlAgentRun"],
      toolName: "controlAgentRun",
    })).toEqual({ allowed: true, toolName: "controlAgentRun" });

    // Restricted mode follows the same default-set semantics as searchFiles:
    // a default-set tool the agent declares is still allowed; restricted mode
    // only narrows the *non-default* "agent declares anything" path. To fully
    // block a default-set tool, use NEVER_LOCAL_TOOLS, not restricted mode.
    expect(resolveLocalToolPolicy({
      env: { NOLO_LOCAL_TOOL_MODE: "restricted" },
      agentToolNames: ["startAgentRun"],
      toolName: "startAgentRun",
    })).toEqual({ allowed: true, toolName: "startAgentRun" });

    // A non-default tool the agent declares is still blocked in restricted
    // mode without an env allowlist entry.
    expect(resolveLocalToolPolicy({
      env: { NOLO_LOCAL_TOOL_MODE: "restricted" },
      agentToolNames: ["someFutureTool"],
      toolName: "someFutureTool",
    })).toMatchObject({ allowed: false });

    // Undeclared tool is still blocked even though it's in the default set.
    expect(resolveLocalToolPolicy({
      env: {},
      agentToolNames: [],
      toolName: "startAgentRun",
    })).toMatchObject({ allowed: false });
  });

  test("blocks removed semantic git workflow tools even when declared", () => {
    for (const toolName of ["gitCreateBranch", "gitAdd", "gitCommit", "commitWorkspace"]) {
      expect(resolveLocalToolPolicy({
        env: {},
        agentToolNames: [toolName],
        toolName,
      })).toMatchObject({
        allowed: false,
        toolName,
      });
    }
  });

  test("executes registered tools only after policy allows them", async () => {
    const result = await executeLocalToolWithPolicy({
      env: { NOLO_LOCAL_ALLOWED_TOOLS: "readFile" },
      agentToolNames: ["readFile"],
      call: { id: "call-1", name: "readFile", arguments: "{\"path\":\"README.md\"}" },
      executors: {
        readFile: async (call) => ({ content: `read:${call.arguments}` }),
      },
    });

    expect(result.content).toContain("README.md");
  });

  test("canonicalizes local runtime tool aliases before policy checks", () => {
    expect(resolveLocalToolPolicy({
      env: {},
      agentToolNames: ["execShell"],
      toolName: "runCommand",
    })).toEqual({ allowed: true, toolName: "execShell" });
  });

  test("executes canonical local tool executors for aliased tool calls", async () => {
    const result = await executeLocalToolWithPolicy({
      env: {},
      agentToolNames: ["execShell"],
      call: { id: "call-1", name: "runCommand", arguments: "{\"cmd\":\"pwd\"}" },
      executors: {
        execShell: async (call) => ({
          content: `${call.name}:${call.arguments}`,
        }),
      },
    });

    expect(result.content).toContain("execShell");
    expect(result.content).toContain("\"cmd\":\"pwd\"");
  });

  test("runs destructive execShell commands without a confirm callback (no stall path)", async () => {
    // No confirmDestructiveAction = non-interactive path. Blocking here would
    // only stall the agent turn while the model retried the same `rm`.
    let executed = false;
    const result = await executeLocalToolWithPolicy({
      env: {},
      agentToolNames: ["execShell"],
      call: {
        id: "call-1",
        name: "execShell",
        arguments: "{\"cmd\":\"rm -rf ./tmp\"}",
        userInput: "Keep debugging, but don't delete files.",
      },
      executors: {
        execShell: async () => {
          executed = true;
          return { content: "exit 0" };
        },
      },
    });
    expect(executed).toBe(true);
    expect(result.content).toBe("exit 0");
  });

  test("prompts before destructive execShell when a confirm callback is wired", async () => {
    let confirmCalls = 0;
    let executed = false;
    const result = await executeLocalToolWithPolicy({
      env: {},
      agentToolNames: ["execShell"],
      call: {
        id: "call-1",
        name: "execShell",
        arguments: "{\"cmd\":\"rm -rf ./tmp\"}",
      },
      executors: {
        execShell: async () => {
          executed = true;
          return { content: "exit 0" };
        },
      },
      confirmDestructiveAction: async () => {
        confirmCalls += 1;
        return true;
      },
    });
    expect(confirmCalls).toBe(1);
    expect(executed).toBe(true);
    expect(result.content).toBe("exit 0");
  });

  test("blocks destructive execShell when the confirm callback returns false", async () => {
    let executed = false;
    await expect(
      executeLocalToolWithPolicy({
        env: {},
        agentToolNames: ["execShell"],
        call: {
          id: "call-1",
          name: "execShell",
          arguments: "{\"cmd\":\"rm -rf ./tmp\"}",
        },
        executors: {
          execShell: async () => {
            executed = true;
            return { content: "should not run" };
          },
        },
        confirmDestructiveAction: async () => false,
      }),
    ).rejects.toMatchObject({
      code: "destructive_action_requires_confirmation",
    });
    expect(executed).toBe(false);
  });
});

/**
 * 破坏性命令闸门的两个实测漏洞（2026-07-27）：
 *
 * 1. 别名旁路：闸门只读 args.command（或 command ?? cmd），而实际执行命令的代码
 *    认一整串别名。模型把参数命名成 `bash` / `runCommand` / `execute_command`
 *    就能让 `rm -rf` 被判成「非破坏性」直接跑过去。
 * 2. fail-open：命中破坏性命令后，只在 confirmDestructiveAction 存在时才确认；
 *    回调缺席整个分支落空。对无头 CLI 这是有意为之，但 desktop 侧等于没有闸门。
 */
describe("destructive shell guard bypasses", () => {
  const runWithArgs = async (rawArguments: string, extra: Record<string, unknown> = {}) => {
    let executed = false;
    const result = await executeLocalToolWithPolicy({
      env: {},
      agentToolNames: ["execShell"],
      call: { id: "call-1", name: "execShell", arguments: rawArguments, userInput: "别删东西" },
      executors: {
        execShell: async () => {
          executed = true;
          return { content: "exit 0" };
        },
      },
      ...extra,
    } as any);
    return { executed, result };
  };

  for (const key of ["cmd", "bash", "runCommand", "execute_command", "terminalCommand"]) {
    test(`treats a destructive command passed as \`${key}\` as destructive`, async () => {
      let asked = false;
      const { executed } = await runWithArgs(
        JSON.stringify({ [key]: "rm -rf ./tmp" }),
        {
          confirmDestructiveAction: async () => {
            asked = true;
            return false;
          },
        },
      ).catch((error: any) => {
        expect(error.code).toBe("destructive_action_requires_confirmation");
        return { executed: false, result: null };
      });
      expect(asked).toBe(true);
      expect(executed).toBe(false);
    });
  }

  test("blocks when the caller declares no confirmation channel means deny", async () => {
    await expect(
      runWithArgs(JSON.stringify({ cmd: "rm -rf ./tmp" }), {
        blockDestructiveWithoutConfirmation: true,
      }),
    ).rejects.toThrow("no confirmation channel");
  });

  test("still runs a harmless command passed under an alias", async () => {
    const { executed } = await runWithArgs(JSON.stringify({ bash: "pwd" }));
    expect(executed).toBe(true);
  });
});
