// packages/cli/client/localInstaboxWorkload.ts
//
// CLI 本地 run 的 instabox workload 通道：`runtimeKey="instabox"` 时，
// 本 run 的命令调用（execShell）通过 Instabox 云容器执行后端完成。
//
// 契约（本仓不变式「硬需求不满足必须显式 degraded，绝不静默落宿主」）：
//   - 能兑现 → 返回 handle；execShell 走 instabox executionChannel；
//   - 文件工具无沙盒 bridge → 显式拒绝，绝不回落到宿主工具执行；
//   - 凭据缺失 / 沙盒创建失败 → 抛错并在 run 开始前显式失败，给出可操作提示。

import {
  asExecutionBackend,
  buildInstaboxMachineName,
  createInstaboxExecutionBackend,
  INSTABOX_BACKEND_ID,
  type InstaboxBackendOptions,
} from "../../agent-runtime/instaboxBackend";
import {
  resolveInstaboxCreationContract,
  type InstaboxBillingPolicy,
  type InstaboxContractProbe,
  type InstaboxHttpFetch,
} from "../../agent-runtime/instaboxQuota";
import type {
  ExecutionBackend,
  ExecutionLease,
  ExecutionTicket,
} from "../../agent-runtime/executionBackend";
import {
  createExecutionChannel,
  EXECUTION_SHELL_TOOL,
} from "../../agent-runtime/executionChannel";
import {
  buildInstaboxBridgeBootstrapScript,
  buildInstaboxBridgeProbeRequest,
  buildInstaboxToolArgv,
  describeInstaboxBridgeUnavailable,
  INSTABOX_FILE_TOOL_NAMES,
  INSTABOX_WORKSPACE_ROOT,
  INSTABOX_HELPER_PATH,
  parseInstaboxBootstrapOutput,
  readInstaboxProbeResult,
  type InstaboxBridgeProbe,
} from "./localInstaboxFileBridge";
import { parseToolOutput } from "../../agent-runtime/docker/sandboxWorkspaceHelper";
import type { ExecutionRequest } from "../../agent-runtime/executionBackend";
import { LocalRuntimeKeyUnsupportedError } from "./localDockerWorkload";

import { deliverInstaboxWorkspace, validateInstaboxWorkspaceSelection, type InstaboxWorkspaceSelection, type InstaboxWorkspaceDelivery } from "./localInstaboxWorkspaceDelivery";

import {
  captureInstaboxBaseline,
  recoverInstaboxWorkspace,
  type InstaboxRecoveryPolicy,
  type InstaboxRecoveryReceipt,
  type InstaboxWorkspaceBaseline,
} from "./localInstaboxWorkspaceRecovery";

function sanitizeReleaseError(error: unknown): Error {
  const raw = error instanceof Error ? error.message : String(error);
  const sanitized = raw
    .replace(/(?:api[_-]?key|bearer|token|password|secret)[=:\s]+[A-Za-z0-9_\-\.]{8,}/gi, "[REDACTED]")
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, "[REDACTED]")
    .slice(0, 500);
  const safe = new Error(sanitized);
  if (error instanceof Error) {
    safe.name = error.name;
    if ((error as any).code) (safe as any).code = (error as any).code;
    if ((error as any).cleanupPending !== undefined) (safe as any).cleanupPending = (error as any).cleanupPending;
  }
  return safe;
}

export const LOCAL_INSTABOX_BACKEND_ID = INSTABOX_BACKEND_ID;

/** 解析本机 Instabox API Key：支持 INSTABOX_API_KEY 与 nolo secret 注入的 INSTABOX。 */
export function resolveInstaboxApiKey(
  env: Record<string, string | undefined>,
): string | null {
  const direct = env.INSTABOX_API_KEY?.trim();
  if (direct) return direct;
  const fromSecret = env.INSTABOX?.trim();
  if (fromSecret) return fromSecret;
  return null;
}

