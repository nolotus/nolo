// packages/agent-runtime/workspaceSource.ts
//
// 块ART2：工作区来源三态。投送（delivery）的**前提**被显式建模成三种来源，
// 而不是「默认有个仓库」：
//
//   - `git`   ：仓库型任务。归档口径沿用既有 tar 通道（`createGitArchive`
//               注入现有实现），本模块不重写打包逻辑；
//   - `files` ：非代码任务。产物已经在 ArtifactStore 里，投送 = 从 store
//               下载到目标目录；**不塞仓库、不需要 git**；
//   - `empty` ：不需要工作区（纯推理 / 只读外部服务的任务）。不投送任何
//               东西，也不去碰 store。
//
// 为什么要三态：把「非代码任务」硬塞进仓库，会产出一个空仓库 + 一份无意义的
// `git diff`，让「这次 run 有没有真实改动」变得不可判读。三态让「没有工作区」
// 成为一个**可审计的声明**（`plan.kind === "none"`），而不是缺席。
//
// fail-closed：需要而拿不到（git 归档实现缺失 / store 缺失 / 产物不存在 /
// 落盘失败）都返回带 code 的显式失败，由调用方中止 run——绝不带着空工作区
// 进工具循环。

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { assertArtifactKey, type ArtifactStore } from "./artifactStore";

export type WorkspaceSource =
  | { kind: "git"; repoPath: string }
  | { kind: "files"; artifacts: string[] }
  | { kind: "empty" };

/** 既有 tar 通道的返回值（`prepareHostWorkspaceDelivery` 的归档部分）。 */
export type GitWorkspaceArchive = {
  archivePath: string;
  fileCount: number;
  sizeBytes: number;
};

export type WorkspaceDeliveryPlan =
  | {
      kind: "tar";
      repoPath: string;
      archivePath: string;
      fileCount: number;
      sizeBytes: number;
    }
  | {
      kind: "files";
      targetDir: string;
      files: { artifact: string; path: string; sizeBytes: number }[];
      totalBytes: number;
    }
  | { kind: "none"; reason: "empty_source" };

export type WorkspaceDeliveryFailureCode =
  | "git_archive_unavailable"
  | "git_archive_failed"
  | "artifact_store_unavailable"
  | "artifact_missing"
  | "artifact_write_failed"
  | "files_source_empty";

export type WorkspaceDeliveryResult =
  | { ok: true; plan: WorkspaceDeliveryPlan }
  | { ok: false; code: WorkspaceDeliveryFailureCode; message: string };

export type PrepareWorkspaceDeliveryArgs = {
  source: WorkspaceSource;
  /** files 源的落盘根目录（沙盒内的工作目录）；git/empty 源不使用它。 */
  targetDir: string;
  store?: ArtifactStore;
  /** git 源必须注入：既有 tar 通道（CLI: `prepareHostWorkspaceDelivery`）。 */
  createGitArchive?: (args: { repoPath: string }) => Promise<GitWorkspaceArchive>;
  writeFileImpl?: (path: string, data: Uint8Array) => Promise<void>;
  mkdirp?: (dir: string) => Promise<void>;
};

/** 审计用的人话描述：来源种类 + 规模，不含路径明文之外的额外信息。 */
export function describeWorkspaceSource(source: WorkspaceSource): string {
  switch (source.kind) {
    case "git":
      return `git（仓库投送，tar 归档）`;
    case "files":
      return `files（${source.artifacts.length} 个产物从产物层下载，不投送仓库）`;
    case "empty":
      return "empty（不投送工作区）";
  }
}

function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.length > 200 ? `${message.slice(0, 200)}…` : message;
}

function fail(code: WorkspaceDeliveryFailureCode, message: string): WorkspaceDeliveryResult {
  return { ok: false, code, message };
}

function isNotFound(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === "not_found";
}

export async function prepareWorkspaceDelivery(
  args: PrepareWorkspaceDeliveryArgs,
): Promise<WorkspaceDeliveryResult> {
  const { source } = args;

  if (source.kind === "empty") {
    // 不投送、不碰 store：这就是「本 run 无工作区」的显式结论。
    return { ok: true, plan: { kind: "none", reason: "empty_source" } };
  }

  if (source.kind === "git") {
    const repoPath = source.repoPath?.trim();
    if (!repoPath) {
      return fail("git_archive_failed", "git 工作区来源的 repoPath 为空。");
    }
    if (!args.createGitArchive) {
      return fail(
        "git_archive_unavailable",
        "git 工作区来源需要注入 createGitArchive（既有 tar 归档通道）；未注入时拒绝投送，"
          + "以免带着空工作区进工具循环。",
      );
    }
    try {
      const archive = await args.createGitArchive({ repoPath });
      return {
        ok: true,
        plan: {
          kind: "tar",
          repoPath,
          archivePath: archive.archivePath,
          fileCount: archive.fileCount,
          sizeBytes: archive.sizeBytes,
        },
      };
    } catch (error) {
      return fail("git_archive_failed", `git 归档失败：${describeError(error)}`);
    }
  }

  // files：非代码任务，只从产物层取字节，不碰仓库。
  if (source.artifacts.length === 0) {
    return fail(
      "files_source_empty",
      "files 工作区来源的产物列表为空：空列表不是「非代码任务」，请用 { kind: \"empty\" } 明确表达。",
    );
  }
  if (!args.store) {
    return fail(
      "artifact_store_unavailable",
      "files 工作区来源需要 ArtifactStore 才能下载产物；未提供 store。",
    );
  }
  const store = args.store;
  const write = args.writeFileImpl ?? (async (path, data) => { await writeFile(path, data); });
  const mkdirp = args.mkdirp ?? (async (dir) => { await mkdir(dir, { recursive: true }); });

  const files: { artifact: string; path: string; sizeBytes: number }[] = [];
  let totalBytes = 0;
  for (const artifact of source.artifacts) {
    try {
      assertArtifactKey(artifact);
    } catch {
      return fail("artifact_missing", `产物 key 非法，拒绝投送：${artifact.slice(0, 200)}`);
    }
    let bytes: Uint8Array;
    try {
      bytes = await store.get(artifact);
    } catch (error) {
      return fail(
        isNotFound(error) ? "artifact_missing" : "artifact_write_failed",
        `${isNotFound(error) ? "产物不存在" : "产物下载失败"}：${artifact}（${describeError(error)}）`,
      );
    }
    const destination = join(args.targetDir, artifact);
    try {
      await mkdirp(dirname(destination));
      await write(destination, bytes);
    } catch (error) {
      return fail(
        "artifact_write_failed",
        `产物落盘失败：${destination}（${describeError(error)}）`,
      );
    }
    files.push({ artifact, path: destination, sizeBytes: bytes.byteLength });
    totalBytes += bytes.byteLength;
  }

  return {
    ok: true,
    plan: { kind: "files", targetDir: args.targetDir, files, totalBytes },
  };
}
