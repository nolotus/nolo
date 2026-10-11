import type { MachineHeartbeat } from "connector-experimental/protocol";
import { isRecord } from "core/isRecord";
import { normalizeServerOrigin } from "core/serverOrigin";
import { asTrimmedString } from "core/trimmedString";
import { CORE_DRAIN_REASON } from "core/drainReason";
import { parsePositiveFiniteNumberOrFallback } from "core/positiveFiniteNumberOrFallback";
import type { CliFetchImpl } from "./cliFetch";
import { detectMachineInfo } from "connector-experimental/machineInfo";
import { DEFAULT_NOLO_SERVER_URL } from "./defaultServer";
import {
  type HeartbeatLoopOptions,
  runHeartbeatLoop as defaultRunHeartbeatLoop,
} from "connector-experimental/heartbeatLoop";
import {
  buildMachinePermissionPromptBlock,
  resolveMachineRunPermissionPolicy,
} from "../ai/agent/machineRunPermissions";
import {
  MAX_CONNECTOR_TIMER_DELAY_MS,
  clampConnectorTimerDelayMs,
  resolveConnectorWebSocketTarget,
} from "./connectorWebSocketTarget";
import {
  checkConnectorWorkspaceLinks,
  runMachineDaemonCommand,
} from "./machineDaemonCommands";
import { runMachineHeartbeatConnectCommand } from "./machineHeartbeatCommands";
import { runMachineWatchCommand } from "./machineWatchCommands";
import {
  handleConnectorRunMessage,
  type LocalCliExecutor,
} from "./machineWsRunDispatch";
import {
  createMachineToolInvokeHandlers,
  type MachineToolGrants,
} from "./machineToolInvokeDispatch";
import {
  defaultConnectWebSocket,
  runMachineWsSession,
  type ConnectorWebSocketOptions,
} from "./machineWsSession";
export {
  formatMachineStatus,
  runMachineStatusCommand,
  type MachineSummary,
} from "./machineStatusCommands";

type EnvLike = Record<string, string | undefined>;
type OutputLike = { write(chunk: string): unknown };

// WS 消息 demux：tool.invoke（机器工具路由 v1，只读）优先识别；其余帧
// （agent.run / agent.run.cancel / connector.keepalive 等）原样交给
// handleConnectorRunMessage。send 直接复用会话注入的 sender，回包
// 格式由各自的 handler 决定（tool.invoke → tool.result）。
type MachineWsMessageDemuxHandlers = {
  toolInvoke: {
    handleToolInvokeMessage: (
      message: string,
      send: (message: string) => void
    ) => Promise<string | null>;
  };
};

async function handleMachineWsMessageDemux(
  message: string,
  send: (message: string) => void,
  handlers: MachineWsMessageDemuxHandlers,
  runConnectorMessage: () => Promise<void>
) {
  try {
    const toolResult = await handlers.toolInvoke.handleToolInvokeMessage(message, send);
    if (toolResult !== null) return;
  } catch {
    // tool.invoke 分支自身保证不抛（畸形帧/执行错误都已折算成 tool.result error）；
    // 这里兜底吞掉，绝不让单条消息击穿 WS 会话。
  }
  await runConnectorMessage();
}

