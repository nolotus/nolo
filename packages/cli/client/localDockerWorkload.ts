// packages/cli/client/localDockerWorkload.ts
//
// CLI 本地 run 的 docker workload 通道：`runtimeKey` 指向 docker 时，本 run 的
// 工作区工具调用（execShell / readFile / writeFile / editFile / globFiles /
// grepFiles）不再跑在宿主，而是走 sbx 云沙盒。
//
// 复用（不重写）服务端既有实现：
//   - `DockerWorkloadLifecycle`（dockerWorkloadLifecycle.ts）：绑定授权、每账户
//     配额、create/release、`stop` 未确认 → `cleanup_pending` 的语义全部沿用；
//   - `createDockerToolChannel`（dockerToolRouting.ts）：grant 校验的
//     model-facing channel；
//   - `createProductionDockerAccountResolver` / `defaultProductionDockerQuotaProvider`
//     （服务端 run 通道同一个 resolver，懒加载以免把服务端引导拉进每次 CLI 启动）。
//
// 失败契约（本仓不变式「硬需求不满足必须显式 degraded，绝不静默落宿主」）：
//   - 能兑现 → 返回 handle；工具调用只走 `channel`（永不返回 null）；
//   - 无法兑现（无绑定 / 账户未授权 / 沙盒创建失败）→ 抛错，调用方在 run 开始前
//     显式失败并给出可操作提示；**绝不**回落到宿主工具执行。
//
// 沙盒释放语义：`release()` 只解除 body 阻塞，真正的 `backend.release` +
// `stopAndConfirm` 仍由 lifecycle 的 finally 执行（失败即保留 cleanup_pending）。

import type { AgentRunGrant } from "agent-runtime";
import type { DockerQuotaKvStore } from "agent-runtime/dockerQuotaStore";
import type {
  DockerSandboxExecutionBackendDeps,
  DockerSandboxQuotaProvider,
} from "agent-runtime/dockerSandboxExecutionBackend";
import type {
  DockerAccountBinding,
  DockerWorkloadRuntime,
} from "agent-runtime/docker/workloadLifecycle";
import { buildSandboxHelperUploadArgv, SANDBOX_WORKSPACE_ROOT } from "agent-runtime/docker/sandboxWorkspaceHelper";
import { buildInstallGitArgv } from "agent-runtime/docker/sandboxWorkspaceDelivery";
import {
  applyDockerWorkspaceDelivery,
  isDockerWorkspaceDeliveryError,
  type DockerWorkspaceInitSelection,
} from "agent-runtime/docker/applyDockerWorkspaceDelivery";
import {
  prepareHostWorkspaceDelivery,
  type HostWorkspaceDeliveryPreparation,
  type HostWorkspaceDeliveryRequest,
} from "./localWorkspaceArchive";
import {
  createDockerToolChannel,
  dockerExecutionToolNames,
  type DockerToolChannel,
  type DockerWorkload,
} from "agent-runtime/docker/toolRouting";

/** 与 `DOCKER_SANDBOX_BACKEND_ID` 一致；本模块不直接依赖 backend 实现。 */
export const LOCAL_DOCKER_BACKEND_ID = "docker-sandbox-cloud";

import {
  isDockerRuntimeKey as isDockerRuntimeKeyFromCapability,
  resolveCliLocalRuntimeKeyCapability,
} from "../../ai/tools/agent/cliLocalRuntimeCapability";

/** 云后端 runtimeKey 的本地不可兑现说明（可操作提示，逐字用于报错）。 */
export const LOCAL_CLOUD_RUNTIME_KEY_HINT =
  "该 runtimeKey 指向云后端，只能由服务端 run 通道执行（本机 CLI 本地 run 无法兑现）。" +
  "请改用服务端通道（去掉 --local / 使用 `nolo msg --server`），" +
  "或在绑定与凭据就绪时使用 `--runtime-key docker`（本机 sbx 云沙盒）。";

/**
 * 本地通道无法兑现的 runtimeKey（云端/远端执行后端）。`docker` 单独处理：
 * 绑定就绪时本地可以真正兑现（sbx 云沙盒）；未就绪时同样显式失败。
 */
export function isLocallyUnfulfillableRuntimeKey(runtimeKey: string): boolean {
  // 同上：真值在 cliLocalRuntimeCapability.ts，本文件不再自己列一份前缀表。
  const capability = resolveCliLocalRuntimeKeyCapability(runtimeKey);
  if (!capability.key) return false;
  if (capability.fulfillableByCliLocal) return false;
  // server 落点不走本机通道，本地通道不判它（沿用原语义）。
  if (capability.kind === "server") return false;
  return true;
}