const instaboxFailureHint =
  "请确认 INSTABOX_API_KEY 已设置（或通过 `nolo secret run --with instabox` 注入 INSTABOX 环境变量）；" +
  "instabox 凭据缺失时已显式拒绝，绝不回落宿主。";

/** run 开跑前的 fail-closed 闸门：凭据缺失立即显式失败。 */
export function assertInstaboxPrerequisites(
  env: Record<string, string | undefined>,
): string {
  const apiKey = resolveInstaboxApiKey(env);
  if (!apiKey) {
    throw new LocalRuntimeKeyUnsupportedError(
      "instabox_credential_missing",
      `runtimeKey 指向 instabox，但本机没有可用的 Instabox API Key。${instaboxFailureHint}`,
    );
  }
  return apiKey;
}

/**
 * 本 run 钉住的**唯一**固定工作目录：容器内 shell cwd 与 helper ROOT 都是它，
 * ticket 的 readable/writable roots 也声明它。不可写 → bridge 如实未就绪，
 * 不做多候选回退（否则 ticket 声明与真实 cwd 会各写一处）。
 */
export function resolveInstaboxWorkspaceRoot(
  env: Record<string, string | undefined>,
): string {
  const override = env.INSTABOX_WORKSPACE_ROOT?.trim();
  if (override && override.startsWith("/") && !override.includes("\"")) return override;
  return INSTABOX_WORKSPACE_ROOT;
}

