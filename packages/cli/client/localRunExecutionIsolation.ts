// packages/cli/client/localRunExecutionIsolation.ts
//
// F1：本地 run 的**执行隔离事实**（execution isolation fact）。
//
// 缺口（review F1）：本地 run 此前没有任何 execution audit ——
//   - `local` run 只把 `execShell` 送进 bwrap（linux-bubblewrap-v1），
//     `readFile/writeFile/editFile/glob/grep` 始终在宿主执行；
//   - bwrap 不可用 / 非 Linux 时整段不生效，**静默**落回宿主；
//   - 于是「这次 run 到底有没有隔离、隔离覆盖到哪些工具」只能靠猜。
//
// 这里为每个本地 run 落一条可读事实（哪怕 `isolation:"none"` + `sandbox:"host"`），
// 让「没隔离」是**显式声明**而不是缺席。事实是声明式的：surface / isolation /
// sandbox / reason 四件分开写，任何 surface 都不能把自己呈现成比实际更强的隔离。
// 真值来源与控制面一致：docker 由 localDockerWorkload 决定，bwrap 由
// localRuntimeAdapter 的 sandbox workload 决定。
//
// G12：**「声明」不等于「被看见」**。上面的事实只写进工件文件 + 一行 info 日志，
// 用户不看 `~/.nolo/runs` 就永远不知道这台机器（macOS / Windows）根本没有隔离
// 后端。于是这里再给事实附一个**告警块** `notice`（哪台平台、为什么没有后端、
// 给用户看的那句话），由调用方转成一次 warn（`createLocalRunIsolationNoticeEmitter`
// 按 platform+reason 去重 = 一次/进程）。注意：`seatbelt` 只活在
// `agent-runtime/executionAudit.ts` 的类型联合里、没有实现，所以 macOS 当前
// **确实**没有后端，文案必须这么说，不能假装有。
//
// G12 的**已知边界（如实验收，不假装闭环）**：这条告警的 sink 是
// `getLogger("cli.localRuntimeAdapter")`，而 `initializeDiagnostics` 在
// `mode === "tui"` 时**不挂 stderr sink**（`packages/cli/diagnostics/index.ts:243-264`，
// 只有 ring buffer + `~/.nolo/logs`）。所以：
//   - `nolo run`（非 TUI）→ 直接可见（stderr）✅
//   - TUI 交互模式 → **只在 ring buffer 与日志文件里**，用户仍需翻文件 ⏳
// 这一半是刻意留白的（见 `docs/plans/2026-10-28-skill-market-sandbox-and-billing-roadmap.md`
// §12 的 G12 行）：接 TUI 可见通道要在 client 适配器与 TUI 渲染层之间新开一条
// 通知通路，属于另一处改动，不在本模块的「只加可观测、不改执行行为」范围内。
//
// G12 的**反面**同样要写死：`runtimeKey="instabox"` 在 darwin / win32 上**有**
// 容器隔离（`localInstaboxWorkload.ts`：execShell + 文件工具 bridge，无回落）。
// 「本平台没有隔离后端」只对宿主执行成立，绝不能套到 instabox 上——
// 「实际有隔离却说没有」会让用户去排查根本没发生的工作区污染。

import {
  resolveExecutionEndpoint,
  type EndpointFacts,
  type ExecutionEndpoint,
  type HostPlatform,
} from "agent-runtime/executionEndpoint";

export type LocalRunExecutionSurface =
  | "host"
  | "bwrap-os-sandbox"
  | "docker-sandbox"
  /** `runtimeKey="instabox"`：命令与文件工具都在 Instabox 云容器里执行。 */
  | "instabox-sandbox";

/** 与 agent-runtime/executionAudit.ts 的 ExecutionIsolation 同名语义。 */
export type LocalRunIsolationStrength = "none" | "os-sandbox" | "container";

export type LocalRunSandboxName = "host" | "bwrap" | "docker" | "instabox";

export type LocalRunIsolationReason =
  | "docker-workload"
  /** `runtimeKey="instabox"` 的容器通道：与平台无关，darwin/win32 上同样是容器。 */
  | "instabox-workload"
  | "bwrap-execshell-only"
  | "read-only-host"
  /** F1：调用方显式点名 runtimeKey=local（+ allowHostWrites）的宿主执行。 */
  | "host-explicit-writes"
  | "host-no-sandbox"
  /** G12：本平台**根本没有**隔离后端（macOS / Windows 的 seatbelt 未实现）。 */
  | "host-no-sandbox-backend";