// 本机工具授权配置的来源：仅认 env.NOLO_MACHINE_TOOL_GRANTS（JSON 对象）。
// 畸形值（JSON.parse 失败 / 结果不是对象）一律忽略并 warn，不退出——授权是
// 可选叠加项，坏配置不该让 connector 起不来。规范化（逐条校验/丢弃畸形条目）
// 由服务端 parseHandshakeToolGrants 负责，本机只做透传。
//
// 注意两点权衡：
// ① 改授权后需重启 connector 才生效——凭据只在 WS 握手时读一次 env，运行中
//    改环境变量不会热更新；
// ② 该参数会出现在服务端连接日志中（URL 查询参数会进访问/连接日志），
//    属已知权衡：授权配置不是密钥，接受其被记录。
export function readMachineToolGrants(env: EnvLike): Record<string, unknown> | undefined {
  const raw = env.NOLO_MACHINE_TOOL_GRANTS?.trim();
  if (!raw) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.warn(
      `[nolo] NOLO_MACHINE_TOOL_GRANTS is not valid JSON, ignoring it: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return undefined;
  }

  if (!isRecord(parsed)) {
    console.warn("[nolo] NOLO_MACHINE_TOOL_GRANTS must be a JSON object, ignoring it");
    return undefined;
  }

  return parsed;
}

// 把授权配置挂到 WS URL 上。未配置时原样返回入参（保证 URL 与旧行为逐字节
// 一致）；配置存在时走 URL/searchParams 追加，由 searchParams 负责百分号编码
// （不手工拼字符串，避免破坏已有 query、编码错误）。
function appendToolGrantsToWsUrl(
  wsUrl: string,
  grants: Record<string, unknown> | undefined
): string {
  if (!grants) return wsUrl;
  const target = new URL(wsUrl);
  target.searchParams.set("toolGrants", JSON.stringify(grants));
  return target.toString();
}

type MachineCommandDeps = {
  env?: EnvLike;
  output?: OutputLike;
  signal?: AbortSignal;
  cliEntrypointPath?: string;
  maxConnectorAttempts?: number;
  sleep?: (ms: number) => Promise<void>;
  fetchImpl?: CliFetchImpl;
  machineInfo?: () => MachineHeartbeat;
  runHeartbeatLoop?: (options: HeartbeatLoopOptions) => Promise<void>;
  connectWebSocket?: (url: string, options: ConnectorWebSocketOptions) => Promise<void>;
  executeCli?: LocalCliExecutor;
  validateWorkspaceLinks?: (cwd: string) => string[] | Promise<string[]>;
  spawnDaemon?: (args: {
    cmd: string[];
    cwd: string;
    env: EnvLike;
    logPath: string;
  }) => { pid?: number };
};

function resolveServerUrl(env: EnvLike) {
  return normalizeServerOrigin(
    env.NOLO_SERVER || env.BASE_URL || DEFAULT_NOLO_SERVER_URL,
  );
}

function resolveAuthToken(env: EnvLike) {
  return env.AUTH_TOKEN || env.AUTH || "";
}

function writeAuthMissing(output: OutputLike) {
  output.write(
    "[nolo] Machine commands require an auth token. Run `nolo login` or set AUTH_TOKEN.\n"
  );
}

function hasFlag(args: string[], flag: string) {
  return args.includes(flag);
}

function readOption(args: string[], flag: string) {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === flag) {
      const next = args[i + 1];
      if (typeof next === "string" && !next.startsWith("-")) return next;
      return "";
    }
    if (arg.startsWith(flag + "=")) {
      return arg.slice(flag.length + 1);
    }
  }
  return "";
}

function resolveConnectServerUrl(args: string[], env: EnvLike) {
  const fromFlag = readOption(args, "--server-url") || readOption(args, "--server");
  const raw = fromFlag || env.NOLO_SERVER || env.BASE_URL || DEFAULT_NOLO_SERVER_URL;
  return String(raw).replace(/\/+$|\s+$/g, "").replace(/\/+$/g, "").replace(/\s+$/g, "");
}

function resolveConnectAuthToken(args: string[], env: EnvLike) {
  return readOption(args, "--machine-key") || readOption(args, "--token") || resolveAuthToken(env);
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function sleepWithAbort(ms: number, sleep: (ms: number) => Promise<void>, signal?: AbortSignal) {
  if (!signal) {
    await sleep(ms);
    return;
  }
  if (signal.aborted) return;
  await Promise.race([
    sleep(ms),
    new Promise<void>((resolve) => {
      signal.addEventListener("abort", () => resolve(), { once: true });
    }),
  ]);
}

function resolveConnectorReconnectDelayMs(env: EnvLike) {
  const rawValue = env.NOLO_CONNECT_RECONNECT_MS;
  // 未设置/空串必须走默认 5s：`Number("")` 是 0（不是 NaN），旧写法会让「未配置」
  // 落进 `raw >= 0` 分支得到 0ms —— 服务器不可用时变成紧密重连风暴，而注释却
  // 承诺 5000。显式 "0" 仍表示立即重连。
  if (rawValue === undefined || rawValue.trim() === "") return 5_000;
  const raw = Number(rawValue);
  if (!Number.isFinite(raw) || raw < 0) return 5_000;
  // 上界夹取（与其余 connector 定时器 env 同源）：Node/Bun 把 >2^31-1 的 delay
  // 夹到 1ms，超大值会反向变成「立即重连风暴」。0 仍表示立即重连，故只夹上界。
  return Math.min(raw, MAX_CONNECTOR_TIMER_DELAY_MS);
}

// 心跳必须有界（2026-10-XX connector 静默卡死）：裸 fetch 对不响应的服务器
// 永远不 settle，心跳循环的 `await sendHeartbeat()` 就永远挂住，进而把整个
// WS session 连同外层重连循环一起钉死（进程活着、无 socket、不重连）。
// 同时用 AbortSignal 取消底层连接 + Promise.race 兜底：即使 fetchImpl 忽略
// signal（测试 stub / 运行时怪癖），await 也一定在 timeoutMs 内 settle。
const DEFAULT_CONNECTOR_HEARTBEAT_TIMEOUT_MS = 10_000;

export function resolveConnectorHeartbeatTimeoutMs(env: EnvLike) {
  return clampConnectorTimerDelayMs(
    parsePositiveFiniteNumberOrFallback(
      env.NOLO_CONNECT_HEARTBEAT_TIMEOUT_MS,
      DEFAULT_CONNECTOR_HEARTBEAT_TIMEOUT_MS,
    ),
  );
}

export async function postMachineHeartbeat(args: {
  fetchImpl: CliFetchImpl;
  serverUrl: string;
  authToken: string;
  machine: MachineHeartbeat;
  timeoutMs: number;
}): Promise<void> {
  const { fetchImpl, serverUrl, authToken, machine, timeoutMs } = args;
  const controller = new AbortController();
  const startedAt = Date.now();
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(
        new Error(
          `heartbeat timed out after ${Date.now() - startedAt}ms (NOLO_CONNECT_HEARTBEAT_TIMEOUT_MS=${timeoutMs})`,
        ),
      );
    }, timeoutMs);
  });

  try {
    const res = await Promise.race([
      fetchImpl(`${serverUrl}/api/machines/heartbeat`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(machine),
        signal: controller.signal,
      }),
      timeoutPromise,
    ]);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}\n${text}`);
    }
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function defaultExecuteCli(
  provider: string,
  prompt: string,
  options: {
    model?: string;
    timeout?: number;
    cwd?: string;
    yolo?: boolean;
    env?: EnvLike;
    reasoningEffort?: "low" | "medium" | "high" | "xhigh" | "max";
  }
) {
  const { executeCli } = await import("ai/agent/cliExecutor");
  return executeCli(provider as any, prompt, options);
}

