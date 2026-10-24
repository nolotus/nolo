import { assertHostMemoryAdmission, HostMemoryAdmissionError } from "./hostMemoryAdmission";
import { readHostMemory, type HostMemorySnapshot, type HostMemoryDeps } from "./hostMemory";
import {
  loadInstaboxRunConfig,
  type ParsedInstaboxRunConfig,
} from "./instaboxRunConfig";

/** Policy estimate for workspace tools, separate from the local loop's 512 MB floor. */
export const LOCAL_TOOL_MEMORY_BUDGET_MB = 2048;

/** Host-owned evidence only. Never deserialize this from model/tool arguments. */
export type TrustedInstaboxPlacementEvidence = {
  bindingId: string;
  freeCreateEvidenceId: string;
  workspaceAuthorizationId: string;
  recoverySupportId: string;
  /** Restricted configuration reference, not a manifest or credential. */
  configRef: string;
};

export class LocalMemoryPlacementBlockedError extends Error {
  readonly code = "LOCAL_MEMORY_PLACEMENT_BLOCKED";
  constructor(message: string) {
    super(message);
    this.name = "LocalMemoryPlacementBlockedError";
  }
}

/** The CLI loop always stays local, even when workspace tools need offloading. */
export function resolveLocalMemoryPlacement(input: {
  snapshot: HostMemorySnapshot | null;
  runtimeKey?: unknown;
  cwd?: unknown;
  local?: unknown;
  readOnly?: unknown;
  assertAdmission?: (deps: { readHostMemory: () => HostMemorySnapshot | null }) => { effectiveAvailableMb: number };
}): {
  mode: "explicit" | "auto";
  toolRuntime: "unchanged" | "instabox";
  effectiveAvailableMb: number | null;
  reason?: string;
} {
  // This is only the preflight. spawnLocalBackgroundRun still takes the atomic
  // cross-process reservation immediately before the real spawn.
  const explicit =
    (typeof input.runtimeKey === "string" && !!input.runtimeKey.trim()) ||
    (typeof input.cwd === "string" && !!input.cwd.trim()) ||
    input.local === true ||
    input.readOnly === true;

  if (explicit) {
    return {
      mode: "explicit",
      toolRuntime: "unchanged",
      effectiveAvailableMb: -1,
    };
  }

  let effectiveAvailableMb: number | null = null;
  if (input.snapshot) {
    try {
      const assertFn = input.assertAdmission ?? assertHostMemoryAdmission;
      const admission = assertFn({ readHostMemory: () => input.snapshot });
      if (typeof admission?.effectiveAvailableMb === "number" && Number.isFinite(admission.effectiveAvailableMb) && admission.effectiveAvailableMb >= 0) {
        effectiveAvailableMb = admission.effectiveAvailableMb;
      }
    } catch (e: any) {
      if (typeof e?.details?.effectiveAvailableMb === "number" && Number.isFinite(e.details.effectiveAvailableMb) && e.details.effectiveAvailableMb >= 0) {
        effectiveAvailableMb = e.details.effectiveAvailableMb;
      }
    }
  }

  if (effectiveAvailableMb === null) {
    return {
      mode: "auto",
      toolRuntime: "unchanged",
      effectiveAvailableMb: null,
      reason: "memory_unknown",
    };
  }

  return {
    mode: "auto",
    toolRuntime: effectiveAvailableMb < LOCAL_TOOL_MEMORY_BUDGET_MB ? "instabox" : "unchanged",
    effectiveAvailableMb,
    reason: effectiveAvailableMb < LOCAL_TOOL_MEMORY_BUDGET_MB ? "memory_tight" : "memory_sufficient",
  };
}

export type AutoInstaboxPlacementEvaluation = {
  selectedRuntimeKey?: string;
  reason?: string;
  memoryPlacementNote?: string;
  effectiveAvailableMb: number | null;
};