/**
 * 本平台的隔离后端供给情况。与 `reason` 分开，是因为两者答的不是一个问题：
 * `reason` 说「为什么落到宿主」，这里说「到底有没有后端可用」。
 *   available        → 本 run 已拿到后端（docker workload / bwrap workload）
 *   unavailable      → 平台有后端但这次拿不到（Linux 缺 bwrap / userns 被禁）
 *   none-on-platform → 平台没有后端实现（macOS / Windows）
 *   unknown          → 尚未探测（Linux 的 bwrap workload 是惰性创建的）
 */
export type LocalRunSandboxBackendSupport =
  | "available"
  | "unavailable"
  | "none-on-platform"
  | "unknown";

/** 用户可见的那句话（测试与各 surface 共用同一份文案，避免漂移）。 */
export const UNSANDBOXED_HOST_EXECUTION_MESSAGE =
  "本机执行无沙盒隔离，命令直接作用于你的工作区";

/**
 * 告警块：只在「隔离:none 且本平台/本机确实没有后端」时存在。放进事实里是为了
 * 让它随 `<runId>.isolation.json` 一起落盘 —— 事后审计与用户提示共用一份真值。
 */
export type LocalRunExecutionIsolationNotice = {
  code: "host-execution-unsandboxed";
  level: "warn";
  /** 完整用户文案，含「为什么没有后端」。 */
  message: string;
  platform: string;
  reason: LocalRunIsolationReason;
  sandboxBackend: LocalRunSandboxBackendSupport;
};

export type LocalRunExecutionIsolationFact = {
  surface: LocalRunExecutionSurface;
  isolation: LocalRunIsolationStrength;
  sandbox: LocalRunSandboxName;
  reason: LocalRunIsolationReason;
  /** 人话：隔离覆盖到哪、**覆盖不到**哪。 */
  note: string;
  /** G12：本平台字符串（`process.platform` 原值），审计里据此区分 darwin/win32。 */
  platform: string;
  /** G12：本平台的隔离后端供给情况（见 LocalRunSandboxBackendSupport）。 */
  sandboxBackend: LocalRunSandboxBackendSupport;
  /** G12：没有后端时的告警块；有隔离 / 只读 / 尚未探测时为 null。 */
  notice: LocalRunExecutionIsolationNotice | null;
  recordedAt: number;
};

/** `process.platform` 归一：调用方不该为本模块的判定自己 lowercase。 */
export function normalizeIsolationPlatform(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim().toLowerCase() : "unknown";
}

/**
 * 这个平台**有没有**隔离后端实现。目前只有 Linux（bwrap）；
 * macOS 的 `seatbelt` 只有类型声明、无实现，Windows 没有对应机制。
 */
export function isSandboxBackendAvailableOnPlatform(platform: string): boolean {
  return normalizeIsolationPlatform(platform) === "linux";
}

/**
 * 由本 run 的实际控制面推导隔离事实。无 IO、无环境读取 —— 调用方把
 * 「docker workload 是否启用 / bwrap workload 是否可用 / 本机平台」如实传进来。
 *
 * G12 契约：**判定结果不因加日志而改变**。这里「无隔离」的分支仍然返回
 * `isolation:"none"`（照常执行），只是额外带上 `platform` / `sandboxBackend` /
 * `notice`，让调用方能把「静默」变成「明说」。
 */
