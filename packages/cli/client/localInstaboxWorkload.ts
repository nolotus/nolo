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

export type LocalInstaboxWorkloadHandle = {
  backendId: string;
  runId: string;
  /** grant/channel 校验的 tool channel；拒绝时以 deny JSON 或抛错表达，无宿主回落。 */
  channel: (
    toolName: string,
    args: Record<string, unknown>,
    signal?: AbortSignal,
  ) => Promise<string>;
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

  const ticket: ExecutionTicket = {
    version: 1,
    ticketId: `ticket-${args.runId}`,
    grantId: `grant-${args.runId}`,
    issuedAt: Date.now(),
    agentKey: args.agentKey || "instabox-agent",
    callerUserId: args.authenticatedCaller || "local-caller",
    executionClass: "session",
    target: { kind: "server" },
    toolNames: [EXECUTION_SHELL_TOOL],
    filesystem: {
      readScope: "none",
      readableRoots: [],
      writeScope: "none",
      writableRoots: [],
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

  const rawChannel = createExecutionChannel({
    backend,
    lease,
    timeoutMs: 10 * 60 * 1000,
  });
  let released = false;

  const release = async () => {
    if (released) return;
    released = true;
    try {
      await backend.release(lease, "completed");
    } catch {
      // release 结算已记录或由 backend 抛 cleanup_pending，静默避免掩盖主任务结果
    }
  };

  const channel = async (
    toolName: string,
    toolArgs: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<string> => {
    if (released) {
      throw new Error(
        "instabox workload 已释放：本 run 的 lease 已失效，拒绝在宿主执行工具",
      );
    }
    if (toolName === "execShell") {
      return await rawChannel(EXECUTION_SHELL_TOOL, toolArgs, signal);
    }
    // Instabox 容器无工作区文件 helper bridge：文件工具必须显式拒绝，绝不回落宿主
    throw new Error(
      `instabox workload 暂无文件工具 bridge（仅支持 execShell 远程命令）；` +
        `工具 "${toolName}" 拒绝在宿主执行。`,
    );
  };

  return {
    backendId: LOCAL_INSTABOX_BACKEND_ID,
    runId: args.runId,
    channel,
    release,
  };
}
