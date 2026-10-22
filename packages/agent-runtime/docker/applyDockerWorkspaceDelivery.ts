/**
 * 块K：工作区投送的**共享执行入口**（plan → 执行 → fail-closed）。
 *
 * 在此之前这段逻辑只在服务端 run 通道里（`agentRun/index.ts` 的
 * `bootstrapDockerContainer`），CLI 本地 docker 通道（`localDockerWorkload.ts`）没有
 * 任何 bootstrap 调用 —— 于是 `--local --runtime-key docker` 的沙盒是**空目录且无 git**，
 * agent 在里面「跑通」只会产出假改动。本模块把那段逻辑抽成唯一实现，两条通道共用。
 *
 * 契约（两条通道逐字一致）：
 * - 计划被拒 → `docker_workspace_delivery_rejected:<code>:<message>`（体积/文件数/归档缺失/基线非法）；
 * - 执行失败 → `docker_workspace_delivery_failed:<code>:<message>`；
 * - 两种失败都**抛**，调用方必须中止本次 run。绝不降级成「空工作区继续跑」。
 *
 * 幂等：底层 `executeWorkspaceDelivery`（`mkdir -p` + `cp` 覆盖 + 解包覆盖 +
 * `command -v git` 守卫 + `[ ! -d .git ]` 守卫）重复执行不炸、不覆盖 agent 改动。
 */

import {
    executeWorkspaceDelivery,
    planWorkspaceDelivery,
    type WorkspaceDeliveryRuntime,
    type WorkspaceGitBaseline,
} from "./sandboxWorkspaceDelivery";
import type { WorkspaceInitStrategy } from "./dockerWorkspaceInit";

/** 调用方交给 docker run 的容器 bootstrap 选择（原声明在 `agentRun/index.ts`）。 */
export type DockerWorkspaceInitSelection = {
    strategy: WorkspaceInitStrategy;
    tarArchivePath?: string;
    tarArchiveSizeBytes?: number;
    /** bundle 主路径：宿主 `git bundle create --all` 的对象包路径（+ 字节数 + base 分支）。 */
    gitBundlePath?: string;
    gitBundleSizeBytes?: number;
    baseBranch?: string;
    repoUrl?: string;
    networkAllow?: readonly string[];
    /** 归档内文件数（`git ls-files` 口径）；超上限即显式拒绝投送。 */
    fileCount?: number;
    /**
     * review 判据（bundle / tar 策略必需）：把宿主 HEAD + `git diff` 一起投送进沙盒
     * （落在工作区之外的 `/tmp/nolo-workspace-init/baseline.json`）。
     */
    gitBaseline?: WorkspaceGitBaseline;
};

export type DockerWorkspaceDeliveryStage = "plan" | "execute";

/**
 * 投送失败的可操作错误。`message` 保留历史前缀（两条通道的调用方/日志按前缀分流），
 * `code` 供上层（CLI 本地通道）重新包装成自己的统一失败码。
 */
export class DockerWorkspaceDeliveryError extends Error {
    readonly code: string;
    readonly stage: DockerWorkspaceDeliveryStage;

    constructor(stage: DockerWorkspaceDeliveryStage, code: string, message: string) {
        super(
            stage === "plan"
                ? `docker_workspace_delivery_rejected:${code}:${message}`
                : `docker_workspace_delivery_failed:${code}:${message}`,
        );
        this.name = "DockerWorkspaceDeliveryError";
        this.code = code;
        this.stage = stage;
    }
}

/** 结构判定（跨 bundle / 注入替身时 `instanceof` 不可靠）。 */
export function isDockerWorkspaceDeliveryError(
    error: unknown,
): error is DockerWorkspaceDeliveryError {
    if (error instanceof DockerWorkspaceDeliveryError) return true;
    if (typeof error !== "object" || error === null) return false;
    const candidate = error as { name?: unknown; code?: unknown; stage?: unknown };
    return (
        candidate.name === "DockerWorkspaceDeliveryError"
        && typeof candidate.code === "string"
        && (candidate.stage === "plan" || candidate.stage === "execute")
    );
}

/**
 * 唯一实现：`planWorkspaceDelivery` → 执行 → 任何一步失败都抛 `DockerWorkspaceDeliveryError`。
 * `runtime` 走服务端 authority 通道（`runtime.exec` / `runtime.upload`），绝不走
 * grant 校验的 model-facing channel。
 */
export async function applyDockerWorkspaceDelivery(
    runtime: WorkspaceDeliveryRuntime,
    selection: DockerWorkspaceInitSelection | undefined,
): Promise<{ strategy: WorkspaceInitStrategy; execSteps: number; uploads: number }> {
    // 块I：工作区投送。通道是 `sbx --cloud cp`（Cloud file API）——不能把归档 base64
    // 塞进 exec 的 argv（单个参数实测上限约 64KB，38MB 归档要上万次 exec）。
    const delivery = planWorkspaceDelivery({
        strategy: selection?.strategy ?? "empty",
        ...(selection?.tarArchivePath !== undefined ? { tarArchivePath: selection.tarArchivePath } : {}),
        ...(selection?.tarArchiveSizeBytes !== undefined ? { tarArchiveSizeBytes: selection.tarArchiveSizeBytes } : {}),
        ...(selection?.gitBundlePath !== undefined ? { gitBundlePath: selection.gitBundlePath } : {}),
        ...(selection?.gitBundleSizeBytes !== undefined ? { gitBundleSizeBytes: selection.gitBundleSizeBytes } : {}),
        ...(selection?.baseBranch !== undefined ? { baseBranch: selection.baseBranch } : {}),
        ...(selection?.fileCount !== undefined ? { fileCount: selection.fileCount } : {}),
        ...(selection?.gitBaseline !== undefined ? { gitBaseline: selection.gitBaseline } : {}),
        ...(selection?.repoUrl !== undefined ? { repoUrl: selection.repoUrl } : {}),
        ...(selection?.networkAllow !== undefined ? { networkAllow: selection.networkAllow } : {}),
    });
    if (!delivery.ok) {
        throw new DockerWorkspaceDeliveryError("plan", delivery.code, delivery.message);
    }

    const delivered = await executeWorkspaceDelivery(delivery.plan, runtime);
    if (!delivered.ok) {
        // fail-closed：投送失败绝不降级成「空工作区继续跑」，那会产出假 diff。
        throw new DockerWorkspaceDeliveryError("execute", delivered.code, delivered.message);
    }
    // 「用了哪条」随结果向上带（bundle = 真仓库；tar = 快照 fallback），调用方据此记录。
    return {
        strategy: delivered.strategy,
        execSteps: delivered.execSteps,
        uploads: delivered.uploads,
    };
}