export function resolveLocalRunExecutionIsolationFact(args: {
  runtimeKey?: unknown;
  readOnly?: boolean;
  /** runtimeKey 指向 docker 且本机 sbx 通道启用。 */
  dockerWorkloadEnabled: boolean;
  /**
   * runtimeKey 指向 instabox（Instabox 云容器通道）。
   * 与 `dockerWorkloadEnabled` 互斥：一条 run 只有一个 runtimeKey。
   */
  instaboxWorkloadEnabled?: boolean;
  /** 本 run 已拿到可用的 bwrap workload（只覆盖 execShell）。 */
  bwrapWorkloadAvailable?: boolean;
  /** 平台（`process.platform`）；缺省视为 unknown（不影响隔离判定本身）。 */
  platform?: string;
  /** 显式覆盖后端供给判定（测试/上层已知探测结论时用）。 */
  sandboxBackend?: LocalRunSandboxBackendSupport;
  nowMs?: number;
}): LocalRunExecutionIsolationFact {
  const recordedAt = args.nowMs ?? Date.now();
  const platform = normalizeIsolationPlatform(args.platform);
  const sandboxBackend = resolveSandboxBackendSupport({
    platform,
    dockerWorkloadEnabled: args.dockerWorkloadEnabled,
    instaboxWorkloadEnabled: args.instaboxWorkloadEnabled,
    bwrapWorkloadAvailable: args.bwrapWorkloadAvailable,
    override: args.sandboxBackend,
  });
  const finish = (
    fact: Omit<
      LocalRunExecutionIsolationFact,
      "platform" | "sandboxBackend" | "notice"
    >,
  ): LocalRunExecutionIsolationFact => ({
    ...fact,
    platform,
    sandboxBackend,
    notice: buildIsolationNotice({ fact, platform, sandboxBackend }),
  });
  if (args.dockerWorkloadEnabled) {
    return finish({
      surface: "docker-sandbox",
      isolation: "container",
      sandbox: "docker",
      reason: "docker-workload",
      note:
        "本 run 的工作区工具族（execShell / readFile / writeFile / editFile / globFiles / grepFiles）" +
        "走本机 sbx 云沙盒（container 边界），宿主执行器零调用。",
      recordedAt,
    });
  }
  if (args.instaboxWorkloadEnabled) {
    // MEDIUM-1（review）：instabox 是**容器隔离**，与宿主平台无关。
    // 此前 darwin / win32 上这里落进 host-no-sandbox-backend，产出「本机执行无沙盒
    // 隔离」的误报——「实际有隔离却说没有」会让用户以为工作区被直接改过。
    return finish({
      surface: "instabox-sandbox",
      isolation: "container",
      sandbox: "instabox",
      reason: "instabox-workload",
      note:
        "本 run 走 `runtimeKey=instabox`：execShell 与文件工具（readFile / writeFile / " +
        "editFile / globFiles / grepFiles）都在 Instabox 云容器执行后端完成（container 边界），" +
        "隧道显式拒绝回落宿主；不支持的工作区工具直接报错，不会落到本机。" +
        "隔离强度与宿主平台无关（darwin / win32 上同样是容器）。",
      recordedAt,
    });
  }
  if (args.bwrapWorkloadAvailable === true) {
    return finish({
      surface: "bwrap-os-sandbox",
      isolation: "os-sandbox",
      sandbox: "bwrap",
      reason: "bwrap-execshell-only",
      note:
        "本 run 的 execShell 走本机 linux-bubblewrap-v1（user namespace + seccomp）；" +
        "readFile / writeFile / editFile / globFiles / grepFiles **仍在宿主执行**，" +
        "隔离只覆盖 shell。",
      recordedAt,
    });
  }
  if (args.runtimeKey === "local") {
    // F1：审计里必须能一眼区分「点名宿主执行（local）」与「docker 沙盒」。
    return finish({
      surface: "host",
      isolation: "none",
      sandbox: "host",
      reason: "host-explicit-writes",
      note:
        "本 run 由调用方**显式点名 runtimeKey=local**：在宿主工作区执行且" +
        "**无隔离**，写操作直接作用于宿主文件系统（不落 docker 副本）。授权确认由调用方另行记录，本文件不推断。",
      recordedAt,
    });
  }
  if (args.readOnly === true) {
    return finish({
      surface: "host",
      isolation: "none",
      sandbox: "host",
      reason: "read-only-host",
      note:
        "只读派发（调用方声明 readOnly，无写工具）：留在宿主执行且**无隔离**；" +
        "它写不了文件，起沙盒是纯浪费。",
      recordedAt,
    });
  }
  if (platform !== "unknown" && !isSandboxBackendAvailableOnPlatform(platform)) {
    // G12：这台平台根本没有隔离后端 —— 不再落进下面那条泛泛的 host-no-sandbox，
    // 否则「Linux 少装了 bwrap」与「macOS 压根没实现」在审计里长得一样。
    return finish({
      surface: "host",
      isolation: "none",
      sandbox: "host",
      reason: "host-no-sandbox-backend",
      note:
        `本 run 在宿主执行且**无隔离**：${platform} 上没有可隔离本机执行的沙盒后端` +
        "（macOS 的 seatbelt 仅有类型声明、无实现；Windows 无对应机制），" +
        "命令与文件写入直接作用于宿主工作区。要隔离请用 --runtime-key docker。",
      recordedAt,
    });
  }
  return finish({
    surface: "host",
    isolation: "none",
    sandbox: "host",
    reason: "host-no-sandbox",
    note:
      "本 run 在宿主执行且**无隔离**（未走 docker 通道，也没有可用的 bwrap workload）。" +
      "写操作直接作用于宿主工作区；派发型 run 的默认落点是本机 docker 沙盒，" +
      "交互式 run 可用 --runtime-key docker（或 --local 显式声明本机执行）。",
    recordedAt,
  });
}

