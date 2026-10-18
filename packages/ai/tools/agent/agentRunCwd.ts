// packages/ai/tools/agent/agentRunCwd.ts
//
// startAgentRun 的 cwd 校验（纯函数，零 I/O）。
//
// cwd 只在**本地运行主机**可兑现（nolo CLI 的 --bg 子进程）：它是子 run 进程的
// 工作目录，也就是它工具面的工作区。非法值一律报错而不是静默回落——静默回落到
// 默认目录会让子 run 在**错误的仓库 / worktree** 上动手，比派发失败贵得多。
//
// 独立成模块（而不是塞进 startAgentRunTool.ts）是接线需要：CLI 执行器要复用同一
// 份判定与文案，而 startAgentRunTool 拖进 Redux thunk / 渲染层依赖。

/** 目录探测结论；由宿主注入探针给出（CLI 用 node fs，测试用内存实现）。 */
export type StartAgentRunCwdVerdict = "directory" | "missing" | "not-a-directory";

/** 绝对路径判定：POSIX 的 `/x`、Windows 的 `C:\x`，以及 UNC `\\host\share`。 */
export function isAbsoluteRunCwd(raw: string): boolean {
  return raw.startsWith("/") || raw.startsWith("\\\\") || /^[A-Za-z]:[\\/]/.test(raw);
}

/**
 * 归一化并校验 startAgentRun 的 cwd。
 *
 * - 缺省 / 空白 → undefined：不传 = 沿用调用方给定目录（现有行为不变）。
 * - 相对路径 → 报错：相对基准在各宿主不同，猜错就是错目录。
 * - probe 给到且不是目录 → 报错（「不存在或不可用」与「不是目录」分开说，便于自纠）。
 */
export function resolveStartAgentRunCwd(
  rawCwd: unknown,
  probe?: (absolutePath: string) => StartAgentRunCwdVerdict,
): string | undefined {
  if (typeof rawCwd !== "string") return undefined;
  const trimmed = rawCwd.trim();
  if (!trimmed) return undefined;
  if (!isAbsoluteRunCwd(trimmed)) {
    throw new Error(
      `startAgentRun: cwd 必须是绝对路径，收到 "${trimmed}"。请传绝对路径，或省略 cwd 沿用当前工作目录。`,
    );
  }
  if (probe) {
    const verdict = probe(trimmed);
    if (verdict === "missing") {
      throw new Error(`startAgentRun: cwd 目录不存在或不可用：${trimmed}`);
    }
    if (verdict === "not-a-directory") {
      throw new Error(`startAgentRun: cwd 不是目录：${trimmed}`);
    }
  }
  return trimmed;
}
