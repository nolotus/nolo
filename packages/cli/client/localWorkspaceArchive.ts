// packages/cli/client/localWorkspaceArchive.ts
//
// 块K / 块F2：CLI 本地 docker 通道的**宿主侧投送准备**——把「当前宿主工作区」打成
// **git bundle（主路径）** 或 tar.gz（fallback），连同 review 基线（HEAD + `git diff`）
// 一起交给共享的 `applyDockerWorkspaceDelivery`。
//
// 为什么必须在这里打归档：服务端 run 通道的 `workspaceInit` 由请求方（客户端）提供，
// 归档路径与体量由调用方负责；CLI 本地 run 没有这个调用方，只有「本机 cwd 的仓库」。
// 于是本地通道自己生成等价选择：归档 + 文件数 + 字节数 + 基分支 + 基线。
//
// 路径选择（块F2）：
//   - **bundle（主路径）**：`git bundle create <tmp>/x.bundle --all` → 沙盒 `git clone` →
//     沙盒里是**真仓库**（真实历史 + 全部分支 + 可 `git worktree` + 可对真基线 diff）。
//     仍不含任何凭证：bundle 是本地文件，不是远程 URL。
//   - **tar（fallback）**：只在宿主侧**生成阶段**不可行时使用（detached HEAD 取不到
//     base 分支名 / bundle 超体积上限 / `git bundle` 失败），降级原因经 `report.fallbackReason`
//     带出去 —— 显式降级，不是静默兜底。
//   - tar 口径（与块I 实测一致）：只打 `git ls-files` 的路径（`.git/`、`node_modules/`、
//     未跟踪产物都不进归档），内容是**工作树原文**（含未提交改动），归档不含 `.git`，
//     所以基线（head sha + diff）单独投送（见 sandboxWorkspaceDelivery）。
//
// fail-closed：两条路径都拿不到可用投送物 → 返回带 code 的显式失败，调用方拒绝启动 run
// ——绝不带着空工作区进入工具循环（那会产出假改动）。

import { spawnSync } from "node:child_process";
import { mkdtempSync, statSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { DockerWorkspaceInitSelection } from "../../server/handlers/agentRun/docker/applyDockerWorkspaceDelivery";
import {
  MAX_BASELINE_DIFF_CHARS,
  MAX_DELIVERY_ARCHIVE_BYTES,
  MAX_DELIVERY_FILE_COUNT,
  type WorkspaceGitBaseline,
} from "../../server/handlers/agentRun/docker/sandboxWorkspaceDelivery";

/** 宿主命令结果（结构类型：默认实现用 `spawnSync`，测试注入替身）。 */
export type HostCommandResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
};

/** 宿主命令执行器注入缝。 */
export type HostCommandRunner = (
  argv: readonly string[],
  options: { cwd: string },
) => HostCommandResult;

