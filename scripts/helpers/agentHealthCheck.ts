import { toErrorMessage } from "core/errorMessage";
import { asTrimmedString } from "core/trimmedString";
import { apiGet, apiPost } from "./apiHelpers";
import {
  buildAgentServerCandidates,
  type AgentRecordCacheDb,
  readAgentRecordAcrossBases,
  resolveAgentRecordInputAcrossBases,
} from "./agentDataHelpers";
import { resolveUserAuthToken } from "./authContext";
import { LOCAL_SERVER_ORIGIN } from "./serverBases";
import { getReadableCliDb } from "../../packages/cli/agentCommandSupport";

export type HealthAgentConfig = {
  label: string;
  key?: string;
  agentInput?: string;
  slug: string;
};

export type HealthCheckStatus = "PASS" | "FAIL";

export type AgentHealthResult = {
  agent: HealthAgentConfig;
  status: HealthCheckStatus;
  reason: string;
  fix?: string;
  resolvedBase?: string;
};

type AgentReadAttempt = {
  base: string;
  ok: boolean;
  status?: number;
  message?: string;
};

export const CORE_HEALTH_AGENTS: HealthAgentConfig[] = [
  {
    label: "PM（项目经理）",
    agentInput: "pm",
    slug: "pm",
  },
  {
    label: "fullstack",
    agentInput: "fullstack",
    slug: "fullstack",
  },
];

export const MACHINE_BOUND_HEALTH_AGENTS: HealthAgentConfig[] = [
  {
    label: "前端实现员",
    agentInput: "frontend-implementer",
    slug: "frontend",
  },
];

export const HEALTH_AGENTS: HealthAgentConfig[] = [
  ...CORE_HEALTH_AGENTS,
  ...MACHINE_BOUND_HEALTH_AGENTS,
];

export const DEFAULT_AGENT_HEALTH_TIMEOUT_MS = 120_000;

type MachineSummary = {
  machineId?: string;
  status?: string;
  connectorStatus?: string;
  capabilities?: string[];
  name?: string;
};

type HealthCheckOptions = {
  serverBase?: string;
  authToken?: string;
  timeoutMs?: number;
  dispatcherAgentKey?: string;
  agents?: HealthAgentConfig[];
  includeMachineBoundAgents?: boolean;
  fetchImpl?: typeof fetch;
  localDb?: AgentRecordCacheDb;
};

type ResolvedHealthAgentConfig = HealthAgentConfig & {
  key: string;
};

export function formatAgentHealthLine(result: AgentHealthResult) {
  const icon = result.status === "PASS" ? "✅ PASS" : "❌ FAIL";
  const suffix = result.fix ? `；建议：${result.fix}` : "";
  return `${icon} ${result.agent.label} - ${result.reason}${suffix}`;
}

export function formatAgentHealthSummary(results: AgentHealthResult[]) {
  const passed = results.filter((result) => result.status === "PASS").length;
  const failed = results.length - passed;
  return `Summary: ${passed}/${results.length} PASS, ${failed} FAIL`;
}

export function formatAgentReadAttempts(attempts: AgentReadAttempt[]) {
  const parts = attempts.map((attempt) => {
    if (attempt.ok) return `${attempt.base}=ok`;
    return `${attempt.base}=${attempt.status ?? "error"}`;
  });
  return `read attempts: ${parts.join(", ")}`;
}

export function getBoundMachineId(agentRecord: any) {
  const binding = agentRecord?.runtimeBinding;
  if (!binding || typeof binding !== "object") return "";
  return asTrimmedString(binding.machineId);
}

export function checkBoundMachine(args: {
  agentRecord: any;
  machines: MachineSummary[];
}) {
  const machineId = getBoundMachineId(args.agentRecord);
  if (!machineId) {
    return {
      ok: true,
      detail: "无 machineId 绑定，按当前运行入口处理",
    };
  }

  const machine = args.machines.find((item) => item.machineId === machineId);
  if (!machine) {
    return {
      ok: false,
      detail: `绑定机器 ${machineId} 未出现在 /api/machines`,
      fix: "确认该机器使用同一账号连接到目标 server，并重新运行 nolo connect。",
    };
  }
  if (machine.status !== "online") {
    return {
      ok: false,
      detail: `绑定机器 ${machineId} 当前 ${machine.status ?? "unknown"}`,
      fix: "启动本机 connector，等待 heartbeat 变为 online。",
    };
  }
  if (machine.connectorStatus !== "connected") {
    return {
      ok: false,
      detail: `绑定机器 ${machineId} connector ${machine.connectorStatus ?? "unknown"}`,
      fix: "检查 Codex CLI connector WebSocket 是否在线，必要时重启 connector。",
    };
  }
  return {
    ok: true,
    detail: `绑定机器 ${machine.name ?? machineId} online + connected`,
  };
}