function detectLaunchableMachineInfo() {
  return detectMachineInfo({ probeLaunchable: true });
}

function findTaskRowSubjectRef(runtimeContext: any) {
  const subjectRefs = Array.isArray(runtimeContext?.subjectRefs) ? runtimeContext.subjectRefs : [];
  for (const ref of subjectRefs) {
    if (!isRecord(ref)) continue;
    if (ref.kind !== "table-row") continue;
    const id = asTrimmedString(ref.id);
    if (id) return id;
  }
  return "";
}

function buildTaskEvidencePrompt(args: {
  agentKey: string;
  agentConfig: any;
  runtimeContext: any;
}) {
  const rowDbKey = findTaskRowSubjectRef(args.runtimeContext);
  if (!rowDbKey) return "";
  return [
    "--- Nolo task evidence context ---",
    "This CLI runtime does not receive server-side function tools directly.",
    "Use the task row subjectRef and linked dialog evidence as durable task evidence.",
    "Run commands from the repository root. The runner already provides server URL and auth in the environment.",
    "Release boundary: after review passes, AI/reviewer/Codex may advance alpha for verification. Do not merge, push, or release main/release unless the human owner explicitly authorizes it in the current request.",
    "Handoff context: query dialog.subjectRefs first, then inspect dialog checkpoints, artifacts, commits, and test evidence. Treat row activityRefs/latestActivityRef as cache hints, not state truth.",
    "Reviewer autonomy: if you are reviewing and find a concrete fix, you may directly dispatch the rework agent/dialog instead of sending the task back to PM first.",
    "Rework evidence rule: every implementation, review, and rework dialog must preserve the same table-row subjectRef and report any child/rework dialog id it starts.",
    `Read task row: bun packages/cli/index.ts table query --table meta-0e95801d90-01KWSK4Q4TESXQ06SW39JN2TTJ --row ${JSON.stringify(rowDbKey)} --include-activity --output json`,
    `Query linked dialogs: bun packages/cli/index.ts dialog query --row-dbkey ${JSON.stringify(rowDbKey)} --json`,
    "If this run already has a dialog id, exclude it from evidence queries: bun packages/cli/index.ts dialog query --row-dbkey <rowDbKey> --exclude-dialog <currentDialogId> --json",
    "Then read exact dialog traces with: bun packages/cli/index.ts dialog read <dialogId>",
    "Reviewers must end with exactly one line: Review decision: approved | needs_changes | blocked",
    "Report progress, blockers, worktree, branch, commit/diff, tests, and unverified items in the dialog.",
  ].join("\n");
}

