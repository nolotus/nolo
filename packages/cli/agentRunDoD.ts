// DoD（Definition of Done）机械验收：派发时声明的验收命令，在 run 收尾时跑一遍，
// 结果写进 run 记录本身。
//
// 它曾经住在 agentRunReport.ts 里，和一整套报告子系统（markdown 渲染、json
// 落盘、git 摘要、supervise 串行调度）绑在一起。那套东西的实测产出是：磁盘上
// 83 份报告，**含 DoD 结果的 0 份**，其余是元数据加一句父工作区的 git 摘要。
// 更糟的是默认不落盘之后，验收命令照跑（真的花时间），结果直接扔掉——纪律在
// 默认路径上是空转的。
//
// 所以报告子系统（agentRunReport.ts：markdown 渲染、json 落盘、git 摘要、
// supervise 兼容报告）已整体删除；supervise 验收只读 run 记录。DoD 结果落在
// 已经存在的载体：`~/.nolo/runs/<runId>.json` 本来就有 activity / note / exitCode，
// dodResults 是它多一个字段，不是又一个子系统。

import { spawnSync as nodeSpawnSync } from "node:child_process";

export type DoDCommandResult = {
  command: string;
  exitCode: number | "timeout" | "error";
  stdoutTail: string[];
  stderrTail: string[];
};

export type DoDDeps = {
  spawnSync?: typeof nodeSpawnSync;
  cwd?: string;
};

/** 单条命令的超时上限。超时算失败，不算「没跑」。 */
export const DOD_COMMAND_TIMEOUT_MS = 120_000;

export function extractTailLines(
  text: string | undefined | null,
  count: number
): string[] {
  if (!text) return [];
  const lines = String(text).split("\n");
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
  return lines.slice(-count);
}

export function executeDoDCommand(
  cmd: string,
  cwd: string | undefined,
  deps: DoDDeps = {}
): DoDCommandResult {
  const spawnSync = deps.spawnSync ?? nodeSpawnSync;
  try {
    const res = spawnSync(cmd, {
      shell: true,
      cwd: cwd || process.cwd(),
      timeout: DOD_COMMAND_TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024,
      encoding: "utf8",
    });

    if (res.error) {
      const errCode = (res.error as any).code;
      const timedOut =
        errCode === "ETIMEDOUT" || res.signal === "SIGTERM" || res.signal === "SIGKILL";
      return {
        command: cmd,
        exitCode: timedOut ? "timeout" : "error",
        stdoutTail: extractTailLines(res.stdout, 20),
        stderrTail: extractTailLines(res.stderr || res.error.message, 10),
      };
    }

    if (res.status === null && (res.signal === "SIGTERM" || res.signal === "SIGKILL")) {
      return {
        command: cmd,
        exitCode: "timeout",
        stdoutTail: extractTailLines(res.stdout, 20),
        stderrTail: extractTailLines(res.stderr, 10),
      };
    }

    return {
      command: cmd,
      exitCode: typeof res.status === "number" ? res.status : "error",
      stdoutTail: extractTailLines(res.stdout, 20),
      stderrTail: extractTailLines(res.stderr, 10),
    };
  } catch (err) {
    return {
      command: cmd,
      exitCode: "error",
      stdoutTail: [],
      stderrTail: extractTailLines(err instanceof Error ? err.message : String(err), 10),
    };
  }
}

/** 顺序执行全部 DoD 命令。单条失败不中断——父级要看到完整的验收面。 */
export function runDoDCommands(
  commands: readonly string[] | undefined,
  cwd: string | undefined,
  deps: DoDDeps = {}
): DoDCommandResult[] | undefined {
  if (!commands || commands.length === 0) return undefined;
  return commands.map((cmd) => executeDoDCommand(cmd, cwd, deps));
}

/** `3/3 passed` / `2/3 passed (1 failed)`——给唤醒消息用的一行摘要。 */
export function summarizeDoDResults(
  results: readonly DoDCommandResult[] | undefined
): string | undefined {
  if (!results || results.length === 0) return undefined;
  const passed = results.filter((r) => r.exitCode === 0).length;
  const failed = results.length - passed;
  return failed === 0
    ? `${passed}/${results.length} passed`
    : `${passed}/${results.length} passed (${failed} failed)`;
}
