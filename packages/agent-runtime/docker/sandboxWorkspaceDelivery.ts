/**
 * 宿主仓库 → 沙盒工作区的**投送计划**（块I：仓库投送 + git 可用）。
 *
 * 通道选择（实测支撑，见块I 探测记录）：
 * - **投送一律走 `sbx --cloud cp`**（Docker Cloud file API，双向、目录递归原生支持）。
 *   不用 base64 分块：单次 exec 的 argv 参数实测上限约 64KB（更大会被宿主 E2BIG
 *   拒绝：`/usr/bin/bash: 参数列表过长`），本仓归档 38MB → 5079 万 base64 字符 →
 *   约 16931 次 exec，不可行。同理，`git diff` 基线可能到 MB 级，也走 cp 而**不是**
 *   内联 base64。
 * - **解包 / 装 git / 建基线快照走 `exec`**（`sbx --cloud exec`）。
 *
 * 为什么是「tar 投送」而不是「沙盒内 git clone」→ **块F2 更新为 bundle 主路径 + tar fallback**：
 * - **bundle（主路径）**：宿主 `git bundle create --all` 产出自包含对象包 → `cp` 投送 →
 *   沙盒 `git clone <bundle>` 得到**真实历史与全部分支** → `git checkout <baseBranch>`。
 *   于是 agent 能 `git worktree`、能对真基线 diff —— 这是「单 commit 快照」做不到的。
 * - 仍然**不**走「容器内 clone 私有 URL」：被投送的仓库是本机私有工作区，容器内 clone
 *   远程 URL 必须带凭证，而 `dockerWorkspaceInit.ts` 的凭证边界明确拒绝「URL 内嵌凭证」
 *   与 `credential` 字段（fail-closed）。bundle 把**仓库本身当文件**投送 → 完全凭证无关。
 * - **tar（fallback）**：宿主 `git ls-files` + `tar -czf` 出快照（不含 `.git`）。当 bundle
 *   生成不可行（如 detached HEAD 取不到 base 分支名）时，由宿主侧**显式**降级到它并把
 *   降级原因带在结果里；沙盒内的投送 / clone 失败**绝不**降级（见文件末尾 fail-closed 语义）。
 * - 实测：`docker.io/oven/bun:<ver>` 镜像内**没有 git / node / npm / curl**，但有
 *   `apt-get`，且 `apt-get install -y --no-install-recommends git` 在云沙盒内实测成功。
 *   所以两条路径都要显式装 git（bundle 的 clone 与 tar 的快照 / diff 都依赖它）。
 *
 * 本模块**只做规划**：不读磁盘、不跑 sbx、不发网络请求、不写日志。所有拒绝路径 fail-closed。
 *
 * 失败语义（块I 硬要求）：体积超限 / 文件数超限 / 归档缺失 / 基线非法 → 显式失败并把
 * 可操作原因带出去，**绝不**降级成「空工作区继续跑」——那会产出假 diff。
 */

import {
    WORKSPACE_ROOT,
    resolveWorkspaceInitPlan,
    type WorkspaceInitPlan,
    type WorkspaceInitStrategy,
} from "./dockerWorkspaceInit";

/** 归档与基线在沙盒内的落地目录（与 tar 计划的 `TAR_ARCHIVE_REMOTE_DIR` 同一处）。 */
export const SANDBOX_DELIVERY_DIR = "/tmp/nolo-workspace-init";

/** diff 基线落在**工作区之外**：它属于 review 证据，不能污染被投送的仓库树。 */
export const SANDBOX_GIT_BASELINE_PATH = `${SANDBOX_DELIVERY_DIR}/baseline.json`;

/** 单次投送的归档上限（512 MiB，与 `MAX_TAR_ARCHIVE_BYTES` 同口径）。 */
export const MAX_DELIVERY_ARCHIVE_BYTES = 512 * 1024 * 1024;

/** 单次投送的文件数上限：防把 node_modules 之类误打进归档。 */
export const MAX_DELIVERY_FILE_COUNT = 200_000;

/** 基线 JSON 里 diff 文本的字符上限（超出即拒绝，不做静默截断）。 */
export const MAX_BASELINE_DIFF_CHARS = 8_000_000;

const SHA_PATTERN = /^[0-9a-f]{40}$/;

export type WorkspaceDeliveryFailureCode =
    | "invalid-archive"
    | "archive-too-large"
    | "invalid-bundle"
    | "bundle-too-large"
    | "file-count-exceeded"
    | "invalid-baseline";