function buildConnectorCliPrompt(agentConfig: any, userInput: string, bridgeArgs?: {
  agentKey: string;
  runtimeContext: any;
}, permissionPolicy?: ReturnType<typeof resolveMachineRunPermissionPolicy>) {
  const policy = permissionPolicy ?? resolveMachineRunPermissionPolicy(agentConfig);
  return [
    asTrimmedString(agentConfig?.prompt),
    bridgeArgs ? buildTaskEvidencePrompt({
      agentKey: bridgeArgs.agentKey,
      agentConfig,
      runtimeContext: bridgeArgs.runtimeContext,
    }) : "",
    buildMachinePermissionPromptBlock(policy),
    `--- User task ---\n${userInput}`,
  ].filter(Boolean).join("\n\n");
}

export async function runMachineConnectCommand(
  args: string[],
  deps: MachineCommandDeps = {}
) {
  const env = deps.env ?? process.env;
  const output = deps.output ?? process.stdout;
  const authToken = resolveConnectAuthToken(args, env);
  if (!authToken) {
    writeAuthMissing(output);
    return 1;
  }

  const serverUrl = resolveConnectServerUrl(args, env);
  const fetchImpl = deps.fetchImpl ?? fetch;

  if (hasFlag(args, "--daemon") || hasFlag(args, "--background")) {
    return runMachineDaemonCommand({
      env,
      output,
      cliEntrypointPath: deps.cliEntrypointPath,
      validateWorkspaceLinks: deps.validateWorkspaceLinks,
      spawnDaemon: deps.spawnDaemon,
    });
  }

  const machine = (deps.machineInfo ?? detectLaunchableMachineInfo)();
  const sendHeartbeat = () =>
    postMachineHeartbeat({
      fetchImpl,
      serverUrl,
      authToken,
      machine,
      timeoutMs: resolveConnectorHeartbeatTimeoutMs(env),
    });

  if (hasFlag(args, "--ws")) {
    const validateWorkspaceLinks = deps.validateWorkspaceLinks ?? (() => []);
    if (!(await checkConnectorWorkspaceLinks(process.cwd(), output, validateWorkspaceLinks))) {
      return 1;
    }
    const maxAttempts = deps.maxConnectorAttempts ?? Infinity;
    const sleep = deps.sleep ?? defaultSleep;
    const reconnectDelayMs = resolveConnectorReconnectDelayMs(env);
    // 本机工具授权配置在本次 connector 启动时定一次（改 env 需重启 connector）。
    const toolGrants = readMachineToolGrants(env);
    // 机器工具路由 v1（只读）：executors 按 daemon 进程建一次（刻意跨 WS
    // 重连存活）；机器路由不挂 readFile 去重 ledger，跨 server 会话重读
    // 文件始终返回真实内容（M3 隔离）。workspaceRoot = daemon 进程 cwd
    // （用户运行 nolo connect 的目录）。
    const toolInvokeHandlers = createMachineToolInvokeHandlers({
      workspaceRoot: process.cwd(),
      // M2 修复：机器侧授权复核与握手上报共用同一来源——本次 `deps.env ??
      // process.env`。grants 快照与 WS URL 上报的那份逐字节相同；未配置时也
      // 显式传 env，工厂不再回落到 process.env（调用方经 deps.env 注入环境时
      // 两端曾不一致）。
      env,
      ...(toolGrants ? { grants: toolGrants as MachineToolGrants } : {}),
    });
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      if (deps.signal?.aborted) {
        return 0;
      }
      const runtimeServerUrl =
        env.NOLO_CONNECT_RUNTIME_SERVER_URL ||
        env.NOLO_RUNTIME_SERVER_URL ||
        serverUrl;
      const sessionResult = await runMachineWsSession({
        env,
        output,
        signal: deps.signal,
        machine,
        sendHeartbeat,
        runHeartbeatLoop: deps.runHeartbeatLoop ?? defaultRunHeartbeatLoop,
        connectWebSocket: deps.connectWebSocket ?? defaultConnectWebSocket,
        serverUrl,
        authToken,
        resolveConnectorWebSocketTarget: async (options) =>
          appendToolGrantsToWsUrl(
            await resolveConnectorWebSocketTarget({
              ...options,
              fetchImpl,
            }),
            toolGrants
          ),
        onMessage: (message, send) =>
          handleMachineWsMessageDemux(
            message,
            send,
            { toolInvoke: toolInvokeHandlers },
            () =>
              handleConnectorRunMessage(
                message,
                send,
                deps.executeCli ?? defaultExecuteCli,
                {
                  ...env,
                  NOLO_SERVER: runtimeServerUrl,
                  NOLO_SERVER_URL: runtimeServerUrl,
                  BASE_URL: runtimeServerUrl,
                  AUTH_TOKEN: authToken,
                  NOLO_MACHINE_API_KEY: authToken,
                },
                fetchImpl,
                {
                  buildConnectorCliPrompt,
                }
              )
          ),
      });
      const exitCode = sessionResult.exitCode;
      if (exitCode === 2) return 1;
      if (deps.signal?.aborted) {
        return 0;
      }
      if (attempt >= maxAttempts) return exitCode;
      // 服务端 Retry-After 同样可能超大：与本地 env 同一上界夹取，避免
      // setTimeout 把超大 delay 夹到 1ms 反成热循环重连。
      const retryDelayMs = Math.min(
        sessionResult.retryAfterMs ?? reconnectDelayMs,
        MAX_CONNECTOR_TIMER_DELAY_MS
      );
      const reconnectContext =
        sessionResult.reconnectReason === CORE_DRAIN_REASON ? " during core draining" : "";
      output.write(
        `[nolo] Connector websocket disconnected${reconnectContext}. Reconnecting in ${retryDelayMs}ms.\n`
      );
      await sleepWithAbort(retryDelayMs, sleep, deps.signal);
    }
    return 0;
  }

  if (hasFlag(args, "--watch")) {
    return runMachineWatchCommand({
      env,
      output,
      machine,
      sendHeartbeat,
      runHeartbeatLoop: deps.runHeartbeatLoop ?? defaultRunHeartbeatLoop,
    });
  }

  return runMachineHeartbeatConnectCommand({
    output,
    machine,
    sendHeartbeat,
  });
}