const IMPLEMENTATION_READ_TOOLS = ["codeSearch", "readFile", "read"];
const IMPLEMENTATION_WRITE_TOOLS = ["applyEdit", "applyLineEdits", "writeFile"];
const IMPLEMENTATION_VERIFY_TOOLS = ["execShell", "execShell", "checkEnv"];

function extractToolName(tool: unknown) {
  return (
    asTrimmedString(tool) ||
    asTrimmedString((tool as { name?: unknown } | null)?.name) ||
    asTrimmedString((tool as { id?: unknown } | null)?.id) ||
    asTrimmedString(
      (tool as { function?: { name?: unknown } } | null)?.function?.name,
    )
  );
}

function appendToolNames(target: string[], value: unknown) {
  if (!Array.isArray(value)) return;
  for (const tool of value) {
    const name = extractToolName(tool);
    if (name && !target.includes(name)) target.push(name);
  }
}

export function collectAgentToolNames(agentRecord: any) {
  const names: string[] = [];
  appendToolNames(names, agentRecord?.tools);
  appendToolNames(names, agentRecord?.config?.tools);
  appendToolNames(names, agentRecord?.runtime?.tools);
  appendToolNames(names, agentRecord?.capabilities?.tools);
  return names;
}

function hasAnyTool(toolNames: string[], required: string[]) {
  return required.some((name) => toolNames.includes(name));
}

export function checkManagedImplementationReadiness(args: {
  agent: HealthAgentConfig;
  agentRecord: any;
}) {
  const slug = args.agent.slug;
  if (slug === "pm") {
    const toolNames = collectAgentToolNames(args.agentRecord);
    if (!toolNames.includes("startAgentRun")) {
      return {
        ok: false,
        detail: "缺少 PM 子任务工具：startAgentRun",
        fix: "为 project-manager 配置 startAgentRun；任务板读写只使用表格工具，分发使用 agent dialog/local CLI handoff。",
      };
    }
    return {
      ok: true,
      detail: "PM 子任务工具就绪：startAgentRun",
    };
  }

  const toolNames = collectAgentToolNames(args.agentRecord);
  const hasRead = hasAnyTool(toolNames, IMPLEMENTATION_READ_TOOLS);
  const hasWrite = hasAnyTool(toolNames, IMPLEMENTATION_WRITE_TOOLS);
  const hasVerify = hasAnyTool(toolNames, IMPLEMENTATION_VERIFY_TOOLS);

  if (slug === "review") {
    const missing = [
      !hasRead ? "read" : "",
      !hasVerify ? "verify" : "",
    ].filter(Boolean);
    if (missing.length > 0) {
      return {
        ok: false,
        detail: `缺少审查闭环工具：${missing.join("、")}`,
        fix: "为 reviewer 配置 codeSearch/readFile 与 execShell/checkEnv，以便读取变更并运行验证。",
      };
    }
    return {
      ok: true,
      detail: "审查工具就绪：codeSearch/readFile + execShell",
    };
  }

  if (slug === "fullstack") {
    return {
      ok: true,
      detail: "fullstack server 记录可达；代码实现请用 CLI local：nolo agent run fullstack --local",
    };
  }

  if (slug === "frontend") {
    const missing = [
      !hasRead ? "read" : "",
      !hasWrite ? "write" : "",
      !hasVerify ? "verify" : "",
    ].filter(Boolean);
    if (missing.length > 0) {
      return {
        ok: false,
        detail: `缺少实现闭环工具：${missing.join("、")}`,
        fix: "为该 agent 配置 codeSearch/readFile、applyEdit/writeFile/applyLineEdits、execShell/checkEnv；否则只能咨询，不能接实现任务。",
      };
    }
    return {
      ok: true,
      detail: "实现工具就绪：codeSearch/readFile + applyEdit + execShell",
    };
  }

  return {
    ok: true,
    detail: "非托管实现角色，跳过实现工具检查",
  };
}