/** 默认执行器：`git` / `tar` 都是本机既有命令，同步跑（run 开始前的一次性准备）。 */
const runHostCommand: HostCommandRunner = (argv, { cwd }) => {
  const result = spawnSync(argv[0] as string, argv.slice(1), {
    cwd,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  const stdout = typeof result.stdout === "string" ? result.stdout : "";
  const stderr = typeof result.stderr === "string" ? result.stderr : "";
  if (result.error) {
    return { ok: false, stdout, stderr: `${stderr}${result.error.message}`, exitCode: null };
  }
  return { ok: result.status === 0, stdout, stderr, exitCode: result.status ?? null };
};

export type HostWorkspaceDeliveryFailureCode =
  | "host_workspace_root_invalid"
  | "host_workspace_not_a_git_repo"
  | "host_workspace_head_unresolved"
  | "host_workspace_archive_empty"
  | "host_workspace_archive_failed"
  | "host_workspace_archive_too_large"
  | "host_workspace_file_count_exceeded"
  | "host_workspace_baseline_failed"
  | "host_workspace_baseline_too_large";

/** 实际采用的投送路径：`bundle` = 真仓库（真实历史 + 全部分支）；`tar` = 快照 fallback。 */
export type WorkspaceDeliveryPath = "bundle" | "tar";

/**
 * 「用了哪条」的结构化记录：调用方/日志据此分辨本次投送是 bundle 还是 tar 降级，
 * 以及降级原因。**降级只发生在宿主侧生成阶段**（例如 detached HEAD 取不到 base 分支名），
 * 沙盒侧的投送 / clone 失败一律 fail-closed，绝不降级（那会静默产出无历史的工作区）。
 */
export type WorkspaceDeliveryReport = {
  chosen: WorkspaceDeliveryPath;
  /** 为什么没用首选路径（只在使用 tar 且首选是 bundle 时出现）。 */
  fallbackReason?: string;
  /** 本次投送物的字节数（bundle 或 tar.gz）。 */
  sizeBytes: number;
  /** 归档内文件数（`git ls-files` 口径）。 */
  fileCount: number;
  /** 该路径投送后沙盒里是否有真实 git 历史（bundle=true，tar=false：单 commit 快照）。 */
  realGitHistory: boolean;
};

export type HostWorkspaceDeliveryPreparation =
  | {
      ok: true;
      /** 交给 `applyDockerWorkspaceDelivery` 的选择（bundle 优先，tar 为 fallback）。 */
      selection: DockerWorkspaceInitSelection;
      /** 实际走的是哪条路径。 */
      deliveryPath: WorkspaceDeliveryPath;
      /** 实际投送物在宿主上的绝对路径（bundle 策略为 `.bundle`，tar 为 `.tar.gz`）。 */
      archivePath: string;
      fileCount: number;
      archiveSizeBytes: number;
      /** 「用了哪条 + 为什么」的结构化记录，供调用方落日志。 */
      report: WorkspaceDeliveryReport;
      /** 投送结束后删掉宿主临时投送物与文件列表（删失败不影响 run）。 */
      cleanup: () => Promise<void>;
    }
  | { ok: false; code: HostWorkspaceDeliveryFailureCode; message: string };

const SHA_PATTERN = /^[0-9a-f]{40}$/;

const fail = (
  code: HostWorkspaceDeliveryFailureCode,
  message: string,
): HostWorkspaceDeliveryPreparation => ({ ok: false, code, message });

/**
 * 打包宿主工作区并生成投送选择。**同步**（`spawnSync`）：本函数在 run 开始前调用一次，
 * 目的是让「打不了包」这件事在工具循环之前就显式失败。
 */
export type HostWorkspaceDeliveryRequest = {
  workspaceRoot: string;
  /** 宿主临时目录（缺省 os.tmpdir）。 */
  tmpDir?: string;
  /** 投送路径偏好：缺省 `bundle`（主路径）；显式传 `tar` 可强制走快照 fallback。 */
  deliveryPath?: WorkspaceDeliveryPath;
  /** 注入缝：宿主命令执行器（缺省 `spawnSync`）。 */
  run?: HostCommandRunner;
  /** 注入缝：清理实现（缺省 `node:fs/promises rm`）。 */
  removeFile?: (filePath: string) => Promise<void>;
};

export function prepareHostWorkspaceDelivery(
  args: HostWorkspaceDeliveryRequest,
): HostWorkspaceDeliveryPreparation {
  const root = args.workspaceRoot;
  // 参数形状守卫：调用方若按位置传字符串（或漏传 options），`args.workspaceRoot`
  // 会是 undefined —— 那样 `git` 会退回 `process.cwd()`（守卫全过），
  // 而 `tar -C undefined` 会在打包那一刻才炸出「tar: undefined：无法 open」。
  // 这里就地 fail-closed，报出真正的病因（2026-10-07 实测踩坑）。
  if (typeof root !== "string" || root.length === 0) {
    return fail(
      "host_workspace_root_invalid",
      `prepareHostWorkspaceDelivery 需要 { workspaceRoot } 选项对象，收到的 workspaceRoot 是 `
      + `${JSON.stringify(root)}：投送来源不明确时无法打包（拒绝用 process.cwd() 兜底）。`,
    );
  }
  const run = args.run ?? runHostCommand;

  const insideWorkTree = run(["git", "rev-parse", "--is-inside-work-tree"], { cwd: root });
  if (!insideWorkTree.ok || insideWorkTree.stdout.trim() !== "true") {
    return fail(
      "host_workspace_not_a_git_repo",
      `投送来源 ${root} 不是 git 工作树（git rev-parse --is-inside-work-tree 未返回 true）：`
      + "没有可投送的仓库。请在仓库目录里运行，或改用服务端通道。",
    );
  }

  const head = run(["git", "rev-parse", "HEAD"], { cwd: root });
  const headSha = head.stdout.trim();
  if (!head.ok || !SHA_PATTERN.test(headSha)) {
    return fail(
      "host_workspace_head_unresolved",
      `无法解析 ${root} 的 HEAD（git rev-parse HEAD）：没有基线就没有 review 判据。`,
    );
  }

  const listed = run(["git", "ls-files", "-z"], { cwd: root });
  if (!listed.ok) {
    return fail(
      "host_workspace_archive_failed",
      `git ls-files 失败（exit=${String(listed.exitCode)}）：${listed.stderr.slice(0, 200)}`,
    );
  }
  const tracked = listed.stdout.split("\0").filter((entry) => entry.length > 0);
  if (tracked.length === 0) {
    return fail(
      "host_workspace_archive_empty",
      `${root} 里 git ls-files 没有任何文件：空归档等于空工作区，拒绝投送。`,
    );
  }
  if (tracked.length > MAX_DELIVERY_FILE_COUNT) {
    return fail(
      "host_workspace_file_count_exceeded",
      `工作区文件数 ${tracked.length} 超过上限 ${MAX_DELIVERY_FILE_COUNT}：`
      + "疑似把 node_modules / 构建产物打进了归档（归档只取 git ls-files）。",
    );
  }

  const stagingDir = mkdtempSync(join(args.tmpDir ?? tmpdir(), "nolo-workspace-delivery-"));
  const stamp = `${process.pid}-${Date.now()}`;
  const archivePath = join(stagingDir, `workspace-${stamp}.tar.gz`);
  const bundlePath = join(stagingDir, `workspace-${stamp}.bundle`);
  const listPath = join(stagingDir, `filelist-${stamp}.z`);
  const removeFile = args.removeFile
    ?? (async (filePath: string) => {
      await rm(filePath, { force: true });
    });
  let stagingRemoved = false;
  const cleanup = async (): Promise<void> => {
    if (stagingRemoved) return;
    stagingRemoved = true;
    await removeFile(archivePath).catch(() => undefined);
    await removeFile(bundlePath).catch(() => undefined);
    await removeFile(listPath).catch(() => undefined);
  };

  // review 判据（HEAD + `git diff`）两条路径共用：bundle 与 tar 都要它。
  const diff = run(["git", "diff"], { cwd: root });
  if (!diff.ok) {
    return fail(
      "host_workspace_baseline_failed",
      `git diff 失败（exit=${String(diff.exitCode)}）：${diff.stderr.slice(0, 200)}`,
    );
  }
  if (diff.stdout.length > MAX_BASELINE_DIFF_CHARS) {
    return fail(
      "host_workspace_baseline_too_large",
      `宿主 git diff 有 ${diff.stdout.length} 字符，超过基线上限 ${MAX_BASELINE_DIFF_CHARS}。`,
    );
  }

  const requested = args.deliveryPath ?? "bundle";
  let fallbackReason: string | undefined;

  // ---- 主路径：git bundle（真实历史 + 全部分支 + 可 worktree / 可对真基线 diff）----
  if (requested === "bundle") {
    const bundled = buildHostBundle({ run, root, bundlePath });
    if (bundled.ok) {
      const gitBaseline: WorkspaceGitBaseline = {
        headSha,
        diffText: diff.stdout,
        fileCount: tracked.length,
        archiveSizeBytes: bundled.sizeBytes,
      };
      return {
        ok: true,
        deliveryPath: "bundle",
        archivePath: bundlePath,
        fileCount: tracked.length,
        archiveSizeBytes: bundled.sizeBytes,
        report: {
          chosen: "bundle",
          sizeBytes: bundled.sizeBytes,
          fileCount: tracked.length,
          realGitHistory: true,
        },
        selection: {
          strategy: "bundle",
          gitBundlePath: bundlePath,
          gitBundleSizeBytes: bundled.sizeBytes,
          baseBranch: bundled.baseBranch,
          fileCount: tracked.length,
          gitBaseline,
        },
        cleanup,
      };
    }
    // 宿主侧生成阶段不可行 → **显式**降级到 tar 快照，并把原因带出去（不静默）。
    fallbackReason = bundled.reason;
  }

  // ---- fallback：tar 快照（只有 `git ls-files` 的白树，无 `.git`）----
  try {
    // NUL 分隔：文件名里的换行 / 空格不会把列表拆错（tar 侧用 --null 对齐）。
    writeFileSync(listPath, listed.stdout, "utf8");
    const tarred = run(
      ["tar", "-czf", archivePath, "-C", root, "--null", "-T", listPath],
      { cwd: root },
    );
    if (!tarred.ok) {
      return fail(
        "host_workspace_archive_failed",
        `tar 打包失败（exit=${String(tarred.exitCode)}）：${tarred.stderr.slice(0, 300)}`,
      );
    }
  } catch (error) {
    return fail(
      "host_workspace_archive_failed",
      `tar 打包异常：${error instanceof Error ? error.message : String(error)}`,
    );
  }

  let archiveSizeBytes = 0;
  try {
    archiveSizeBytes = statSync(archivePath).size;
  } catch (error) {
    return fail(
      "host_workspace_archive_failed",
      `归档未生成：${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (archiveSizeBytes <= 0 || archiveSizeBytes > MAX_DELIVERY_ARCHIVE_BYTES) {
    return fail(
      "host_workspace_archive_too_large",
      `归档大小 ${archiveSizeBytes} 超出允许范围（上限 ${MAX_DELIVERY_ARCHIVE_BYTES} 字节）。`,
    );
  }

  const gitBaseline: WorkspaceGitBaseline = {
    headSha,
    diffText: diff.stdout,
    fileCount: tracked.length,
    archiveSizeBytes,
  };

  return {
    ok: true,
    deliveryPath: "tar",
    archivePath,
    fileCount: tracked.length,
    archiveSizeBytes,
    report: {
      chosen: "tar",
      ...(fallbackReason !== undefined ? { fallbackReason } : {}),
      sizeBytes: archiveSizeBytes,
      fileCount: tracked.length,
      realGitHistory: false,
    },
    selection: {
      strategy: "tar",
      tarArchivePath: archivePath,
      tarArchiveSizeBytes: archiveSizeBytes,
      fileCount: tracked.length,
      gitBaseline,
    },
    cleanup,
  };
}

/**
 * 生成宿主 git bundle（`git bundle create <path> --all` = 全部分支 + tag + HEAD）。
 * 纯生成，不触盘校验由调用方的 `statSync` 负责。
 *
 * 返回 `{ ok:false, reason }` 表示**生成阶段不可行**（不是投送失败）——调用方据此
 * 显式降级到 tar 并把 reason 带进结果；投送 / clone 阶段的失败与此无关，一律 fail-closed。
 */
function buildHostBundle(args: {
  run: HostCommandRunner;
  root: string;
  bundlePath: string;
}): { ok: true; sizeBytes: number; baseBranch: string } | { ok: false; reason: string } {
  const branch = args.run(["git", "rev-parse", "--abbrev-ref", "HEAD"], { cwd: args.root });
  const baseBranch = branch.stdout.trim();
  if (!branch.ok || baseBranch.length === 0 || baseBranch === "HEAD") {
    return {
      ok: false,
      reason: "base 分支名取不到（git rev-parse --abbrev-ref HEAD 返回 "
        + `${JSON.stringify(branch.stdout.trim())}）：detached HEAD 下没有可 checkout 的基分支。`,
    };
  }

  const bundled = args.run(["git", "bundle", "create", args.bundlePath, "--all"], { cwd: args.root });
  if (!bundled.ok) {
    return {
      ok: false,
      reason: `git bundle create --all 失败（exit=${String(bundled.exitCode)}）：`
        + `${bundled.stderr.slice(0, 200)}`,
    };
  }

  let sizeBytes = 0;
  try {
    sizeBytes = statSync(args.bundlePath).size;
  } catch (error) {
    return {
      ok: false,
      reason: `bundle 未生成：${error instanceof Error ? error.message : String(error)}`,
    };
  }
  if (sizeBytes <= 0 || sizeBytes > MAX_DELIVERY_ARCHIVE_BYTES) {
    return {
      ok: false,
      reason: `bundle 大小 ${sizeBytes} 超出允许范围（上限 ${MAX_DELIVERY_ARCHIVE_BYTES} 字节）。`,
    };
  }
  return { ok: true, sizeBytes, baseBranch };
}