function resolveSandboxBackendSupport(args: {
  platform: string;
  dockerWorkloadEnabled: boolean;
  instaboxWorkloadEnabled?: boolean;
  bwrapWorkloadAvailable?: boolean;
  override?: LocalRunSandboxBackendSupport;
}): LocalRunSandboxBackendSupport {
  if (args.override) return args.override;
  if (
    args.dockerWorkloadEnabled ||
    args.instaboxWorkloadEnabled ||
    args.bwrapWorkloadAvailable === true
  ) {
    return "available";
  }
  // 平台未知（调用方没传）：不能断言「这平台没有后端」，否则 Linux 会被误报。
  if (args.platform === "unknown") return "unknown";
  if (!isSandboxBackendAvailableOnPlatform(args.platform)) return "none-on-platform";
  // Linux：bwrap workload 是惰性创建，调用方没传值就是「还没探测」——此时报
  // 「没有后端」会是假警报（bwrap 可能稍后在 execShell 时接管）。
  return args.bwrapWorkloadAvailable === false ? "unavailable" : "unknown";
}

function buildIsolationNotice(args: {
  fact: Omit<
    LocalRunExecutionIsolationFact,
    "platform" | "sandboxBackend" | "notice"
  >;
  platform: string;
  sandboxBackend: LocalRunSandboxBackendSupport;
}): LocalRunExecutionIsolationNotice | null {
  // 只读派发写不了文件，提示「命令作用于工作区」是纯噪音。
  if (args.fact.reason === "read-only-host") return null;
  if (args.fact.isolation !== "none") return null;
  if (args.sandboxBackend !== "none-on-platform" && args.sandboxBackend !== "unavailable") {
    // available = 有隔离；unknown = Linux 上 bwrap 尚未探测，误报会骗人。
    return null;
  }
  const why =
    args.sandboxBackend === "none-on-platform"
      ? `${args.platform} 上没有可隔离本机执行的沙盒后端` +
        (args.platform === "darwin" ? "（seatbelt 仅有类型声明、无实现）" : "")
      : "本机沙盒后端不可用（Linux 需要 bwrap 与 user namespace）";
  return {
    code: "host-execution-unsandboxed",
    level: "warn",
    message: `${UNSANDBOXED_HOST_EXECUTION_MESSAGE}：${why}，run 仍在宿主进程里跑。`,
    platform: args.platform,
    reason: args.fact.reason,
    sandboxBackend: args.sandboxBackend,
  };
}

/**
 * G2：把隔离事实折成**端点能力标注**，让调用方能直接问「这个端能不能 shell /
 * 有没有 browser-connector / shell 有没有边界」，而不是解析 surface 字符串。
 *
 * 三个 surface 的差别全在「边界」上，能力集合本身相同（本机都能 shell + 写文件）：
 *   docker-sandbox → isolation "container"（工作区工具族整体在界内）
 *   bwrap          → shell 有边界，**文件工具仍在宿主**（`unisolatedCapabilities` 会说）
 *   host / 无沙盒   → 边界 "none"（macOS 的真实状态；强隔离需求必须改路由）
 */
export function resolveLocalRunExecutionEndpoint(args: {
  fact: LocalRunExecutionIsolationFact;
  /** 宿主平台（调用方探测；缺省不猜）。 */
  platform?: HostPlatform;
  /** 桌面运行时是否提供浏览器连接器（本模块不推断）。 */
  browserConnectorAvailable?: boolean;
  gpuAvailable?: boolean;
}): ExecutionEndpoint {
  const facts: EndpointFacts = {};
  if (args.platform) facts.platform = args.platform;
  if (args.browserConnectorAvailable !== undefined) {
    facts.browserConnectorAvailable = args.browserConnectorAvailable;
  }
  if (args.gpuAvailable !== undefined) facts.gpuAvailable = args.gpuAvailable;

  switch (args.fact.sandbox) {
    case "docker":
      facts.isolation = "container";
      break;
    case "bwrap":
      // bwrap workload 只证明「这个 workload 可用」，**不证明宿主平台**：平台事实由
      // 调用方注入，本模块不推断（见文件头边界）。调用方注入 darwin / 未注入平台时，
      // `resolveEndpointShellIsolation` 仍然给出 none（no-isolation-backend /
      // unknown-platform）——这一条 bwrap 事实不会把它翻成 namespace。
      facts.shellIsolationAvailable = true;
      break;
    case "host":
      break;
  }

  return resolveExecutionEndpoint({
    id: `local-run:${args.fact.sandbox}`,
    kind: "desktop-host",
    facts,
  });
}

