// packages/cli/client/localRunArtifactExport.ts
//
// 块ART2：CLI 本地 docker 通道的 **run 终态导出绑定**（把 agent-runtime 的
// 通用导出逻辑接到本机 runsDir 审计与本地产物目录上）。
//
// 落点口径沿用既有本地 run 约定（`resolveRunsDir(env)` = `<NOLO_HOME>/runs`）：
//   - 审计：`<runsDir>/<runId>.artifacts.json`（与 `<runId>.json` /
//     `<runId>.isolation.json` 同目录、同命名风格）；
//   - 字节：`<NOLO_HOME>/artifacts`（runs 的同级目录），经 ArtifactStore 落盘，
//     审计里只留 ref（key / sizeBytes / contentType / createdAt）。
//
// 顺序契约（唯一重要的那一条）：导出必须在 `release()` **之前**——沙盒一旦
// 释放，通道就没了，再想取 diff 也取不到；同时导出失败绝不能阻断 release
// （沙盒不释放会一直计费）。`createDockerRunTeardown` 就固定了这个顺序。

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  createLocalArtifactStore,
  type ArtifactRef,
  type ArtifactStore,
} from "agent-runtime/artifactStore";
import {
  exportRunDiffArtifact,
  exportRunWorktreeDiffArtifacts,
  runDiffArtifactKey,
  serializeRunArtifactAudit,
  type RunArtifactAuditRecord,
} from "agent-runtime/runArtifactExport";

export type RunArtifactAuditFs = {
  mkdirSync?: (path: string, options?: { recursive?: boolean }) => unknown;
  writeFileSync: (path: string, data: string) => unknown;
};

/** 产物目录：runs 的同级 `artifacts/`（`<NOLO_HOME>/artifacts`）。 */
export function resolveRunArtifactsRootDir(runsDir: string): string {
  // 先剥尾部分隔符：`dirname("<…>/runs/")` 会退到 `<…>` 上一级，把
  // 「带斜杠的同一个目录」误判成不同的落点（实测踩过）。
  const normalized = runsDir.replace(/[/\\]+$/, "");
  return join(dirname(normalized || runsDir), "artifacts");
}

/** 写 ref 审计；返回落盘路径（测试与调用方都据此断言/记录）。 */
export function writeRunArtifactAudit(args: {
  runsDir: string;
  record: RunArtifactAuditRecord;
  fs?: RunArtifactAuditFs;
}): string {
  const fs = args.fs ?? { mkdirSync, writeFileSync };
  const path = join(args.runsDir, `${args.record.runId}.artifacts.json`);
  fs.mkdirSync?.(args.runsDir, { recursive: true });
  fs.writeFileSync(path, serializeRunArtifactAudit(args.record));
  return path;
}

export type DockerRunTerminalExportArgs = {
  runId: string;
  runsDir: string;
  /** docker 工具通道上的 execShell：`(command) => channel("execShell", { command })`。 */
  exec: (command: string) => Promise<string>;
  store?: ArtifactStore;
  /** 缺省 `<runsDir>/../artifacts`。 */
  artifactsRootDir?: string;
  createStore?: (rootDir: string) => ArtifactStore;
  fs?: RunArtifactAuditFs;
  warn?: (message: string) => void;
};

/** 组装「取 diff → 存产物 → 写审计」三件事，返回一个幂等可调的导出函数。 */
export function createDockerRunTerminalExport(
  args: DockerRunTerminalExportArgs,
): () => Promise<ArtifactRef | null> {
  return async () => {
    const warn = args.warn ?? (() => {});
    const store =
      args.store ??
      (args.createStore ?? ((rootDir: string) => createLocalArtifactStore({ rootDir })))(
        args.artifactsRootDir ?? resolveRunArtifactsRootDir(args.runsDir),
      );

    // 根工作区 diff（保持原语义：空 diff 不产出）。
    const rootRef = await exportRunDiffArtifact({
      runId: args.runId,
      store,
      exec: args.exec,
      warn,
    });

    // 被 .gitignore 忽略的 `.worktrees/<name>` 改动：根 diff 看不见它们，
    // 必须按 worktree 逐个导出，否则沙盒释放后产出彻底消失（见 2026-10-19 事故）。
    const worktrees = await exportRunWorktreeDiffArtifacts({
      runId: args.runId,
      store,
      exec: args.exec,
      warn,
    });

    const firstWorktreeRef = worktrees.artifacts[0]?.ref ?? null;
    const ref = rootRef ?? firstWorktreeRef;

    // 只要有产物就写审计（根工作区无改动、只有 worktree 有改动时也要留证）。
    if (rootRef || worktrees.artifacts.length > 0) {
      try {
        writeRunArtifactAudit({
          runsDir: args.runsDir,
          record: {
            runId: args.runId,
            kind: "diff",
            key: rootRef ? runDiffArtifactKey(args.runId) : null,
            ref: rootRef,
            worktrees: worktrees.artifacts,
          },
          fs: args.fs,
        });
      } catch (error) {
        // 审计是证据增强，不是产物成立条件：写不进磁盘也不能把已有 patch 吞掉。
        const detail = error instanceof Error ? error.message : String(error);
        warn(`run 终态导出审计写入失败（不影响 run 结果）：${detail}`);
      }
    }

    if (worktrees.worktrees > 0) {
      warn(
        `[nolo] run 终态导出：根工作区 ${rootRef ? 1 : 0} 个 patch、` +
          `worktree ${worktrees.artifacts.length}/${worktrees.worktrees} 个 patch 已存产物层`,
      );
    }

    return ref;
  };
}

/**
 * adapter 注入缝：一次调用完成「取 diff → 存产物 → 写审计」，等价于
 * `createDockerRunTerminalExport(args)()`。任何失败返回 null（只 warning）。
 */
export async function exportDockerRunDiffArtifact(
  args: DockerRunTerminalExportArgs,
): Promise<ArtifactRef | null> {
  return await createDockerRunTerminalExport(args)();
}

/**
 * run 收尾：**先导出、后释放**。导出异常只 warning 并继续释放；释放本身失败
 * 照旧向上抛（那是有后果的失败，不能被吞掉）。
 */
export function createDockerRunTeardown(args: {
  exportDiff: () => Promise<ArtifactRef | null>;
  release: () => Promise<void>;
  warn?: (message: string) => void;
}): () => Promise<void> {
  const warn = args.warn ?? (() => {});
  return async () => {
    try {
      await args.exportDiff();
    } catch (error) {
      warn(
        `run 终态导出异常（不影响 run 结果）：${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    await args.release();
  };
}