const SAFE_MESSAGE: Record<WorkspaceDeliveryFailureCode, string> = {
    "invalid-archive": "workspace delivery archive is missing or malformed",
    "archive-too-large": "workspace delivery archive exceeds the size limit",
    "invalid-bundle": "workspace delivery git bundle is missing or malformed",
    "bundle-too-large": "workspace delivery git bundle exceeds the size limit",
    "file-count-exceeded": "workspace delivery archive exceeds the file-count limit",
    "invalid-baseline": "workspace delivery baseline (head sha / diff) is malformed or too large",
};

export type WorkspaceDeliveryFailure = {
    ok: false;
    code: WorkspaceDeliveryFailureCode;
    message: string;
};

/** 投送成功后落在沙盒里的 review 判据。 */
export type WorkspaceGitBaseline = {
    headSha: string;
    /** 宿主 `git diff`（含未暂存改动）的原文；tar 归档不含 `.git`，这是唯一 diff 判据。 */
    diffText: string;
    /** 归档里的文件数（与宿主 `git ls-files` 口径一致）。 */
    fileCount: number;
    /** 归档字节数；调用方 stat 得到，本模块不触盘。 */
    archiveSizeBytes: number;
};

/** 需要经 `sbx --cloud cp` 投送的一个文件（宿主路径 → 沙盒路径）。 */
export type WorkspaceDeliveryUpload = {
    localPath: string;
    remotePath: string;
};

export type WorkspaceDeliveryPlan = {
    /** 本次投送实际走的是哪条路径（bundle = 真仓库；tar = 快照 fallback）。 */
    strategy: WorkspaceInitStrategy;
    /** 复用既有 init 计划：一个 upload 步骤（宿主 → 沙盒）+ 一个解包 / clone exec 步骤。 */
    init: WorkspaceInitPlan;
    /** 归档投送（bundle / tar 有且只有一个；empty / gitClone 为 null）。 */
    archiveUpload: WorkspaceDeliveryUpload | null;
    /**
     * 基线文件投送（tar 策略）：内容由调用方落成一个宿主临时文件后 cp 进沙盒。
     * `content` 是完整 JSON 文本，避免调用方自己再拼一遍口径。
     */
    baselineUpload: (WorkspaceDeliveryUpload & { content: string }) | null;
    /**
     * 装 git 的幂等步骤（`command -v git` 命中有即跳过）。镜像里没有 git，
     * 「git 可用」只能靠这一步显式建立；失败即 fail-closed。`empty` 策略为 null。
     */
    installGitArgv: string[] | null;
    /** 投送后必跑：确认解包/基线真的落地（失败即 fail-closed，不带着半成品起跑）。 */
    verifyArgv: string[];
    /**
     * 幂等构建 review 用的快照仓库：只在 `/workspace/.git` 不存在时 `git init` +
     * 全量提交。重复投送不会炸，也不会覆盖 agent 已有的改动历史。`empty` 为 null。
     */
    snapshotArgv: string[] | null;
};

export type WorkspaceDeliveryResolution =
    | { ok: true; plan: WorkspaceDeliveryPlan }
    | WorkspaceDeliveryFailure;

function failure(
    code: WorkspaceDeliveryFailureCode,
    extra?: Record<string, number>,
): WorkspaceDeliveryFailure {
    const base = SAFE_MESSAGE[code];
    const parts = extra
        ? Object.entries(extra)
            .filter(([, v]) => typeof v === "number" && Number.isFinite(v))
            .map(([k, v]) => `${k}=${String(v)}`)
        : [];
    return { ok: false, code, message: parts.length > 0 ? `${base} (${parts.join(", ")})` : base };
}

