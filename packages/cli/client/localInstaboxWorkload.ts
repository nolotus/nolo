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
  createInstaboxExecutionBackend,
  INSTABOX_BACKEND_ID,
} from "../../agent-runtime/instaboxBackend";
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
    ? { root: pinned.root, runtime: pinned.runtime, ready: true }
    : { root: pinned.root, runtime: pinned.runtime, ready: false, reason: verdict.reason ?? "probe_failed" };
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
  release: () => Promise<void>;
};

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

  // 凭据与额度 fail-closed
  const apiKey = assertInstaboxPrerequisites(args.env);

  const backend: ExecutionBackend =
    args.backend ??
    asExecutionBackend(
      createInstaboxExecutionBackend({
        apiKey,
        templateId:
          args.templateId ??
          args.env.INSTABOX_TEMPLATE_ID?.trim() ??
          "universal",
      }),
    );

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
    throw new LocalRuntimeKeyUnsupportedError(
      "instabox_workload_unavailable",
      `runtimeKey 指向 instabox，但云沙盒初始化失败：${
        error instanceof Error ? error.message : String(error)
      }。${instaboxFailureHint}`,
    );
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
  const releaseBackend = (): Promise<void> => {
    if (releaseState === "released") return Promise.resolve();
    if (releasePromise) return releasePromise;
    releaseState = "releasing";
    let attempt: Promise<unknown>;
    try {
      // 同步 throw 也必须进状态机：转成 rejected promise，否则状态停在 releasing。
      attempt = Promise.resolve(backend.release(lease, "completed"));
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
          throw error;
        },
      )
      .finally(() => {
        releasePromise = null;
      });
    return releasePromise;
  };

  /** release 失败的证据文案：区分「真的清理不了」与「只是没输赢」。 */
  const describeReleaseFailure = (error: unknown): string => {
    const record = error as { cleanupPending?: unknown; code?: unknown } | null;
    const cleanupPending =
      record?.cleanupPending === true || record?.code === "instabox_cleanup_pending";
    const detail = error instanceof Error ? error.message : String(error);
    return cleanupPending
      ? `且机器删除未确认：cleanup_pending（${detail}）——云端可能仍有存活机器，不得当作已清理，需人工核对后删除`
      : `且 release 也失败（${detail}）`;
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
  let bridge: InstaboxBridgeProbe;
  try {
    bridge = await prepareFileBridge(execDirect, workspaceRoot, args.runId);
  } catch (error) {
    // 拿到 lease 之后失败：必须在这里收尾，绝不留下一台没人释放的机器。
    let cleanupNote = "本次 lease 已释放";
    try {
      await releaseBackend();
    } catch (releaseError) {
      cleanupNote = describeReleaseFailure(releaseError);
    }
    throw new LocalRuntimeKeyUnsupportedError(
      "instabox_bridge_bootstrap_failed",
      `runtimeKey 指向 instabox，但容器内文件工具桥 bootstrap 失败：${
        error instanceof Error ? error.message : String(error)
      }；${cleanupNote}。${instaboxFailureHint}`,
    );
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

  const channel = async (
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
    channel,
    workspaceRoot: bridge.root,
    fileBridge: bridge,
    release,
  };
}