/**
 * 评估在 startAgentRun 派发时是否因宿主内存紧张自动将工具与工作区路由至 Instabox。
 * 核心契约：
 * 1) 仅当调用方未显式给 runtimeKey、未给 cwd、且 readOnly!==true 时进入自动模式，显式意图一律不覆盖；
 * 2) 自动模式先读宿主内存（复用 hostMemory.readHostMemory），可用内存低于 LOCAL_TOOL_MEMORY_BUDGET_MB 时尝试 Instabox；
 * 3) Instabox 可用条件：用户已启用自动（环境变量 NOLO_INSTABOX_AUTO=1 或 trusted deps 注入同义开关）+ 受控 run 配置可解析 + 服务端准入/就绪未明确拒绝；任一不满足保持默认 docker 沙盒并在返回文本里给出可读原因；
 * 4) 主循环仍在本地，只把工具/工作区放 Instabox，绝不宣称"整机离机"。
 */
export async function evaluateAutoInstaboxPlacement(input: {
  runtimeKey?: unknown;
  cwd?: unknown;
  readOnly?: boolean;
  env?: Record<string, string | undefined>;
  autoEnabled?: boolean;
  readHostMemory?: (deps?: HostMemoryDeps) => HostMemorySnapshot | null;
  hostMemoryDeps?: HostMemoryDeps;
  assertAdmission?: (deps: { readHostMemory: () => HostMemorySnapshot | null }) => { effectiveAvailableMb: number };
  readEvidence?: () => Promise<TrustedInstaboxPlacementEvidence | undefined>;
  checkReadiness?: () => Promise<{ ready: boolean; reason?: string }> | { ready: boolean; reason?: string };
  runsDir?: string;
}): Promise<AutoInstaboxPlacementEvaluation> {
  const isExplicit =
    (typeof input.runtimeKey === "string" && !!input.runtimeKey.trim()) ||
    (typeof input.cwd === "string" && !!input.cwd.trim()) ||
    input.readOnly === true;

  if (isExplicit) {
    return {
      selectedRuntimeKey: undefined,
      effectiveAvailableMb: -1,
    };
  }

  const readMem = input.readHostMemory ?? readHostMemory;
  const snapshot = readMem(input.hostMemoryDeps);

  let effectiveAvailableMb: number | null = null;
  let memoryDiagnosis: string | undefined;

  if (!snapshot) {
    memoryDiagnosis = "宿主内存快照为空（readHostMemory 返回 null）";
  } else {
    try {
      const assertFn = input.assertAdmission ?? assertHostMemoryAdmission;
      const admission = assertFn({ readHostMemory: () => snapshot });
      if (typeof admission?.effectiveAvailableMb === "number" && Number.isFinite(admission.effectiveAvailableMb) && admission.effectiveAvailableMb >= 0) {
        effectiveAvailableMb = admission.effectiveAvailableMb;
      } else {
        memoryDiagnosis = "准入评估未返回有效的数值型可用内存";
      }
    } catch (e: any) {
      if (typeof e?.details?.effectiveAvailableMb === "number" && Number.isFinite(e.details.effectiveAvailableMb) && e.details.effectiveAvailableMb >= 0) {
        effectiveAvailableMb = e.details.effectiveAvailableMb;
      } else {
        memoryDiagnosis = e instanceof Error ? e.message : String(e);
      }
    }
  }

  if (effectiveAvailableMb === null) {
    const note = `宿主可用内存探测失败或未知（${memoryDiagnosis}）；无法判断是否低于预算（${LOCAL_TOOL_MEMORY_BUDGET_MB}MB），保持默认本地沙盒，不自动迁移。`;
    return {
      selectedRuntimeKey: undefined,
      reason: "memory_unknown",
      memoryPlacementNote: note,
      effectiveAvailableMb: null,
    };
  }

  if (effectiveAvailableMb >= LOCAL_TOOL_MEMORY_BUDGET_MB) {
    return {
      selectedRuntimeKey: undefined,
      reason: "memory_sufficient",
      effectiveAvailableMb,
    };
  }

  const autoEnabled =
    input.autoEnabled === true ||
    input.env?.NOLO_INSTABOX_AUTO === "1" ||
    (typeof process !== "undefined" && process.env?.NOLO_INSTABOX_AUTO === "1");

  if (!autoEnabled) {
    const note = `宿主可用内存紧缺（${effectiveAvailableMb}MB < ${LOCAL_TOOL_MEMORY_BUDGET_MB}MB），但未启用自动 Instabox（需设置 NOLO_INSTABOX_AUTO=1 或配置开启）；保持默认 docker 沙盒。`;
    return {
      selectedRuntimeKey: undefined,
      reason: "auto_disabled",
      memoryPlacementNote: note,
      effectiveAvailableMb,
    };
  }

  try {
    await assertAutoInstaboxPlacementAvailable(input.readEvidence, {
      env: input.env,
      runsDir: input.runsDir,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const note = `宿主可用内存紧缺（${effectiveAvailableMb}MB < ${LOCAL_TOOL_MEMORY_BUDGET_MB}MB），尝试自动改用 Instabox 受阻：${errorMsg}；保持默认 docker 沙盒。`;
    return {
      selectedRuntimeKey: undefined,
      reason: "config_unavailable",
      memoryPlacementNote: note,
      effectiveAvailableMb,
    };
  }

  if (input.checkReadiness) {
    try {
      const readiness = await input.checkReadiness();
      if (readiness && readiness.ready === false) {
        const note = `宿主可用内存紧缺（${effectiveAvailableMb}MB < ${LOCAL_TOOL_MEMORY_BUDGET_MB}MB），尝试自动改用 Instabox 但被服务端准入/就绪明确拒绝：${readiness.reason ?? "服务端未就绪"}；保持默认 docker 沙盒。`;
        return {
          selectedRuntimeKey: undefined,
          reason: "readiness_rejected",
          memoryPlacementNote: note,
          effectiveAvailableMb,
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const note = `宿主可用内存紧缺（${effectiveAvailableMb}MB < ${LOCAL_TOOL_MEMORY_BUDGET_MB}MB），尝试自动改用 Instabox 但就绪检查抛错：${errorMsg}；保持默认 docker 沙盒。`;
      return {
        selectedRuntimeKey: undefined,
        reason: "readiness_error",
        memoryPlacementNote: note,
        effectiveAvailableMb,
      };
    }
  }

  const note = `宿主可用内存紧缺（${effectiveAvailableMb}MB < ${LOCAL_TOOL_MEMORY_BUDGET_MB}MB），已自动将工具与工作区路由至 Instabox 沙盒（主循环仍在本机）。`;
  return {
    selectedRuntimeKey: "instabox",
    reason: "auto_instabox_applied",
    memoryPlacementNote: note,
    effectiveAvailableMb,
  };
}

/**
 * 校验可信宿主提供的 placement evidence，并加载解析受控 JSON 配置。
 * 无配置、字段缺失或校验失败均 fail-closed (blocked)。
 */
export async function assertAutoInstaboxPlacementAvailable(
  readEvidence?: () => Promise<TrustedInstaboxPlacementEvidence | undefined>,
  options?: { env?: Record<string, string | undefined>; runsDir?: string },
): Promise<ParsedInstaboxRunConfig> {
  const evidence = await readEvidence?.();
  if (
    !evidence ||
    [
      evidence.bindingId,
      evidence.freeCreateEvidenceId,
      evidence.workspaceAuthorizationId,
      evidence.recoverySupportId,
      evidence.configRef,
    ].some(value => typeof value !== "string" || !value.trim())
  ) {
    throw new LocalMemoryPlacementBlockedError(
      "Automatic Instabox placement blocked: trusted binding, free-create evidence, workspace authorization, recovery support and restricted config reference are required; model arguments are not authorization.",
    );
  }

  let parsed: ParsedInstaboxRunConfig;
  try {
    parsed = loadInstaboxRunConfig({
      env: options?.env,
      configPath: evidence.configRef,
      runsDir: options?.runsDir,
    });
  } catch (error) {
    throw new LocalMemoryPlacementBlockedError(
      `Automatic Instabox placement blocked: restricted config error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  if (
    parsed.bindingId !== evidence.bindingId ||
    parsed.freeCreateEvidenceId !== evidence.freeCreateEvidenceId ||
    parsed.workspaceAuthorizationId !== evidence.workspaceAuthorizationId ||
    parsed.recoverySupportId !== evidence.recoverySupportId
  ) {
    throw new LocalMemoryPlacementBlockedError(
      "Automatic Instabox placement blocked: evidence IDs do not match restricted config.",
    );
  }

  return parsed;
}