function posixQuote(value: string): string {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

/**
 * 同一 lease 内的一次性 bootstrap：定下固定工作目录、探测运行时、上传 helper，
 * 再用 helper 真读一次本次专属探针文件。只有探针读通才算 ready。
 *
 * 失败语义：**基础设施失败直接抛**（由调用方释放 lease 并显式失败），
 * 「能力缺失」（无运行时 / 目录不可写）返回未就绪——机器是好的，不必释放。
 */
async function prepareFileBridge(
  execDirect: (request: ExecutionRequest) => Promise<string>,
  root: string,
  probeId: string,
): Promise<InstaboxBridgeProbe> {
  const bootstrapStdout = await execDirect({
    kind: "command",
    argv: ["bash", "-lc", buildInstaboxBridgeBootstrapScript(root, probeId)],
  });

  const parsed = parseInstaboxBootstrapOutput(bootstrapStdout);
  if (!parsed.root || !parsed.runtime || !parsed.probePath || parsed.reason) {
    return {
      root: parsed.root,
      runtime: parsed.runtime,
      ready: false,
      reason: parsed.reason ?? "probe_failed",
    };
  }

  const pinned = { root: parsed.root, runtime: parsed.runtime };
  const probeStdout = await execDirect(
    buildInstaboxBridgeProbeRequest(pinned, parsed.probePath),
  );
  const verdict = readInstaboxProbeResult(probeStdout);
  // 探针文件是本 run 自己创建的专属文件（名字带 runId），读完**不删除**：
  // 通用代码无权断言「同名文件一定是我写的」，机器随 lease 结束即销毁。
  return verdict.ready
    ? { root: pinned.root, runtime: pinned.runtime, ready: true, probeId, probePath: parsed.probePath }
    : { root: pinned.root, runtime: pinned.runtime, ready: false, reason: verdict.reason ?? "probe_failed", probeId, probePath: parsed.probePath };
}

export type LocalInstaboxWorkloadHandle = {
  backendId: string;
  runId: string;
  /** grant/channel 校验的 tool channel；拒绝时以 deny JSON 或抛错表达，无宿主回落。 */
  channel: (
    toolName: string,
    args: Record<string, unknown>,
    signal?: AbortSignal,
  ) => Promise<string>;
  /** 同一 lease 内的**固定工作目录**（shell 与文件工具共用）；null = 未建成。 */
  workspaceRoot: string | null;
  /** 文件工具 bridge 的真实就绪状态；未就绪时文件工具显式拒绝。 */
  fileBridge: InstaboxBridgeProbe;
  workspaceDelivery: InstaboxWorkspaceDelivery;
  workspaceBaseline: InstaboxWorkspaceBaseline | null;
  readonly recoveryReceipt: InstaboxRecoveryReceipt | null;
  readonly cleanupState: string;
  release: () => Promise<void>;
};

export type InstaboxOrgTier = "free" | "pro" | "team" | "enterprise" | string;

/**
 * 解析默认模板：
 * 优先级：显式 args.templateId > args.env.INSTABOX_TEMPLATE_ID 覆盖 > 组织分层默认。
 * 组织分层默认：免费组织默认 "agent-browser"，付费组织默认 "universal"；
 * 若无法确定组织层级（undefined / unknown），沿用现有默认 "universal"。
 */
export function resolveInstaboxTemplateId(options: {
  templateId?: string;
  env?: Record<string, string | undefined>;
  orgTier?: InstaboxOrgTier;
}): string {
  const explicit = options.templateId?.trim();
  if (explicit) return explicit;
  const envOverride = options.env?.INSTABOX_TEMPLATE_ID?.trim();
  if (envOverride) return envOverride;
  const tier = options.orgTier?.trim().toLowerCase();
  if (tier === "free") {
    return "agent-browser";
  }
  if (tier === "pro" || tier === "team" || tier === "enterprise" || tier === "paid") {
    return "universal";
  }
  // 无法确定组织层级：落到免费层可用的模板。反向（默认 universal）在免费组织
  // 上必然 template_not_allowed（2026-10-24 真机实测 403），而 agent-browser
  // 在付费层同样可用；真要换模板由 INSTABOX_TEMPLATE_ID 显式覆盖。
  return "agent-browser";
}

export type CreateLocalInstaboxWorkloadArgs = {
  runtimeKey: string;
  runId: string;
  authenticatedCaller: string;
  agentKey: string;
  env: Record<string, string | undefined>;
  signal?: AbortSignal;
  /** 测试注入：跳过真实 Instabox HTTP 通信。 */
  backend?: ExecutionBackend;
  templateId?: string;
  /** 组织层级：free / pro / team / enterprise 等。若无法确定则为 undefined。 */
  orgTier?: InstaboxOrgTier;
  /** Explicit authority-approved manifest only; omitted means no host reads or delivery. */
  workspaceSelection?: InstaboxWorkspaceSelection;
  workspaceRecovery?: InstaboxRecoveryPolicy;
  /** Explicit caller authorization for destructive backend release, after verified recovery. */
  allowRemoteRelease?: boolean;
  /** 计费策略授权（用户显式允许付费）。层级证据只来自官方 API，不来自这里。 */
  billingPolicy?: InstaboxBillingPolicy;
  /** 测试注入：替换官方创建合同探针（零真实网络）。 */
  contractProbe?: InstaboxContractProbe;
  /** 测试注入：替换后端工厂（用于断言 plan / billingPolicy 真的传到了后端）。 */
  backendFactory?: (options: InstaboxBackendOptions) => ExecutionBackend;
  /** 测试注入：官方探针用的 fetch。 */
  fetchFn?: InstaboxHttpFetch;
};

/**
 * 创建（并持有）本 run 的 instabox workload。
 * 凭据缺失或创建失败直接抛错（fail-closed），调用方在 run 开始前显式失败。
 */
export async function createLocalInstaboxWorkload(
  args: CreateLocalInstaboxWorkloadArgs,
): Promise<LocalInstaboxWorkloadHandle> {
  if (args.runtimeKey.trim() !== "instabox") {
    throw new LocalRuntimeKeyUnsupportedError(
      "local_runtime_key_not_instabox",
      `createLocalInstaboxWorkload 只接受 instabox runtimeKey，收到 "${args.runtimeKey}"。`,
    );
  }

  validateInstaboxWorkspaceSelection(args.workspaceSelection);

  // 凭据与额度 fail-closed
  const apiKey = assertInstaboxPrerequisites(args.env);

  const templateId = resolveInstaboxTemplateId({
    templateId: args.templateId,
    env: args.env,
    orgTier: args.orgTier,
  });

  // 计费闸门：生产建机路径必须先拿到官方探针产出的创建合同
  // （plan + 自由组织证据），拿不到就 fail-closed —— 零建机请求，
  // 绝不回落 legacy 无 plan 分支。
  let backend: ExecutionBackend;
  if (args.backend) {
    backend = args.backend;
  } else {
    const probe = await (args.contractProbe ?? resolveInstaboxCreationContract)(apiKey, {
      billingPolicy: args.billingPolicy ?? "free-only",
      templateId,
      machineName: buildInstaboxMachineName(
        `ticket-${args.runId}`,
        args.agentKey || "instabox-agent",
      ),
      ...(args.fetchFn ? { fetchFn: args.fetchFn } : {}),
    });
    if (!probe.ok || !probe.contract) {
      throw new LocalRuntimeKeyUnsupportedError(
        "instabox_creation_contract_unavailable",
        `instabox 创建合同不可用，已拒绝建机（未发出任何建机请求）：${
          probe.missingEvidence.join(", ") || probe.error || "unknown"
        }。`,
      );
    }
    const { plan, freeOrgObservation } = probe.contract;
    const factory =
      args.backendFactory ??
      ((options: InstaboxBackendOptions) =>
        asExecutionBackend(createInstaboxExecutionBackend(options)));
    backend = factory({
      apiKey,
      templateId: plan.templateId,
      creationPlan: plan,
      freeOrgObservation,
      billingPolicy: probe.billingPolicy,
    });
  }

  const workspaceRoot = resolveInstaboxWorkspaceRoot(args.env);

  const ticket: ExecutionTicket = {
    version: 1,
    ticketId: `ticket-${args.runId}`,
    grantId: `grant-${args.runId}`,
    issuedAt: Date.now(),
    agentKey: args.agentKey || "instabox-agent",
    callerUserId: args.authenticatedCaller || "local-caller",
    executionClass: "session",
    target: { kind: "server" },
    // 本 workload 真的会执行这些工具（shell + 容器内结构化文件工具），授权声明必须一致
    toolNames: [EXECUTION_SHELL_TOOL, ...INSTABOX_FILE_TOOL_NAMES],
    filesystem: {
      // 钉住的固定工作目录：读写范围都声明成它，不写 "none" 再偷偷写文件
      readScope: "configured-roots",
      readableRoots: [workspaceRoot],
      writeScope: "configured-roots",
      writableRoots: [workspaceRoot],
    },
    shellAllowed: true,
    requestedIsolation: "container",
    maxRunSeconds: 10 * 60,
  };

  let lease: ExecutionLease;
  try {
    lease = await backend.prepare(ticket);
  } catch (error) {
    const rawMsg = error instanceof Error ? error.message : String(error);
    const fields = error !== null && typeof error === "object"
      ? error as { code?: unknown; cleanupPending?: unknown; machineId?: unknown; upstreamErrorCode?: unknown }
      : {};
    const hintNeeded =
      !rawMsg.includes("免费层仅允许 agent-browser 或快照") &&
      (rawMsg.includes("template_not_allowed") ||
        [fields.code, fields.upstreamErrorCode].some(code => typeof code === "string" && code.includes("template")));
    const hint = hintNeeded ? "（免费层仅允许 agent-browser 或快照）" : "";
    throw Object.assign(new LocalRuntimeKeyUnsupportedError(
      typeof fields.code === "string" ? fields.code : "instabox_workload_unavailable",
      `runtimeKey 指向 instabox，但云沙盒初始化失败：${rawMsg}${hint ? ` ${hint}` : ""}。${instaboxFailureHint}`,
    ), {
      cleanupPending: fields.cleanupPending,
      machineId: fields.machineId,
      upstreamErrorCode: fields.upstreamErrorCode,
      cause: error,
    });
  }

  /**
   * 释放状态机：active → releasing → released | cleanup_pending。
   *
   * `cleanup_pending` 是**不可回退到 active** 的终态之一：release 失败意味着云端
   * 机器是否还在未知，lease 已不可信，工具面必须继续拒绝（否则失败后仍放行 =
   * 静默在不可信 lease 上执行）。但 release 本身允许重试，成功后转 released。
   */
  let releaseState: "active" | "releasing" | "released" | "cleanup_pending" =
    "active";
  let releasePromise: Promise<void> | null = null;

  /**
   * 并发调用共享同一释放动作（只发起一次 backend.release）；promise 仅在本次
   * 释放结束后清空，成功路径幂等（已 released → 立即 resolve），失败路径落到
   * cleanup_pending 并允许下次重试。同步 throw 也一并收进状态机：backend.release
   * 的调用点用 try/catch 包住并转成 rejected promise，避免同步异常把状态永远停在
   * releasing（既不放行也不可重试）。
   */
  let recoveryReceipt: InstaboxRecoveryReceipt | null = null;
  let activeExecutions = 0;
  const releaseBackend = (): Promise<void> => {
    if (releaseState === "released") return Promise.resolve();
    if (releasePromise) return releasePromise;
    releaseState = "releasing";
    let attempt: Promise<unknown>;
    try {
      // 同步 throw 也必须进状态机：转成 rejected promise，否则状态停在 releasing。
      attempt = (async () => {
        if (!args.allowRemoteRelease || activeExecutions > 0) {
          throw Object.assign(new Error("instabox cleanup_pending: explicit release approval required or tools still running"), { code: "instabox_cleanup_pending", cleanupPending: true, leaseId: lease.leaseId });
        }
        recoveryReceipt = await recoverInstaboxWorkspace({
          root: workspaceRoot,
          runtime: bridge?.runtime ?? "node",
          delivery: workspaceDelivery ?? { workspaceMode: "empty", manifest: null, manifestSha256: null, approvalId: null, baseSha: null, remoteGitHistory: false },
          baseline: workspaceBaseline,
          policy: args.workspaceRecovery,
          exec: execDirect,
          runId: args.runId,
          probeId: bridge?.probeId ?? args.runId,
        });
        await backend.release(lease, "completed");
      })();
    } catch (error) {
      attempt = Promise.reject(error);
    }
    releasePromise = attempt
      .then(
        () => {
          releaseState = "released";
        },
        (error) => {
          releaseState = "cleanup_pending";
          const cause = sanitizeReleaseError(error);
          throw Object.assign(
            new Error(`instabox cleanup_pending: recovery or release unconfirmed: ${cause.message}`, { cause }),
            { code: "instabox_cleanup_pending", cleanupPending: true, leaseId: lease.leaseId, cause },
          );
        },
      )
      .finally(() => {
        releasePromise = null;
      });
    return releasePromise;
  };

  // 同一 lease 内的直接执行（bootstrap / 探针用）：不经 model-facing channel，
  // 失败直接抛，避免把基础设施故障伪装成工具结果。
  const execDirect = async (request: ExecutionRequest): Promise<string> => {
    const result = await backend.execute(lease, request);
    const streams = result.output as { stdout?: unknown; stderr?: unknown } | undefined;
    const stdout = typeof streams?.stdout === "string" ? streams.stdout : "";
    const stderr = typeof streams?.stderr === "string" ? streams.stderr : "";
    if (result.ok === false) {
      throw new Error(`instabox 容器内执行失败：${stderr || `exit_code:${result.exitCode ?? "unknown"}`}`);
    }
    return stdout;
  };

  // bootstrap 只做一次（同一 lease），不按工具重建机器。
  let bridge!: InstaboxBridgeProbe;
  let workspaceDelivery!: InstaboxWorkspaceDelivery;
  let workspaceBaseline: InstaboxWorkspaceBaseline | null = null;
  try {
    bridge = await prepareFileBridge(execDirect, workspaceRoot, args.runId);
    if (args.workspaceSelection && (!bridge.ready || !bridge.root || !bridge.runtime)) {
      throw new Error("instabox_workspace_delivery:bridge_not_ready");
    }
    workspaceDelivery = await deliverInstaboxWorkspace({
      selection: args.workspaceSelection, root: bridge.root ?? workspaceRoot,
      runtime: bridge.runtime ?? "node", exec: execDirect,
    });
    if (bridge.ready && bridge.root && bridge.runtime) {
      workspaceBaseline = await captureInstaboxBaseline({
        root: bridge.root,
        runtime: bridge.runtime,
        exec: execDirect,
      });
    }
  } catch (error) {
    // Bootstrap/delivery/baseline may have written unique bytes. Never delete on this error path.
    releaseState = "cleanup_pending";
    const cause = error instanceof Error ? error : new Error(String(error));
    throw Object.assign(new Error(`instabox bootstrap/delivery/baseline failed; cleanup_pending; lease retained: ${cause.message}`, { cause }), {
      code: "instabox_cleanup_pending", cleanupPending: true, leaseId: lease.leaseId,
      retryCleanup: releaseBackend,
    });
  }

  const rawChannel = createExecutionChannel({
    backend,
    lease,
    timeoutMs: 10 * 60 * 1000,
    ...(bridge.ready && bridge.root && bridge.runtime
      ? {
          helper: {
            path: INSTABOX_HELPER_PATH,
            buildArgv: (toolName: string, toolArgs: Record<string, unknown>) =>
              buildInstaboxToolArgv(toolName, toolArgs, {
                root: bridge.root as string,
                runtime: bridge.runtime as "bun" | "node",
              }),
          },
        }
      : {}),
  });

  const release = async () => {
    await releaseBackend();
  };

  const channelInternal = async (
    toolName: string,
    toolArgs: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<string> => {
    if (releaseState !== "active") {
      throw new Error(
        releaseState === "cleanup_pending"
          ? "instabox workload cleanup_pending：上一次清理未确认，lease 状态不可信，拒绝执行工具"
          : "instabox workload 已释放：本 run 的 lease 已失效，拒绝在宿主执行工具",
      );
    }
    if (toolName === "execShell") {
      // shell 与文件工具共用同一个固定工作目录：否则 cat 与 readFile 各看一处。
      const command = typeof toolArgs.command === "string" ? toolArgs.command : undefined;
      if (bridge.root && command !== undefined) {
        return await rawChannel(EXECUTION_SHELL_TOOL, {
          ...toolArgs,
          command: `cd ${posixQuote(bridge.root)} && ${command}`,
        }, signal);
      }
      return await rawChannel(EXECUTION_SHELL_TOOL, toolArgs, signal);
    }
    if ((INSTABOX_FILE_TOOL_NAMES as readonly string[]).includes(toolName)) {
      if (!bridge.ready) {
        // 显式拒绝：无 helper bridge 时绝不回落宿主工具执行。
        throw new Error(describeInstaboxBridgeUnavailable(bridge));
      }
      const output = await rawChannel(toolName, toolArgs, signal);
      const parsed = parseToolOutput(output);
      if (!parsed.ok) {
        return JSON.stringify({ ok: false, error: parsed.error, workloadLocation: "instabox" });
      }
      const value = parsed.value;
      const payload =
        typeof value === "object" && value !== null
          ? { ok: true, ...value, value, workloadLocation: "instabox" }
          : { ok: true, value, workloadLocation: "instabox" };
      return JSON.stringify(payload);
    }
    // 其余工具（grepFiles 等）不在本块范围：显式拒绝，绝不回落宿主
    throw new Error(
      `instabox workload 暂不支持工具 "${toolName}"（本块只桥接 readFile/writeFile/editFile/globFiles）；` +
        `拒绝在宿主执行。`,
    );
  };

  return {
    backendId: LOCAL_INSTABOX_BACKEND_ID,
    runId: args.runId,
    channel: async (name, input, signal) => {
      activeExecutions++;
      try { return await channelInternal(name, input, signal); }
      finally { activeExecutions--; }
    },
    workspaceRoot: bridge.root,
    fileBridge: bridge,
    workspaceDelivery,
    workspaceBaseline,
    get recoveryReceipt() { return recoveryReceipt; },
    get cleanupState() { return releaseState; },
    release,
  };
}