/** `docker` / `docker:<runtimeId>`：本机 sbx 云沙盒可兑现的后端。 */
export function isDockerRuntimeKey(runtimeKey: string): boolean {
  // 形态真值只有一份：packages/ai/tools/agent/cliLocalRuntimeCapability.ts。
  // 本文件此前自己写了一份 docker 正则，与 guard 的 allowlist 各自演化过。
  return isDockerRuntimeKeyFromCapability(runtimeKey);
}

export class LocalRuntimeKeyUnsupportedError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "LocalRuntimeKeyUnsupportedError";
    this.code = code;
  }
}

/**
 * run 开始前的 fail-closed 闸门：本地通道收到它无法兑现的云后端 runtimeKey 时
 * 抛可操作错误。`docker` 不在此列（由 docker workload 就绪性决定）；
 * `local` / `server` / 空 均放行（`server` 不走本地通道）。
 */
export function assertRuntimeKeyLocalFulfillable(runtimeKey: string): void {
  const key = runtimeKey.trim();
  if (!key || key === "local" || key === "server") return;
  if (isDockerRuntimeKey(key) || key === "instabox") return;
  if (isLocallyUnfulfillableRuntimeKey(key)) {
    throw new LocalRuntimeKeyUnsupportedError(
      "local_runtime_key_unsupported",
      `runtimeKey="${key}" 无法由 CLI 本地 run 通道兑现。${LOCAL_CLOUD_RUNTIME_KEY_HINT}`,
    );
  }
  throw new LocalRuntimeKeyUnsupportedError(
    "local_runtime_key_unknown",
    `runtimeKey="${key}" 不是本机可兑现的执行后端（可选：local | server | docker（本机 sbx） | instabox）。${LOCAL_CLOUD_RUNTIME_KEY_HINT}`,
  );
}

/** 本 run 可交给 docker 通道的工作区工具面（沿用服务端 allowlist）。 */
export const LOCAL_DOCKER_TOOL_NAMES = dockerExecutionToolNames;

export type LocalDockerWorkloadHandle = {
  backendId: string;
  runId: string;
  /** grant 校验的 tool channel；总是返回字符串（拒绝以 deny JSON 表达），无宿主回落。 */
  channel: DockerToolChannel;
  release: () => Promise<void>;
};

const hasDockerBindings = (
  env: Record<string, string | undefined>,
): boolean => {
  const raw = env.NOLO_DOCKER_BINDINGS;
  if (typeof raw !== "string" || !raw.trim()) return false;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
};

const dockerFailureHint =
  "请确认 NOLO_DOCKER_BINDINGS 已声明本机账户绑定（主仓 .env），sbx 已在本机 " +
  "`sbx login`，且 DOCKER_QUOTA_STORAGE / 配额可用；或改用服务端通道。";

/**
 * 把 lifecycle/backend 的失败码翻译成**可操作**提示。两条真实歧路：
 *   - `quota-*`（额度核实不了）：本机唯一可用来源是 Docker 用量页 + 并行的 nolo
 *     浏览器连接器；sbx CLI 自己没有 usage 接口（providerRateCard 已记）。核实不到
 *     就拒绝——不降级、不跳过配额检查。
 *   - `docker_account_backend_not_configured`：账户解析没带回 kvStore/quotaProvider。
 */
export function dockerFailureHintFor(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/quota could not be verified|quota-unverifiable|quota_unverifiable/i.test(message)) {
    return (
      "账户额度无法核实（quota-unverifiable）：本机唯一的 Docker 额度来源是 " +
      "https://agentic-platform.docker.com/usage 页面，需要浏览器保持该用量页打开、" +
      "且本机 nolo 连接器在运行（Chrome 端口 38947 / Firefox 38948，" +
      "`DOCKER_BROWSER_TARGET` 选择）；sbx CLI 无 usage 接口。" +
      "核实不到即 fail-closed——不会为了跑通跳过配额检查；也可改用服务端通道。"
    );
  }
  if (/docker_account_backend_not_configured/i.test(message)) {
    return (
      "docker 账户的配额后端未接通：生产接线由 createProductionDockerAccountResolver " +
      "提供 kvStore（受 `DOCKER_QUOTA_STORAGE` 控制）+ quotaProvider，本机路径应复用同一套。"
    );
  }
  return dockerFailureHint;
}