export function hasAcceptedBackgroundStartAgentRunSmoke(args: {
  content: string;
  targetAgentKey: string;
}) {
  const runId = args.content.match(/["']?runId["']?\s*:\s*["']?([^"',}\s]+)/i)?.[1] ?? "";
  const childDialogId =
    args.content.match(/["']?childDialogId["']?\s*:\s*["']?([^"',}\s]+)/i)?.[1] ?? "";
  const agentKeyPattern = new RegExp(
    `agentKey["']?\\s*:\\s*["']?${escapeRegExp(args.targetAgentKey)}`,
  );
  return (
    runId.length > 0 &&
    runId !== "null" &&
    childDialogId.length > 0 &&
    childDialogId !== "null" &&
    agentKeyPattern.test(args.content)
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function listMachines(args: {
  baseUrl: string;
  token: string;
  fetchImpl?: typeof fetch;
}) {
  if (args.fetchImpl && args.fetchImpl !== fetch) {
    const res = await args.fetchImpl(`${args.baseUrl}/api/machines`, {
      headers: { Authorization: `Bearer ${args.token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
    }
    return Array.isArray(data?.machines) ? data.machines as MachineSummary[] : [];
  }

  const res = await apiGet<{ machines?: MachineSummary[] }>(
    `${args.baseUrl}/api/machines`,
    args.token,
  );
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(res.data).slice(0, 300)}`);
  }
  return Array.isArray(res.data?.machines) ? res.data.machines : [];
}

async function runDispatchSmoke(args: {
  baseUrl: string;
  token: string;
  dispatcherAgentKey: string;
  target: HealthAgentConfig;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
}) {
  const userInput = [
    "Health check only. Use startAgentRun exactly once (async dispatch).",
    `agentKey: ${args.target.key}.`,
    "Message for the target: Health check only. Reply with a short acknowledgement and do not modify files.",
    "After the tool result, report the startAgentRun result without claiming child completion.",
  ].join("\n");

  const body = {
    agentKey: args.dispatcherAgentKey,
    userInput,
    stream: false,
    runtimeContext: {
      surface: "script",
      runtime: "bun",
      entrypoint: "scripts/agent-health-check.ts",
    },
  };

  if (args.fetchImpl && args.fetchImpl !== fetch) {
    const res = await args.fetchImpl(`${args.baseUrl}/api/agent/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${args.token}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(args.timeoutMs + 30_000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
    }
    const content = typeof data?.content === "string" ? data.content : "";
    const targetAgentKey = args.target.key ?? args.target.slug;
    return {
      ok: hasAcceptedBackgroundStartAgentRunSmoke({
        content,
        targetAgentKey,
      }),
      content,
    };
  }

  const res = await apiPost<{ content?: string }>(
    `${args.baseUrl}/api/agent/run`,
    body,
    args.token,
    { timeoutMs: args.timeoutMs + 30_000 },
  );
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(res.data).slice(0, 300)}`);
  }
  const content = typeof res.data?.content === "string" ? res.data.content : "";
  const targetAgentKey = args.target.key ?? args.target.slug;
  return {
    ok: hasAcceptedBackgroundStartAgentRunSmoke({
      content,
      targetAgentKey,
    }),
    content,
  };
}

async function resolveHealthAgent(args: {
  agent: HealthAgentConfig;
  bases: string[];
  authToken: string;
  localDb?: AgentRecordCacheDb;
}) {
  const read = await resolveAgentRecordInputAcrossBases({
    bases: args.bases,
    agentInput: args.agent.key ?? args.agent.agentInput ?? args.agent.slug,
    authToken: args.authToken,
    localDb: args.localDb,
  });
  return {
    agent: {
      ...args.agent,
      key: read.agentKey,
    } satisfies ResolvedHealthAgentConfig,
    record: read.record,
    resolvedBase: read.resolvedBase,
    attempts: read.attempts,
  };
}

export async function checkAgentHealth(options: HealthCheckOptions = {}) {
  const token = options.authToken ?? resolveUserAuthToken({
    extraEnvKeys: ["SUPERVISOR_AUTH_TOKEN", "NOLO_AUTH_TOKEN", "NOLO_TOKEN"],
    includeTestFallback: false,
  });
  if (!token) {
    throw new Error(
      "Missing auth token. Set AUTH_TOKEN, AUTH, BENCHMARK_AUTH_TOKEN, SUPERVISOR_AUTH_TOKEN, NOLO_AUTH_TOKEN, or pass --auth-token."
    );
  }

  const preferredBase = options.serverBase ?? process.env.BASE_URL ?? LOCAL_SERVER_ORIGIN;
  const bases = buildAgentServerCandidates(preferredBase);
  const localDb = options.localDb ?? await getReadableCliDb({ write: () => undefined });
  const timeoutMs = options.timeoutMs ?? DEFAULT_AGENT_HEALTH_TIMEOUT_MS;
  const agents = options.agents ?? (
    options.includeMachineBoundAgents
      ? HEALTH_AGENTS
      : CORE_HEALTH_AGENTS
  );
  const dispatcherAgentKey = options.dispatcherAgentKey ?? (
    await resolveAgentRecordInputAcrossBases({
      bases,
      agentInput: "pm",
      authToken: token,
      localDb,
    })
  ).agentKey;

  const results: AgentHealthResult[] = [];

  for (const agent of agents) {
    try {
      const resolved = await resolveHealthAgent({
        agent,
        bases,
        authToken: token,
        localDb,
      });
      const read = await readAgentRecordAcrossBases({
        bases: [resolved.resolvedBase],
        agentKey: resolved.agent.key,
        authToken: token,
      });
      const record = read.record;
      if (!record?.dbKey || record.dbKey !== resolved.agent.key) {
        results.push({
          agent: resolved.agent,
          status: "FAIL",
          resolvedBase: read.resolvedBase,
          reason: `agent 记录存在但 dbKey 不匹配：${record?.dbKey ?? "missing"}`,
          fix: "检查 agent 私有 key 是否被重建或同步错服。",
        });
        continue;
      }

      const machines = await listMachines({
        baseUrl: read.resolvedBase,
        token,
        fetchImpl: options.fetchImpl,
      });

      const machineCheck = checkBoundMachine({ agentRecord: record, machines });
      if (!machineCheck.ok) {
        results.push({
          agent: resolved.agent,
          status: "FAIL",
          resolvedBase: read.resolvedBase,
          reason: machineCheck.detail,
          fix: machineCheck.fix,
        });
        continue;
      }

      const readinessCheck = checkManagedImplementationReadiness({
        agent: resolved.agent,
        agentRecord: record,
      });
      if (!readinessCheck.ok) {
        results.push({
          agent: resolved.agent,
          status: "FAIL",
          resolvedBase: read.resolvedBase,
          reason: readinessCheck.detail,
          fix: readinessCheck.fix,
        });
        continue;
      }

      if (resolved.agent.slug === "pm") {
        results.push({
          agent: resolved.agent,
          status: "PASS",
          resolvedBase: read.resolvedBase,
          reason: `dbKey OK；${machineCheck.detail}；${readinessCheck.detail}`,
        });
        continue;
      }

      const dispatch = await runDispatchSmoke({
        baseUrl: read.resolvedBase,
        token,
        dispatcherAgentKey,
        target: resolved.agent,
        timeoutMs,
        fetchImpl: options.fetchImpl,
      });
      if (!dispatch.ok) {
        results.push({
          agent: resolved.agent,
          status: "FAIL",
          resolvedBase: read.resolvedBase,
          reason: "startAgentRun 未确认子任务启动",
          fix: "查看本次 agent/run 对话，确认 PM 是否有 startAgentRun 工具、目标 agent 是否可解析、runId 是否返回。",
        });
        continue;
      }

      results.push({
        agent: resolved.agent,
        status: "PASS",
        resolvedBase: read.resolvedBase,
        reason: `dbKey OK；${machineCheck.detail}；${readinessCheck.detail}；startAgentRun async accepted`,
      });
    } catch (error) {
      const attempts = Array.isArray((error as any)?.attempts)
        ? formatAgentReadAttempts((error as any).attempts)
        : "";
      results.push({
        agent,
        status: "FAIL",
        reason: `${toErrorMessage(error)}${attempts ? `；${attempts}` : ""}`,
        fix: "确认 server 可访问、认证 token 有效，并检查 agent 是否已同步到目标 server。",
      });
    }
  }

  return results;
}
