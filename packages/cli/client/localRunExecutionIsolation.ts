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

export type LocalRunExecutionSurface =
  | "host"
  | "bwrap-os-sandbox"
  | "docker-sandbox";

/** 与 agent-runtime/executionAudit.ts 的 ExecutionIsolation 同名语义。 */
export type LocalRunIsolationStrength = "none" | "os-sandbox" | "container";

export type LocalRunSandboxName = "host" | "bwrap" | "docker";

export type LocalRunIsolationReason =
  | "docker-workload"
  | "bwrap-execshell-only"
  | "read-only-host"
  /** F1：调用方显式点名 runtimeKey=local（+ allowHostWrites）的宿主执行。 */
  | "host-explicit-writes"
  | "host-no-sandbox";

export type LocalRunExecutionIsolationFact = {
  surface: LocalRunExecutionSurface;
  isolation: LocalRunIsolationStrength;
  sandbox: LocalRunSandboxName;
  reason: LocalRunIsolationReason;
  /** 人话：隔离覆盖到哪、**覆盖不到**哪。 */
  note: string;
  recordedAt: number;
};

/**
 * 由本 run 的实际控制面推导隔离事实。无 IO、无环境读取 —— 调用方把
 * 「docker workload 是否启用 / bwrap workload 是否可用」如实传进来。
 */
export function resolveLocalRunExecutionIsolationFact(args: {
  runtimeKey?: unknown;
  readOnly?: boolean;
  /** runtimeKey 指向 docker 且本机 sbx 通道启用。 */
  dockerWorkloadEnabled: boolean;
  /** 本 run 已拿到可用的 bwrap workload（只覆盖 execShell）。 */
  bwrapWorkloadAvailable?: boolean;
  nowMs?: number;
}): LocalRunExecutionIsolationFact {
  const recordedAt = args.nowMs ?? Date.now();
  if (args.dockerWorkloadEnabled) {
    return {
      surface: "docker-sandbox",
      isolation: "container",
      sandbox: "docker",
      reason: "docker-workload",
      note:
        "本 run 的工作区工具族（execShell / readFile / writeFile / editFile / globFiles / grepFiles）" +
        "走本机 sbx 云沙盒（container 边界），宿主执行器零调用。",
      recordedAt,
    };
  }
  if (args.bwrapWorkloadAvailable === true) {
    return {
      surface: "bwrap-os-sandbox",
      isolation: "os-sandbox",
      sandbox: "bwrap",
      reason: "bwrap-execshell-only",
      note:
        "本 run 的 execShell 走本机 linux-bubblewrap-v1（user namespace + seccomp）；" +
        "readFile / writeFile / editFile / globFiles / grepFiles **仍在宿主执行**，" +
        "隔离只覆盖 shell。",
      recordedAt,
    };
  }
  if (args.runtimeKey === "local") {
    // F1：审计里必须能一眼区分「点名宿主执行（local）」与「docker 沙盒」。
    return {
      surface: "host",
      isolation: "none",
      sandbox: "host",
      reason: "host-explicit-writes",
      note:
        "本 run 由调用方**显式点名 runtimeKey=local**：在宿主工作区执行且" +
        "**无隔离**，写操作直接作用于宿主文件系统（不落 docker 副本）。授权确认由调用方另行记录，本文件不推断。",
      recordedAt,
    };
  }
  if (args.readOnly === true) {
    return {
      surface: "host",
      isolation: "none",
      sandbox: "host",
      reason: "read-only-host",
      note:
        "只读派发（调用方声明 readOnly，无写工具）：留在宿主执行且**无隔离**；" +
        "它写不了文件，起沙盒是纯浪费。",
      recordedAt,
    };
  }
  return {
    surface: "host",
    isolation: "none",
    sandbox: "host",
    reason: "host-no-sandbox",
    note:
      "本 run 在宿主执行且**无隔离**（未走 docker 通道，也没有可用的 bwrap workload）。" +
      "写操作直接作用于宿主工作区；派发型 run 的默认落点是本机 docker 沙盒，" +
      "交互式 run 可用 --runtime-key docker（或 --local 显式声明本机执行）。",
    recordedAt,
  };
}

/** 一行可读文案（供日志/报告/测试断言；不包含任何路径）。 */
export function describeLocalRunExecutionIsolation(
  fact: LocalRunExecutionIsolationFact,
): string {
  return `execution isolation: ${fact.isolation} (sandbox: ${fact.sandbox}, target: ${fact.surface}) — ${fact.note}`;
}

export type IsolationFactFsLike = {
  writeFileSync(path: string, data: string): unknown;
  mkdirSync?: (path: string, options?: { recursive?: boolean }) => unknown;
};

/**
 * 把事实落到 run 工件旁：`<runsDir>/<runId>.isolation.json`（与
 * `<runId>.msg.md` / `<runId>.result.md` 同目录，工具链一处找齐）。
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