/**
 * 块K：工作区投送失败的可操作错误。消息前缀固定为
 * `docker_workspace_delivery_failed:<code>`（调用方/日志按前缀分流）。
 * 抛它的路径**永远不会** resolve workload handle —— `localRuntimeAdapter` 在进入工具
 * 循环之前就失败，绝不把 agent 放进空工作区（那会产出假改动）。
 */
export class LocalWorkspaceDeliveryError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(`docker_workspace_delivery_failed:${code}:${message}`);
    this.name = "LocalWorkspaceDeliveryError";
    this.code = code;
  }
}

/**
 * 创建（并持有）本 run 的 docker workload。返回即代表沙盒已创建成功——任何
 * 无法兑现的路径都在返回前抛错，调用方据此在 run 开始前显式失败。
 */
export async function createLocalDockerWorkload(args: {
  runtimeKey: string;
  runId: string;
  authenticatedCaller: string;
  agentKey: string;
  env: Record<string, string | undefined>;
  signal?: AbortSignal;
  /** 测试注入缝：缺省真实 `DockerWorkloadLifecycle` + 服务端 resolver。 */
  createLifecycle?: () => Promise<{
    run: <T>(
      input: {
        runId: string;
        authenticatedCaller: string;
        grant: AgentRunGrant;
        signal?: AbortSignal;
      },
      body: (workload: DockerWorkload, runtime?: DockerWorkloadRuntime) => Promise<T>,
    ) => Promise<T>;
  }>;
  /**
   * 注入缝（测试用）：账户→backend deps 的解析。缺省 = 服务端 run 通道同一套生产
   * resolver（`createProductionDockerAccountResolver`），它负责 kvStore + quotaProvider。
   */
  resolveAccount?: (binding: DockerAccountBinding) => DockerSandboxExecutionBackendDeps;
  /** 注入缝（测试用）：配额探针，透传给生产 resolver；缺省 = Docker 用量来源。 */
  quotaProvider?: DockerSandboxQuotaProvider;
  /** 注入缝（测试用）：配额 KV 存储；缺省按 `DOCKER_QUOTA_STORAGE` 解析。 */
  kvStore?: DockerQuotaKvStore;
  /**
   * 宿主工作区根：投送来源（打包 `git ls-files` 的 cwd）。缺省 `process.cwd()`
   * —— 与 `localRuntimeAdapter` 里的 `deps.cwd ?? process.cwd()` 同一取值。
   */
  workspaceRoot?: string;
  /** 明确选择沙盒工作区策略；缺省保留既有仓库投送与 git 初始化行为。 */
  workspaceMode?: "git" | "empty";
  /** 注入缝（测试用）：宿主侧投送准备（打归档 + 基线）。缺省 `prepareHostWorkspaceDelivery`。 */
  prepareWorkspaceDelivery?: (request: HostWorkspaceDeliveryRequest) => HostWorkspaceDeliveryPreparation;
  /** 注入缝（测试用）：沙盒内投送执行。缺省共享 `applyDockerWorkspaceDelivery`。 */
  applyWorkspaceDelivery?: (
    runtime: DockerWorkloadRuntime,
    selection: DockerWorkspaceInitSelection | undefined,
  ) => Promise<void>;
}): Promise<LocalDockerWorkloadHandle> {
  if (!isDockerRuntimeKey(args.runtimeKey)) {
    throw new LocalRuntimeKeyUnsupportedError(
      "local_runtime_key_not_docker",
      `createLocalDockerWorkload 只接受 docker runtimeKey，收到 "${args.runtimeKey}"。`,
    );
  }
  if (!args.authenticatedCaller) {
    throw new LocalRuntimeKeyUnsupportedError(
      "docker_caller_unknown",
      `docker workload 需要已登录的本机调用方身份（未解析到 userId）。${dockerFailureHint}`,
    );
  }
  if (!hasDockerBindings(args.env)) {
    throw new LocalRuntimeKeyUnsupportedError(
      "docker_binding_missing",
      `runtimeKey 指向 docker，但本机没有可用的 docker 账户绑定：环境变量 ` +
        `NOLO_DOCKER_BINDINGS 缺失或为空。${dockerFailureHint}`,
    );
  }

  const createLifecycle =
    args.createLifecycle ??
    (async () => {
      const [{ DockerWorkloadLifecycle, createDockerBindingAuthorizer }, accounts] =
        await Promise.all([
          import("agent-runtime/docker/workloadLifecycle"),
          import("agent-runtime/docker/accountResolver"),
        ]);
      // 与服务端 run 通道同一套共享实现：绑定解析、账户归属校验与配额存储都由
      // `agent-runtime/docker` 承担，本机 CLI 不再依赖 server 包（公开投影没有它）。
      // 本机通道必须显式传入同一份 env：共享模块缺省不读 process.env，避免把
      // 另一套环境/凭据的存储上下文悄悄带进来。
      const resolveAccount =
        args.resolveAccount ??
        accounts.createDockerAccountResolver({
          env: args.env,
          ...(args.kvStore ? { kvStore: args.kvStore } : {}),
          ...(args.quotaProvider ? { quotaProvider: args.quotaProvider } : {}),
        });
      return new DockerWorkloadLifecycle({
        // 本机通道不依赖浏览器核实额度（当天该链路掉 4 次）：跳过核实但继续记账。
        quotaVerify: false,
        topology: "single-host-shared-sqlite",
        journalPath:
          args.env.NOLO_DOCKER_JOURNAL_PATH ??
          "/tmp/nolo-docker-workloads.sqlite",
        env: args.env,
        authorize: createDockerBindingAuthorizer(args.env),
        resolveAccount,
      });
    });

  /**
   * 阶段日志默认**不输出**：每个 run 固定多 8~10 行 stderr 属于噪声，只有排查
   * workload 起不来时才需要。开关与 agentRunStream / agentRun 同款
   * （NOLO_DEBUG=1 或 NOLO_CLI_DEBUG_DETAIL=1）。
   */
  const phaseLogEnabled = () => {
    const env = args.env as Record<string, string | undefined>;
    return env.NOLO_DEBUG === "1" || env.NOLO_CLI_DEBUG_DETAIL === "1";
  };
  const phaseLog = (event: string, payload: Record<string, unknown>) => {
    if (!phaseLogEnabled()) return;
    console.warn(`[docker-workload-phase] ${event}`, payload);
  };
  const phase = async <T>(name: string, operation: () => Promise<T> | T): Promise<T> => {
    const startedAt = Date.now();
    phaseLog("start", { phase: name, runId: args.runId });
    try {
      const result = await operation();
      phaseLog("complete", { phase: name, runId: args.runId, elapsedMs: Date.now() - startedAt });
      return result;
    } catch (error) {
      const safeError = error && typeof error === "object" ? error as { code?: unknown; name?: unknown } : {};
      phaseLog("failed", { phase: name, runId: args.runId, elapsedMs: Date.now() - startedAt, errorCode: typeof safeError.code === "string" ? safeError.code : undefined, errorName: typeof safeError.name === "string" ? safeError.name : undefined });
      throw error;
    }
  };
  const lifecycle = await phase("create-lifecycle", () => createLifecycle());

  const grant: AgentRunGrant = {
    version: 1,
    grantId: `grant-${args.runId}`,
    issuedAt: Date.now(),
    agentKey: args.agentKey,
    callerUserId: args.authenticatedCaller,
    trigger: { runKind: "subtask", background: false, origin: "request" },
    target: { kind: "server", source: "dialog" },
    toolSurface: { finalToolNames: [...LOCAL_DOCKER_TOOL_NAMES] },
    workspace: {
      readScope: "runtime-workspace",
      readableRoots: [],
      writeScope: "runtime-workspace",
      writableRoots: [],
    },
  };

  const workspaceRoot = args.workspaceRoot ?? process.cwd();
  const workspaceMode = args.workspaceMode ?? "git";
  const prepareDelivery = args.prepareWorkspaceDelivery ?? prepareHostWorkspaceDelivery;
  const applyDelivery = args.applyWorkspaceDelivery ?? applyDockerWorkspaceDelivery;
  /**
   * 幂等守卫：同一个 workload 只投送一次。底层 `executeWorkspaceDelivery` 本身也是
   * 幂等的（`cp` 覆盖、解包覆盖、装 git / 建快照都有 `command -v` / `[ ! -d .git ]`
   * 守卫），重复投送在同一沙盒里不会炸，但没必要把 38MB 再传一遍。
   */
  let deliveryApplied = false;
  /** 投送宿主仓库 → 沙盒（失败即抛 `LocalWorkspaceDeliveryError`，绝不静默继续）。 */
  const deliverWorkspace = async (runtime: DockerWorkloadRuntime): Promise<void> => {
    if (deliveryApplied) return;
    deliveryApplied = true;
    const prepared = await phase("host-archive", () => {
      const result = prepareDelivery({ workspaceRoot });
      if (!result.ok) {
        throw new LocalWorkspaceDeliveryError(
          result.code,
          `${result.message}（宿主侧投送准备失败，本 run 拒绝进入工具循环）`,
        );
      }
      return result;
    });
    if (args.signal?.aborted) {
      await prepared.cleanup();
      throw new LocalWorkspaceDeliveryError("delivery_cancelled", "run 已取消，放弃工作区投送。");
    }
    try {
      await phase("delivery", () => applyDelivery(runtime, prepared.selection));
    } catch (error) {
      const code = isDockerWorkspaceDeliveryError(error) ? error.code : "delivery_failed";
      throw new LocalWorkspaceDeliveryError(
        code,
        `${error instanceof Error ? error.message : String(error)}`
        + "（沙盒内投送失败：本 run 拒绝在空工作区里跑，那会产出假改动）",
      );
    } finally {
      // 归档只用于投送；上传完成（或失败）后即删，不留 38MB 临时文件在宿主。
      await prepared.cleanup();
    }
  };

  let resolveReady: (workload: DockerWorkload) => void = () => {};
  let rejectReady: (error: unknown) => void = () => {};
  const ready = new Promise<DockerWorkload>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  let releaseRun: () => void = () => {};
  const releaseGate = new Promise<void>((resolve) => {
    releaseRun = resolve;
  });
  /**
   * 等待释放，但**中断也能解开**：lifecycle 只在 prepare 之前检查 signal（run() 开头的
   * `docker_run_cancelled`），body 里的等待若完全不理 signal，用户取消 / provider 限流
   * 打断后 lifecycle 的 finally 永远不会执行 → 沙盒泄漏。abort 时让等待立刻返回，body
   * 随即结束，finally 以 reason "cancelled" 走 release + stopAndConfirm。
   */
  const waitForReleaseOrAbort = (): Promise<void> => {
    const signal = args.signal;
    if (!signal) return releaseGate;
    if (signal.aborted) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const onAbort = () => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      };
      signal.addEventListener("abort", onAbort, { once: true });
      void releaseGate.then(() => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      });
    });
  };

  const runPromise = lifecycle.run(
    {
      runId: args.runId,
      authenticatedCaller: args.authenticatedCaller,
      grant,
      ...(args.signal ? { signal: args.signal } : {}),
    },
    async (workload, runtime) => {
      // 文件工具在沙盒里跑的是 `/tmp/nolo-tools/workspace-tool.mjs`。本通道此前从不上传
      // 它：execShell 通、文件工具全挂在 `docker_execution_failed`（helper 不存在 → 127）。
      // 与服务端 run 通道同一份上传 argv（幂等），失败即 fail-closed，绝不带着半成品沙盒起跑。
      if (runtime) {
        await phase("sandbox-helper-upload", async () => {
          const uploaded = await runtime.exec(buildSandboxHelperUploadArgv());
          if (!uploaded.ok) {
            throw Object.assign(new Error("docker_helper_upload_failed"), { code: "docker_helper_upload_failed" });
          }
        });
        if (workspaceMode === "git") {
          // 把宿主仓库投送进沙盒。失败即抛，ready 不会 resolve。
          await deliverWorkspace(runtime);
        } else {
          // 工具 helper 将相对路径解析到既有安全根；创建并核验容器内根目录，
          // 绝不把宿主 workspaceRoot 当作沙盒路径。
          await phase("empty-workspace-root", async () => {
            const root = await runtime.exec([
              "bash", "-lc",
              `mkdir -p '${SANDBOX_WORKSPACE_ROOT}' && test -d '${SANDBOX_WORKSPACE_ROOT}' && test -w '${SANDBOX_WORKSPACE_ROOT}'`,
            ]);
            if (!root.ok) {
              throw Object.assign(new Error("docker_empty_workspace_root_failed"), { code: "docker_empty_workspace_root_failed" });
            }
            // empty 模式不投递宿主仓库，但工具面仍是同一套 helper，git 是硬需求。
            // 而钉住的镜像 `docker.io/oven/bun:*` 不带 git（见
            // sandboxWorkspaceDelivery 顶部探测记录），「装 git」那一步原本只存在于
            // **被 empty 跳过的投送计划**里 → 只做 `command -v git` 探测在真实镜像上
            // 必然失败，等于死路。所以顺序固定为「装 → 探」：直接复用投送计划的幂等
            // argv（内含 `command -v git` 守卫，缺 git 才 apt-get install），装不上
            // （无网络 / 源不可达 / 无权限）即 fail-closed，绝不带着没有 git 的沙盒 ready。
            const gitInstall = await runtime.exec(buildInstallGitArgv());
            if (!gitInstall.ok) {
              throw Object.assign(
                new Error(`docker_empty_workspace_git_install_failed (exit ${gitInstall.exitCode})`),
                { code: "docker_empty_workspace_git_install_failed" },
              );
            }
            // 装完再探：把「安装命令失败」与「装了但不可用」区分成两个错误码，
            // 否则 ready 之后每个 git 相关调用才逐个失败。
            const gitProbe = await runtime.exec(["bash", "-lc", "command -v git"]);
            if (!gitProbe.ok) {
              throw Object.assign(new Error("docker_empty_workspace_git_missing"), { code: "docker_empty_workspace_git_missing" });
            }
          });
        }
      }
      await phase("ready", () => resolveReady(workload));
      // 沙盒创建成功后才 resolve；release() / 中断 / handle 未能返回前一直持有 lease。
      await waitForReleaseOrAbort();
      return undefined;
    },
  );
  // lifecycle 的 finally 仍负责 backend.release + stopAndConfirm（失败即 cleanup_pending）。
  const settled = runPromise.then(
    () => undefined,
    (error: unknown) => {
      rejectReady(error);
      return undefined;
    },
  );
  /**
   * 释放 lease（幂等，且**等到 lifecycle 的 finally 真正跑完**）：解开 body 的阻塞点，
   * 再等 backend.release → stop 确认 → 必要时 stopAndConfirm 结算完毕。
   *
   * 为什么必须在这里兜住所有退出路径：body 一旦还堵在 releaseGate 上，lifecycle 的
   * finally 就永远不会执行——既没有 backend.release（配额账本停在 running），也没有
   * stopAndConfirm（沙盒继续计费）。块P 之前「投送失败 / 被中断一次就吃掉一个槽位」正是
   * 这条：handle 没有返回给调用方（或调用方没机会调 release）时，没人解开这个门。
   */
  let leaseReleased = false;
  const releaseLease = async (): Promise<void> => {
    if (!leaseReleased) {
      leaseReleased = true;
      releaseRun();
    }
    await settled;
  };

  let workload: DockerWorkload;
  try {
    workload = await ready;
  } catch (error) {
    // 这条路径上 body 已经抛出（lifecycle 的 finally 会清理），这里显式等到清理结算
    // 完成再向上报错：调用方看到失败时沙盒已确定处理完（释放或留 cleanup_pending 痕迹）。
    await releaseLease();
    if (error instanceof LocalWorkspaceDeliveryError) {
      // 块K：投送失败不是「workload 起不来」，而是「沙盒里没有工作区」。工作区是硬需求
      // （没有仓库就没有可信 diff），所以本 run 在工具循环之前中止。
      throw new LocalRuntimeKeyUnsupportedError(
        "docker_workspace_delivery_failed",
        `${error.message}。工作区投送是硬需求：沙盒里若没有仓库，agent 的任何“改动”都不可信，`
        + "因此本 run 已在进入工具循环前中止。请检查宿主仓库是否就绪（git 工作树 / HEAD）、"
        + "归档体积与文件数、以及沙盒可达性后重试；也可先用 `sbx --cloud ls` 确认沙盒与绑定状态。",
      );
    }
    throw new LocalRuntimeKeyUnsupportedError(
      "docker_workload_unavailable",
      `runtimeKey 指向 docker，但本机 docker workload 无法启动：${
        error instanceof Error ? error.message : String(error)
      }。${dockerFailureHintFor(error)}`,
    );
  }
  if (!workload.channel) {
    // handle 不会返回 → 调用方永远没有机会 release：必须在这里兑现（否则沙盒一直计费）。
    await releaseLease();
    throw new LocalRuntimeKeyUnsupportedError(
      "docker_workload_unavailable",
      `docker workload 创建后没有可用 channel（未就绪）。${dockerFailureHint}`,
    );
  }

  return {
    backendId: LOCAL_DOCKER_BACKEND_ID,
    runId: args.runId,
    channel: workload.channel,
    release: async () => {
      // 所有退出路径共用同一条释放：解开 body 的阻塞点 + 等 lifecycle 的 finally 结算。
      await releaseLease();
    },
  };
}

/** 供调用方复用的 deny 语义：docker channel 不可用时禁止一切工具执行。 */
export { createDockerToolChannel };