/** POSIX 单引号转义：脚本里每个变量都走这里，绝不裸拼。 */
function shQuote(token: string): string {
    return `'${String(token).replaceAll("'", `'\\''`)}'`;
}

/** 文件数校验（纯函数）。调用方在打包后把文件数传进来；缺省表示调用方自行把关。 */
export function validateDeliveryFileCount(fileCount?: number): { ok: true } | WorkspaceDeliveryFailure {
    if (fileCount === undefined) return { ok: true };
    if (!Number.isSafeInteger(fileCount) || fileCount <= 0) {
        return failure("file-count-exceeded", { maxFiles: MAX_DELIVERY_FILE_COUNT });
    }
    if (fileCount > MAX_DELIVERY_FILE_COUNT) {
        return failure("file-count-exceeded", { files: fileCount, maxFiles: MAX_DELIVERY_FILE_COUNT });
    }
    return { ok: true };
}

/** 基线校验（纯函数）：head sha 形态 + diff 长度上限。不做截断。 */
export function validateGitBaseline(
    baseline: WorkspaceGitBaseline | undefined,
): { ok: true } | WorkspaceDeliveryFailure {
    if (!baseline) return failure("invalid-baseline");
    if (typeof baseline.headSha !== "string" || !SHA_PATTERN.test(baseline.headSha)) {
        return failure("invalid-baseline");
    }
    if (typeof baseline.diffText !== "string") return failure("invalid-baseline");
    if (baseline.diffText.length > MAX_BASELINE_DIFF_CHARS) {
        return failure("invalid-baseline", {
            diffChars: baseline.diffText.length,
            maxChars: MAX_BASELINE_DIFF_CHARS,
        });
    }
    return { ok: true };
}

/**
 * 装 git 的幂等 argv：镜像 `docker.io/oven/bun:*` 自带 apt-get，但不带 git。
 * 装不上（无网络 / 源不可达）时退出码非 0 → 调用方 fail-closed。
 */
export function buildInstallGitArgv(): string[] {
    const script = [
        "if ! command -v git >/dev/null 2>&1; then",
        "  export DEBIAN_FRONTEND=noninteractive;",
        "  apt-get update >/dev/null 2>&1 && apt-get install -y --no-install-recommends git >/dev/null 2>&1;",
        "fi;",
        "command -v git >/dev/null 2>&1 || { echo 'sandbox-git-unavailable' >&2; exit 127; }",
        "git --version",
    ].join("\n");
    return ["bash", "-lc", script];
}

/** 基线 JSON 文本（基线文件的完整内容，交给调用方落成宿主临时文件）。 */
export function buildBaselineContent(baseline: WorkspaceGitBaseline): string {
    return JSON.stringify({
        headSha: baseline.headSha,
        fileCount: baseline.fileCount,
        archiveSizeBytes: baseline.archiveSizeBytes,
        diffText: baseline.diffText,
    });
}

/**
 * 幂等快照 argv：`/workspace/.git` 已存在就整体跳过（重复投送不炸、不覆盖 agent 改动）。
 * 归档不含 `.git`，所以「沙盒里能跑 `git status` / `git diff`」靠这一步建立。
 */
export function buildSnapshotArgv(headSha: string): string[] {
    const msg = `workspace snapshot ${headSha.slice(0, 12)}`;
    const script =
        `cd ${shQuote(WORKSPACE_ROOT)}`
        + ` && if [ ! -d .git ]; then`
        + ` git init -q -b main`
        + ` && git add -A .`
        + ` && git -c user.email=nolo@sandbox -c user.name=nolo commit -q -m ${shQuote(msg)};`
        + ` fi`
        + ` && git -C ${shQuote(WORKSPACE_ROOT)} rev-parse --short HEAD`;
    return ["bash", "-lc", script];
}

export type WorkspaceDeliveryInput = {
    strategy: WorkspaceInitStrategy;
    /** 宿主侧归档绝对路径（tar 策略必需）。 */
    tarArchivePath?: string;
    /** 调用方 stat 出来的归档字节数。 */
    tarArchiveSizeBytes?: number;
    /** 宿主 `git bundle create --all` 产出的对象包路径（bundle 策略必需）。 */
    gitBundlePath?: string;
    /** 调用方 stat 出来的 bundle 字节数。 */
    gitBundleSizeBytes?: number;
    /** clone 后要 checkout 的 base 分支名（bundle 策略必需）。 */
    baseBranch?: string;
    /** 归档内文件数（来自 `git ls-files`）。 */
    fileCount?: number;
    /** review 判据；tar 策略必需。 */
    gitBaseline?: WorkspaceGitBaseline;
    /** gitClone 策略：https 公开仓库 URL（透传给 `resolveWorkspaceInitPlan` 的校验）。 */
    repoUrl?: string;
    /** gitClone 策略：出站白名单放行门（透传；仅校验，不拼进 argv）。 */
    networkAllow?: readonly string[];
};

/**
 * 解析投送计划。顺序：文件数 → 归档（复用 `resolveWorkspaceInitPlan`：路径/大小/分支/argv
 * 白名单）→ 基线 → 组装步骤。任何一步拒绝都原样把 code 带出去，绝不降级成空工作区。
 *
 * `bundle` 与 `tar` 共用同一套投送骨架（一个 `cp` + 装 git + 快照守卫 + 校验），差别只在
 * init 步骤本身：`bundle` 是沙盒内 `git clone` 真仓库，`tar` 是解包快照。
 */
export function planWorkspaceDelivery(input: WorkspaceDeliveryInput): WorkspaceDeliveryResolution {
    if (!input || typeof input !== "object") return failure("invalid-baseline");

    const countCheck = validateDeliveryFileCount(input.fileCount);
    if (!countCheck.ok) return countCheck;

    // bundle 与 tar 都要两件事：review 判据（head sha + diff）、以及工作区里真的有 .git。
    const deliversRepository = input.strategy === "bundle" || input.strategy === "tar";
    if (deliversRepository) {
        if (!input.gitBaseline) return failure("invalid-baseline");
        const baselineCheck = validateGitBaseline(input.gitBaseline);
        if (!baselineCheck.ok) return baselineCheck;
    }

    const init = resolveWorkspaceInitPlan({
        strategy: input.strategy,
        workspaceRoot: WORKSPACE_ROOT,
        ...(input.tarArchivePath !== undefined ? { tarArchivePath: input.tarArchivePath } : {}),
        ...(input.tarArchiveSizeBytes !== undefined ? { tarArchiveSizeBytes: input.tarArchiveSizeBytes } : {}),
        ...(input.gitBundlePath !== undefined ? { gitBundlePath: input.gitBundlePath } : {}),
        ...(input.gitBundleSizeBytes !== undefined ? { gitBundleSizeBytes: input.gitBundleSizeBytes } : {}),
        ...(input.baseBranch !== undefined ? { baseBranch: input.baseBranch } : {}),
        ...(input.repoUrl !== undefined ? { repoUrl: input.repoUrl } : {}),
        ...(input.networkAllow !== undefined ? { networkAllow: input.networkAllow } : {}),
    });
    if (!init.ok) {
        // 归档缺失 / 形态非法 / 分支名非法 → 单独给「可操作原因」，不再笼统归到 init 失败。
        if (input.strategy === "bundle") {
            return failure(init.code === "git-bundle-too-large" ? "bundle-too-large" : "invalid-bundle");
        }
        return failure(init.code === "tar-archive-too-large" ? "archive-too-large" : "invalid-archive");
    }

    const archiveUpload = workspaceDeliveryUploadStep(init.plan);
    if (deliversRepository && !archiveUpload) {
        return failure(input.strategy === "bundle" ? "invalid-bundle" : "invalid-archive");
    }

    if (!deliversRepository) {
        // empty / gitClone 不走投送通道：保留 `resolveWorkspaceInitPlan` 原语义
        // （empty：只 mkdir；gitClone：容器内 clone）。gitClone 同样需要 git，所以
        // installGitArgv 非 null；但两者都不建快照（`.git` 由 clone 自带 / 本就不需要）。
        return {
            ok: true,
            plan: {
                strategy: input.strategy,
                init: init.plan,
                archiveUpload: null,
                baselineUpload: null,
                installGitArgv: input.strategy === "gitClone" ? buildInstallGitArgv() : null,
                verifyArgv: ["bash", "-lc", `test -d ${shQuote(WORKSPACE_ROOT)}`],
                snapshotArgv: null,
            },
        };
    }

    const baseline = input.gitBaseline as WorkspaceGitBaseline;
    return {
        ok: true,
        plan: {
            strategy: input.strategy,
            init: init.plan,
            archiveUpload,
            baselineUpload: {
                localPath: "",
                remotePath: SANDBOX_GIT_BASELINE_PATH,
                content: buildBaselineContent(baseline),
            },
            installGitArgv: buildInstallGitArgv(),
            verifyArgv: [
                "bash",
                "-lc",
                `test -s ${shQuote(SANDBOX_GIT_BASELINE_PATH)}`
                    + ` && test -f ${shQuote(`${WORKSPACE_ROOT}/.git/HEAD`)}`
                    // 把「实际走的是哪条投送路径」写进沙盒 stdout：日志里就能看出
                    // 本次是 bundle（真仓库）还是 tar（快照 fallback）。
                    + ` && echo ${shQuote(`workspace-delivered-strategy:${input.strategy}`)}`,
            ],
            // 快照守卫：bundle 的 clone 已带 `.git` → 这一步整体跳过（**不覆盖真历史**）；
            // tar 解包没有 `.git` → 这一步建立 review 用的快照仓库。
            snapshotArgv: buildSnapshotArgv(baseline.headSha),
        },
    };
}

/**
 * 把计划的 exec 步骤摊平成「按顺序执行的 argv 列表」（深拷贝）。`cp` 投送不在其中，
 * 由调用方用文件通道执行。
 *
 * 顺序（关键）：**装 git 必须早于需要 git 的 init 步骤**。
 * - `bundle` / `gitClone` 的 init 步骤本身就是 `git clone` → git 必须先装（否则 exit 127）；
 * - `tar` 的解包不依赖 git → 保持块I 实测口径「解包 → 装 git → 快照 → 校验」不变，
 *   既有行为与测试断言不受影响。
 */
export function buildWorkspaceDeliveryExecArgvs(plan: WorkspaceDeliveryPlan): string[][] {
    const argvs: string[][] = [];
    const initExecArgvs: string[][] = [];
    for (const step of plan.init.steps) {
        if (step.kind === "exec") initExecArgvs.push([...step.argv]);
    }
    const gitBeforeInit = plan.strategy === "bundle" || plan.strategy === "gitClone";
    if (plan.installGitArgv && gitBeforeInit) argvs.push([...plan.installGitArgv]);
    argvs.push(...initExecArgvs);
    if (plan.installGitArgv && !gitBeforeInit) argvs.push([...plan.installGitArgv]);
    if (plan.snapshotArgv) argvs.push([...plan.snapshotArgv]);
    argvs.push([...plan.verifyArgv]);
    return argvs;
}

/** 取出 init 计划里的 upload 步骤（tar 策略有且只有一个）。 */
export function workspaceDeliveryUploadStep(
    plan: WorkspaceInitPlan,
): WorkspaceDeliveryUpload | null {
    for (const step of plan.steps) {
        if (step.kind === "upload") return { localPath: step.localPath, remotePath: step.remotePath };
    }
    return null;
}

/** 执行投送所需的最小运行时（结构类型：服务端 lifecycle 与 CLI 本地通道都满足）。 */
export type WorkspaceDeliveryRuntime = {
    exec(argv: readonly string[]): Promise<{ ok: boolean; stdout: string; exitCode: number | null }>;
    /** `sbx --cloud cp <local> <sandbox>:<remote>`。缺失即投送不可兑现（fail-closed）。 */
    upload?(localPath: string, remotePath: string): Promise<{ ok: boolean; detail: string }>;
};

export type WorkspaceDeliveryExecResult =
    | {
        ok: true;
        detail: string;
        /** 实际走通的投送路径（bundle = 真仓库；tar = 快照 fallback）。 */
        strategy: WorkspaceInitStrategy;
        /** 沙盒内实际执行的步骤数（装 git / clone / 快照 / 校验）。 */
        execSteps: number;
        /** `cp` 投送的文件数（归档 + 基线）。 */
        uploads: number;
    }
    | { ok: false; code: string; message: string };

const deliveryFail = (code: string, message: string): WorkspaceDeliveryExecResult => ({
    ok: false,
    code,
    message,
});

/**
 * 执行投送计划。**fail-closed**：任何一步失败都返回带 code 的显式失败，
 * 调用方必须中止本次 run —— 绝不带着空/半成品工作区继续跑（那会产出假 diff）。
 *
 * 幂等：`mkdir -p` + `cp` 覆盖写 + 解包覆盖 + `command -v git` 守卫 + `[ ! -d .git ]` 守卫，
 * 重复执行同一计划不炸、也不会覆盖 agent 已产生的改动历史。
 */
export async function executeWorkspaceDelivery(
    plan: WorkspaceDeliveryPlan,
    runtime: WorkspaceDeliveryRuntime,
    deps: {
        /** 宿主临时目录（缺省 os.tmpdir）。 */
        tmpDir?: string;
        /** 写临时文件（缺省 node:fs/promises writeFile）；测试注入缝。 */
        writeTempFile?: (filePath: string, content: string) => Promise<void>;
        /** 删临时文件（缺省 node:fs/promises rm）；测试注入缝。 */
        removeTempFile?: (filePath: string) => Promise<void>;
    } = {},
): Promise<WorkspaceDeliveryExecResult> {
    const needsUpload = Boolean(plan.archiveUpload || plan.baselineUpload);
    if (needsUpload && !runtime.upload) {
        return deliveryFail(
            "delivery_upload_channel_missing",
            "该执行后端没有 `sbx cp` 投送通道（runtime.upload 缺失）：无法把仓库送进沙盒，"
            + "拒绝以空工作区继续运行。",
        );
    }
    const upload = runtime.upload as NonNullable<WorkspaceDeliveryRuntime["upload"]>;

    const prep = await runtime.exec(["bash", "-lc", `mkdir -p ${shQuote(SANDBOX_DELIVERY_DIR)}`]);
    if (!prep.ok) {
        return deliveryFail("delivery_prepare_failed", `沙盒内无法创建投送目录 ${SANDBOX_DELIVERY_DIR}。`);
    }

    if (plan.archiveUpload) {
        const sent = await upload(plan.archiveUpload.localPath, plan.archiveUpload.remotePath);
        if (!sent.ok) {
            return deliveryFail(
                "archive_upload_failed",
                `仓库归档投送失败（${sent.detail}）：请检查体积是否超限 / 沙盒是否可达。`,
            );
        }
    }

    const tmpDir = deps.tmpDir ?? (await import("node:os")).tmpdir();
    const writeTempFile = deps.writeTempFile
        ?? (async (filePath: string, content: string) => {
            const fs = await import("node:fs/promises");
            await fs.writeFile(filePath, content, "utf8");
        });
    const removeTempFile = deps.removeTempFile
        ?? (async (filePath: string) => {
            const fs = await import("node:fs/promises");
            await fs.rm(filePath, { force: true });
        });

    let hostBaselineTemp: string | null = null;
    if (plan.baselineUpload) {
        hostBaselineTemp = `${tmpDir}/nolo-baseline-${process.pid}-${Date.now()}.json`;
        try {
            await writeTempFile(hostBaselineTemp, plan.baselineUpload.content);
        } catch (error) {
            return deliveryFail(
                "baseline_stage_failed",
                `基线文件无法落到宿主临时文件：${error instanceof Error ? error.message : String(error)}`,
            );
        }
        const sent = await upload(hostBaselineTemp, plan.baselineUpload.remotePath);
        if (!sent.ok) {
            await removeTempFile(hostBaselineTemp).catch(() => undefined);
            return deliveryFail(
                "baseline_upload_failed",
                `diff 基线投送失败（${sent.detail}）：没有基线的 review 判据不可用。`,
            );
        }
    }

    const execArgvs = buildWorkspaceDeliveryExecArgvs(plan);
    try {
        const named: Array<[string, string[]]> = execArgvs.map((argv) => {
            const script = argv[argv.length - 1] ?? "";
            return [script, argv] as [string, string[]];
        });
        for (let index = 0; index < named.length; index += 1) {
            const [script, argv] = named[index] as [string, string[]];
            const step = await runtime.exec(argv);
            if (!step.ok) {
                const label = script.includes("apt-get")
                    ? "git_install_failed"
                    : script.includes("git clone")
                        ? "bundle_clone_failed"
                        : script.includes("git init")
                            ? "git_snapshot_failed"
                            : script.includes("tar -xzf")
                                ? "archive_extract_failed"
                                : "delivery_verify_failed";
                const hint = label === "bundle_clone_failed"
                    ? "常见原因：bundle 与 base 分支不匹配 / bundle 损坏 / 工作区目录非空（git clone 拒绝非空目录）。"
                    : "常见原因：无网络装不上 git（可改用预装 git 的 --template / sbx kit）、归档损坏。";
                return deliveryFail(
                    label,
                    `${label}：沙盒内步骤执行失败（exit=${step.exitCode}）。${hint}`
                    + `输出：${step.stdout.slice(0, 400)}`,
                );
            }
        }
    } finally {
        if (hostBaselineTemp) await removeTempFile(hostBaselineTemp).catch(() => undefined);
    }

    return {
        ok: true,
        detail: `workspace delivered via ${plan.strategy}`,
        strategy: plan.strategy,
        execSteps: execArgvs.length,
        uploads: (plan.archiveUpload ? 1 : 0) + (plan.baselineUpload ? 1 : 0),
    };
}