/** 一行可读文案（供日志/报告/测试断言；不包含任何路径）。 */
export function describeLocalRunExecutionIsolation(
  fact: LocalRunExecutionIsolationFact,
): string {
  return `execution isolation: ${fact.isolation} (sandbox: ${fact.sandbox}, target: ${fact.surface}) — ${fact.note}`;
}

/** 结构化告警 sink：调用方接 logger（带 fields），本模块不依赖日志设施。 */
export type LocalRunIsolationNoticeSink = (event: {
  message: string;
  fields: Record<string, unknown>;
}) => void;

/**
 * 模块级去重键集合：缺省 emitter 共用它，于是「一次性 warn」= 一次/进程
 * （同一 platform+reason 不再重复刷屏；不同平台/原因各自一条）。
 */
const emittedNoticeKeys = new Set<string>();

/**
 * 造一个「把 fact.notice 变成一次结构化 warn」的发射器。
 *
 * @returns `(fact, context?) => 是否真的发出了告警`（无 notice / 已发过 → false）。
 * 调用方只负责把 sink 接到 logger；执行路径**不受影响**（本函数没有任何副作用
 * 之外的返回值被用于控制流）。
 */
export function createLocalRunIsolationNoticeEmitter(args: {
  sink: LocalRunIsolationNoticeSink;
  /** 测试注入：缺省模块级集合（跨 run 共享 = 一次/进程）。 */
  seen?: Set<string>;
}): (fact: LocalRunExecutionIsolationFact, context?: Record<string, unknown>) => boolean {
  const seen = args.seen ?? emittedNoticeKeys;
  return (fact, context) => {
    const notice = fact.notice;
    if (!notice) return false;
    const key = `${notice.platform}:${notice.sandboxBackend}:${notice.reason}`;
    if (seen.has(key)) return false;
    seen.add(key);
    args.sink({
      message: notice.message,
      fields: {
        event: "execution_isolation_unsandboxed",
        code: notice.code,
        level: notice.level,
        isolation: fact.isolation,
        sandbox: fact.sandbox,
        surface: fact.surface,
        reason: fact.reason,
        platform: fact.platform,
        sandboxBackend: fact.sandboxBackend,
        ...(context ?? {}),
      },
    });
    return true;
  };
}

export type IsolationFactFsLike = {
  writeFileSync(path: string, data: string): unknown;
  mkdirSync?: (path: string, options?: { recursive?: boolean }) => unknown;
};

/**
 * 把事实落到 run 工件旁：`<runsDir>/<runId>.isolation.json`（与
 * `<runId>.msg.md` / `<runId>.result.md` 同目录，工具链一处找齐）。
 * `notice` 随事实一起落盘 —— 事后审计能看到当时给用户看的是哪句话。
 *
 * @returns 写入路径（调用方负责日志/可观测性，本函数不打印）。
 */
export function recordLocalRunExecutionIsolation(args: {
  runId: string;
  runsDir: string;
  fact: LocalRunExecutionIsolationFact;
  fs: IsolationFactFsLike;
}): string {
  const path = joinPath(args.runsDir, `${args.runId}.isolation.json`);
  args.fs.mkdirSync?.(args.runsDir, { recursive: true });
  args.fs.writeFileSync(
    path,
    `${JSON.stringify({ runId: args.runId, ...args.fact }, null, 2)}\n`,
  );
  return path;
}

/** 只做路径拼接（避免本模块依赖 node:path，便于在浏览器侧复用类型）。 */
function joinPath(dir: string, name: string): string {
  if (!dir) return name;
  const sep = dir.includes("\\") && !dir.includes("/") ? "\\" : "/";
  return dir.endsWith(sep) ? `${dir}${name}` : `${dir}${sep}${name}`;
}
