import { describe, expect, it } from "bun:test";

import {
  checkBoundMachine,
  checkManagedImplementationReadiness,
  collectAgentToolNames,
  CORE_HEALTH_AGENTS,
  formatAgentReadAttempts,
  formatAgentHealthLine,
  formatAgentHealthSummary,
  getBoundMachineId,
  hasAcceptedBackgroundStartAgentRunSmoke,
  HEALTH_AGENTS,
  MACHINE_BOUND_HEALTH_AGENTS,
  type AgentHealthResult,
} from "./agentHealthCheck";
import { expectNoRetiredTaskOrchestrationTerms } from "./retiredTaskOrchestrationTerms";

describe("agentHealthCheck helpers", () => {
  it("defines health-check scope by role handles instead of current private keys", () => {
    expect(CORE_HEALTH_AGENTS.map((agent) => agent.slug)).toEqual(["pm", "fullstack"]);
    expect(CORE_HEALTH_AGENTS.map((agent) => [agent.slug, agent.agentInput, agent.key])).toEqual([
      ["pm", "pm", undefined],
      ["fullstack", "fullstack", undefined],
    ]);
    expect(MACHINE_BOUND_HEALTH_AGENTS.map((agent) => [agent.slug, agent.agentInput, agent.key])).toEqual([
      ["frontend", "frontend-implementer", undefined],
    ]);
    expect(HEALTH_AGENTS.map((agent) => agent.slug)).toEqual([
      "pm",
      "fullstack",
      "frontend",
    ]);
  });

  it("formats one-line PASS/FAIL output with a repair hint", () => {
    const result: AgentHealthResult = {
      agent: { label: "nolo 全栈工程师", key: "agent-user-id", slug: "fullstack" },
      status: "FAIL",
      reason: "绑定机器 machine-a connector disconnected",
      fix: "重启 connector。",
    };

    expect(formatAgentHealthLine(result)).toBe(
      "❌ FAIL nolo 全栈工程师 - 绑定机器 machine-a connector disconnected；建议：重启 connector。"
    );
  });

  it("summarizes total pass and fail counts", () => {
    expect(
      formatAgentHealthSummary([
        { agent: { label: "A", key: "a", slug: "a" }, status: "PASS", reason: "ok" },
        { agent: { label: "B", key: "b", slug: "b" }, status: "FAIL", reason: "bad" },
      ])
    ).toBe("Summary: 1/2 PASS, 1 FAIL");
  });

  it("formats failed agent read attempts with status and base", () => {
    expect(
      formatAgentReadAttempts([
        { base: "http://127.0.0.1:38123", ok: false, status: 401 },
        { base: "https://us.nolo.chat", ok: false, status: 404 },
      ])
    ).toBe("read attempts: http://127.0.0.1:38123=401, https://us.nolo.chat=404");
  });

  it("requires bound machine agents to be online and connector-connected", () => {
    const agentRecord = {
      runtimeBinding: { machineId: "machine-a" },
    };

    expect(getBoundMachineId(agentRecord)).toBe("machine-a");
    expect(
      checkBoundMachine({
        agentRecord,
        machines: [{ machineId: "machine-a", status: "online", connectorStatus: "connected" }],
      })
    ).toEqual({
      ok: true,
      detail: "绑定机器 machine-a online + connected",
    });
    expect(
      checkBoundMachine({
        agentRecord,
        machines: [{ machineId: "machine-a", status: "online", connectorStatus: "disconnected" }],
      })
    ).toEqual({
      ok: false,
      detail: "绑定机器 machine-a connector disconnected",
      fix: "检查 Codex CLI connector WebSocket 是否在线，必要时重启 connector。",
    });
  });

  it("treats records without machine binding as entrypoint-specific agents", () => {
    expect(
      checkBoundMachine({
        agentRecord: {},
        machines: [],
      })
    ).toEqual({
      ok: true,
      detail: "无 machineId 绑定，按当前运行入口处理",
    });
  });

  it("extracts configured tool names from mixed agent record shapes", () => {
    expect(
      collectAgentToolNames({
        tools: ["readFile", { name: "applyEdit" }, { function: { name: "execShell" } }],
        config: { tools: ["codeSearch"] },
      })
    ).toEqual(["readFile", "applyEdit", "execShell", "codeSearch"]);
  });

  it("does not keep a task-orchestration-specific tool guard in agent health", async () => {
    const source = await Bun.file(new URL("./agentHealthCheck.ts", import.meta.url)).text();

    expect(source).not.toContain("checkRetiredToolDeclarations");
    expect(source).not.toContain("RETIRED_TASK_ORCHESTRATION_TOOLS");
    expectNoRetiredTaskOrchestrationTerms(source);
  });

  it("requires implementation agents to expose code read, write, and verification tools", () => {
    expect(
      checkManagedImplementationReadiness({
        agent: { label: "前端实现员", key: "agent-frontend", slug: "frontend" },
        agentRecord: { tools: ["readFile", "codeSearch", "applyEdit", "execShell"] },
      })
    ).toEqual({
      ok: true,
      detail: "实现工具就绪：codeSearch/readFile + applyEdit + execShell",
    });

    expect(
      checkManagedImplementationReadiness({
        agent: { label: "前端实现员", key: "agent-frontend", slug: "frontend" },
        agentRecord: { tools: ["readFile", "codeSearch"] },
      })
    ).toEqual({
      ok: false,
      detail: "缺少实现闭环工具：write、verify",
      fix: "为该 agent 配置 codeSearch/readFile、applyEdit/writeFile/applyLineEdits、execShell/checkEnv；否则只能咨询，不能接实现任务。",
    });
  });

  it("does not report unbound fullstack server records as code-execution ready", () => {
    expect(
      checkManagedImplementationReadiness({
        agent: { label: "fullstack", key: "agent-fullstack", slug: "fullstack" },
        agentRecord: { tools: ["readFile", "codeSearch", "applyEdit", "execShell"] },
      })
    ).toEqual({
      ok: true,
      detail: "fullstack server 记录可达；代码实现请用 CLI local：nolo agent run fullstack --local",
    });
  });

  it("requires review agents to expose read and verification tools without requiring write tools", () => {
    expect(
      checkManagedImplementationReadiness({
        agent: { label: "Codex CLI 统一执行助理（reviewer role）", key: "agent-review", slug: "review" },
        agentRecord: { tools: ["codeSearch", "readFile", "execShell"] },
      })
    ).toEqual({
      ok: true,
      detail: "审查工具就绪：codeSearch/readFile + execShell",
    });

    expect(
      checkManagedImplementationReadiness({
        agent: { label: "Codex CLI 统一执行助理（reviewer role）", key: "agent-review", slug: "review" },
        agentRecord: { tools: ["codeSearch", "readFile"] },
      })
    ).toEqual({
      ok: false,
      detail: "缺少审查闭环工具：verify",
      fix: "为 reviewer 配置 codeSearch/readFile 与 execShell/checkEnv，以便读取变更并运行验证。",
    });
  });

  it("checks PM readiness by startAgentRun availability without requiring implementation tools", () => {
    expect(
      checkManagedImplementationReadiness({
        agent: { label: "PM（项目经理）", key: "agent-pm", slug: "pm" },
        agentRecord: { tools: ["startAgentRun", "queryTableRows"] },
      })
    ).toEqual({
      ok: true,
      detail: "PM 子任务工具就绪：startAgentRun",
    });

    expect(
      checkManagedImplementationReadiness({
        agent: { label: "PM（项目经理）", key: "agent-pm", slug: "pm" },
        agentRecord: { tools: ["queryTableRows"] },
      })
    ).toEqual({
      ok: false,
      detail: "缺少 PM 子任务工具：startAgentRun",
      fix: "为 project-manager 配置 startAgentRun；任务板读写只使用表格工具，分发使用 agent dialog/local CLI handoff。",
    });
  });

  it("accepts factual startAgentRun background evidence with runId, childDialogId and agentKey", () => {
    expect(
      hasAcceptedBackgroundStartAgentRunSmoke({
        targetAgentKey: "agent-user-1-fullstack",
        content: [
          "startAgentRun background accepted.",
          "runId: 01RUN",
          "childDialogId: 01CHILD",
          "status: pending",
          "agentKey: agent-user-1-fullstack",
        ].join("\n"),
      }),
    ).toBe(true);

    expect(
      hasAcceptedBackgroundStartAgentRunSmoke({
        targetAgentKey: "agent-user-1-fullstack",
        content: [
          '{"success":true,"status":"pending","agentKey":"agent-user-1-fullstack","childDialogId":"01CHILD","runId":"01RUN","parentDialogId":"P01","serverBase":"http://127.0.0.1:38123"}',
        ].join("\n"),
      }),
    ).toBe(true);

    expect(
      hasAcceptedBackgroundStartAgentRunSmoke({
        targetAgentKey: "agent-user-1-fullstack",
        content: "agent-health-started:fullstack",
      }),
    ).toBe(false);

    expect(
      hasAcceptedBackgroundStartAgentRunSmoke({
        targetAgentKey: "agent-user-1-fullstack",
        content: [
          "startAgentRun background accepted.",
          "runId: 01RUN",
          "agentKey: agent-user-1-fullstack",
        ].join("\n"),
      }),
    ).toBe(false);

    expect(
      hasAcceptedBackgroundStartAgentRunSmoke({
        targetAgentKey: "agent-user-1-fullstack",
        content: [
          "childDialogId: 01CHILD",
          "agentKey: agent-user-1-fullstack",
        ].join("\n"),
      }),
    ).toBe(false);

    expect(
      hasAcceptedBackgroundStartAgentRunSmoke({
        targetAgentKey: "agent-user-1-fullstack",
        content: [
          '{"success":true,"status":"pending","agentKey":"agent-user-1-fullstack","childDialogId":null,"runId":null}',
        ].join("\n"),
      }),
    ).toBe(false);

    expect(
      hasAcceptedBackgroundStartAgentRunSmoke({
        targetAgentKey: "agent-user-1-fullstack",
        content: [
          "startAgentRun accepted.",
          "runId: 01RUN",
          "childDialogId: 01CHILD",
          "agentKey: agent-other",
        ].join("\n"),
      }),
    ).toBe(false);
  });
});
