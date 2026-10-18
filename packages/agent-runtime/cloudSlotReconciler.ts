// packages/agent-runtime/cloudSlotReconciler.ts
//
// 云槽位对账（M4）：把「云上残留 / 未确认清理」收拢成一份可解释、可复核的报告。
//
// 为什么存在：docker workload 生命周期里 `release()` 只发 stop，stop 未被确认时
// 状态停在 `cleanup_pending`（不变式：清理未确认**不得**标 released）。于是真实世界
// 会留下两类账：云上仍计费的沙盒（历史 run 残留，`sbx --cloud ls` 里一堆 stopped），
// 以及审计里停在 `cleanup_pending` 的记录。此前两者之间没有任何对账机制 ——
// 谁在花钱、谁该被清理，只能靠人肉比对。
//
// 本模块的边界（三条硬约束）：
//   1. **纯逻辑**：不做任何网络/进程调用，输入是「审计记录集合 + 云侧沙盒列表」，
//      输出是分类报告。真机 IO 由调用方（`reconcileCloudSlotsWithIo` 的注入点、
//      或只读 CLI）提供，因此本模块可在任何测试环境确定性地跑。
//   2. **不猜**：关联只认精确标识（审计 `externalId` 命中云侧 id/name，或云侧显式
//      提供的 runIdHint 命中审计 runId）。做不到就进 `unknown`，不按时间近似、
//      不按前缀猜测 —— 猜错的代价是删错沙盒或漏掉计费槽位。
//   3. **只出报告，绝不删**：报告里没有任何「可直接执行」的删除指令。每个条目的
//      `suggestedAction.requiresHumanApproval` 恒为 true（类型上是字面量 true），
//      顶层 `reportOnly` 恒为 true。destroy / retry-release 都是**建议**，
//      必须由人确认后另行执行。
//
// 分类判据（可解释，全部写进 `evidence`）：
//   orphaned      云上有、审计无对应 run（含 runIdHint 指向不存在的 run）
//   pendingCleanup 审计 cleanup_pending 且云上仍存在（stop 未确认 → 重试 release）
//   inconsistent  审计说已 released / 从未创建，云上却仍在（不得静默忽略）
//   unknown       无法关联（缺标识 / 多份审计争用同一 externalId / hint 与 externalId 冲突）
//   consistent    审计记录在云上无残留（正常收尾；含「已 released 且云上已无」）
//
// `cleanup_pending` 且云上已无该沙盒 → 归入 `consistent`（云侧无残留、不计费），
// 但证据码 `pending-cleanup-but-absent` 会显式说明「审计账目滞后」，不静默丢信息。

import type { ExecutionAuditRecord } from "./executionAudit";

/** 审计侧清理状态（直接取审计记录的真值类型，不另抄一份联合类型）。 */
export type CloudSlotCleanupStatus = ExecutionAuditRecord["cleanupStatus"];

/**
 * 云侧沙盒列表条目（`sbx --cloud ls` 的规整结果）。
 *
 * `id` 是关联主键；`name` 可选，因为审计 `externalId` 既可能是机器 id 也可能是
 * 沙盒名（见 cloudExecutionWorkload 的 readExternalId：machineId ?? jobName ?? leaseId），
 * 两个字段都参与精确匹配才能不漏。
 * `runIdHint` 是调用方从沙盒名等旁证里提取的**提示**，只在精确命中审计 runId 时生效。
 */
export interface CloudSlotSandbox {
  id: string;
  status: string;
  createdAt: number | string | null;
  name?: string;
  runIdHint?: string;
}

export type ReconcileBucket =
  | "orphaned"
  | "pendingCleanup"
  | "inconsistent"
  | "unknown"
  | "consistent";

export type SuggestedActionKind = "destroy" | "retry-release" | "manual-confirm" | "none";

export interface SuggestedAction {
  readonly kind: SuggestedActionKind;
  /** 恒为 true：reconcile 只出报告，删除/释放永远要人工确认。 */
  readonly requiresHumanApproval: true;
  readonly reason: string;
}

/** 关联强度的显式记账：external-id（强）优于 run-id-hint（提示）；none 即未关联。 */
export type CloudSlotLink = "external-id" | "run-id-hint" | "none";

export interface ReconcileFinding {
  readonly bucket: ReconcileBucket;
  /** 云侧条目的 id（`unknown` 里的审计侧条目为空串）。 */
  readonly sandboxId: string;
  readonly sandboxName?: string;
  readonly sandboxStatus?: string;
  readonly sandboxCreatedAtMs: number | null;
  /** 关联到的审计 run（未关联时不出现）。 */
  readonly runId?: string;
  readonly cleanupStatus?: CloudSlotCleanupStatus;
  readonly linkedBy: CloudSlotLink;
  /** 机器可读的判据码，逐条可解释「为什么进这个桶」。 */
  readonly evidence: readonly string[];
  /** 给人看的单行理由。 */
  readonly rationale: string;
  readonly suggestedAction: SuggestedAction;
}

export interface CloudSlotReconcileReport {
  readonly orphaned: readonly ReconcileFinding[];
  readonly pendingCleanup: readonly ReconcileFinding[];
  readonly inconsistent: readonly ReconcileFinding[];
  readonly unknown: readonly ReconcileFinding[];
  readonly consistent: readonly ReconcileFinding[];
  readonly counts: {
    readonly orphaned: number;
    readonly pendingCleanup: number;
    readonly inconsistent: number;
    readonly unknown: number;
    readonly consistent: number;
    readonly cloudSandboxes: number;
    readonly auditRecords: number;
  };
  /** 本报告的保证：不含可执行指令，任何删除都需人工确认。 */
  readonly reportOnly: true;
}

export interface ReconcileCloudSlotsInput {
  /** 审计记录集合（`execution-audit:<runId>` 的值）。 */
  readonly auditRecords: readonly ExecutionAuditRecord[];
  /** 云侧实际沙盒列表（真值来源）。 */
  readonly cloudSandboxes: readonly CloudSlotSandbox[];
}

function nonEmpty(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** createdAt 容错规整：数字或可解析字符串 → 毫秒；其余一律 null（不猜）。 */
function parseCreatedAtMs(value: number | string | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

function action(
  kind: SuggestedActionKind,
  reason: string
): SuggestedAction {
  return { kind, requiresHumanApproval: true, reason };
}

function sortFindings(findings: ReconcileFinding[]): ReconcileFinding[] {
  return findings.sort((a, b) => {
    const left = `${a.sandboxId}\u0000${a.sandboxName ?? ""}\u0000${a.runId ?? ""}`;
    const right = `${b.sandboxId}\u0000${b.sandboxName ?? ""}\u0000${b.runId ?? ""}`;
    return left < right ? -1 : left > right ? 1 : 0;
  });
}

type AuditIndex = {
  byRunId: Map<string, ExecutionAuditRecord>;
  /** externalId → 认领它的 runId 列表（>1 表示审计内部自相矛盾，不得猜）。 */
  byExternalId: Map<string, string[]>;
};

function buildAuditIndex(auditRecords: readonly ExecutionAuditRecord[]): AuditIndex {
  const byRunId = new Map<string, ExecutionAuditRecord>();
  const byExternalId = new Map<string, string[]>();
  for (const record of auditRecords) {
    const runId = nonEmpty(record.runId);
    if (!runId) continue;
    byRunId.set(runId, record);
    const externalId = nonEmpty(record.externalId);
    if (!externalId) continue;
    const owners = byExternalId.get(externalId) ?? [];
    if (!owners.includes(runId)) owners.push(runId);
    byExternalId.set(externalId, owners);
  }
  return { byRunId, byExternalId };
}

/** 分类「已关联」的云侧条目：只有 cleanupStatus 决定桶，判据全部写进 evidence。 */
function classifyLinked(args: {
  sandbox: CloudSlotSandbox;
  record: ExecutionAuditRecord;
  linkedBy: Exclude<CloudSlotLink, "none">;
  linkKey: string;
  createdAtMs: number | null;
}): ReconcileFinding {
  const { sandbox, record, linkedBy, linkKey, createdAtMs } = args;
  const base = {
    sandboxId: nonEmpty(sandbox.id) ?? "",
    ...(nonEmpty(sandbox.name) ? { sandboxName: nonEmpty(sandbox.name)! } : {}),
    sandboxStatus: typeof sandbox.status === "string" ? sandbox.status : "",
    sandboxCreatedAtMs: createdAtMs,
    runId: record.runId,
    cleanupStatus: record.cleanupStatus,
    linkedBy,
  } as const;
  const linkEvidence = linkedBy === "external-id" ? `audit-external-id:${linkKey}` : `audit-run-id-hint:${linkKey}`;

  switch (record.cleanupStatus) {
    case "cleanup_pending":
      return {
        ...base,
        bucket: "pendingCleanup",
        evidence: [linkEvidence, "audit-cleanup-pending", "cloud-sandbox-present"],
        rationale:
          "审计停在 cleanup_pending（stop 未确认），云上沙盒仍在 —— 清理未确认不得标 released，需要对账后重试 release。",
        suggestedAction: action(
          "retry-release",
          "人工确认后重试 release（stop + 用 sbx --cloud ls 确认消失），确认后再把审计改为 released。"
        ),
      };
    case "released":
      return {
        ...base,
        bucket: "inconsistent",
        evidence: [linkEvidence, "audit-released", "cloud-sandbox-present"],
        rationale:
          "审计已记 released，云上却仍存在同标识沙盒 —— 要么 stop 未真正生效，要么标识被复用；必须人工核对，不得静默忽略。",
        suggestedAction: action(
          "manual-confirm",
          "先人工核对沙盒归属与计费；确认为残留后再由人决定是否 destroy，本报告不代为删除。"
        ),
      };
    default:
      return {
        ...base,
        bucket: "inconsistent",
        evidence: [linkEvidence, "audit-not-created", "cloud-sandbox-present"],
        rationale:
          "审计记 not-created（本次 run 没有创建过 workload），云上却存在同标识沙盒 —— 标识归属存疑，必须人工核对。",
        suggestedAction: action(
          "manual-confirm",
          "人工核对沙盒来源（是否属于别的 run / 标识被复用），确认后再决定处置。"
        ),
      };
  }
}

/**
 * 对账核心（纯函数：无 IO、无时钟、无随机）。
 *
 * 输出顺序稳定（按 sandboxId/name/runId 排序），便于 diff 与人工复核。
 */
export function reconcileCloudSlots(
  input: ReconcileCloudSlotsInput
): CloudSlotReconcileReport {
  const auditRecords = input.auditRecords ?? [];
  const cloudSandboxes = input.cloudSandboxes ?? [];
  const index = buildAuditIndex(auditRecords);

  const orphaned: ReconcileFinding[] = [];
  const pendingCleanup: ReconcileFinding[] = [];
  const inconsistent: ReconcileFinding[] = [];
  const unknown: ReconcileFinding[] = [];
  const consistent: ReconcileFinding[] = [];
  /** 云侧条目认领过的 runId：用于判定哪些审计记录在云上"无残留"。 */
  const linkedRunIds = new Set<string>();

  for (const sandbox of cloudSandboxes) {
    const id = nonEmpty(sandbox.id);
    const name = nonEmpty(sandbox.name);
    const createdAtMs = parseCreatedAtMs(sandbox.createdAt);
    const identityKeys = Array.from(new Set([id, name].filter((x): x is string => x !== null)));
    const sandboxStatus = typeof sandbox.status === "string" ? sandbox.status : "";
    const baseShape = {
      sandboxId: id ?? "",
      ...(name ? { sandboxName: name } : {}),
      sandboxStatus,
      sandboxCreatedAtMs: createdAtMs,
    } as const;

    // 判据一：云侧条目自身没有可用标识 —— 无法关联，单独列为 unknown，不猜。
    if (identityKeys.length === 0) {
      unknown.push({
        ...baseShape,
        bucket: "unknown",
        linkedBy: "none",
        evidence: ["missing-cloud-identity", "status:" + (sandboxStatus || "(unknown)")],
        rationale: "云侧条目既无 id 也无 name，无法与任何审计 run 关联（不按时间/顺序猜测）。",
        suggestedAction: action("manual-confirm", "人工到云控制台核对这个沙盒的来源与归属。"),
      });
      continue;
    }

    const claimedRunIds: string[] = [];
    let claimedKey: string | null = null;
    for (const key of identityKeys) {
      for (const runId of index.byExternalId.get(key) ?? []) {
        if (!claimedRunIds.includes(runId)) claimedRunIds.push(runId);
        claimedKey = key;
      }
    }

    // 判据二：多份审计争用同一标识 —— 关联歧义，不得任选一个。
    if (claimedRunIds.length > 1) {
      unknown.push({
        ...baseShape,
        bucket: "unknown",
        linkedBy: "none",
        evidence: [
          `ambiguous-external-id:${claimedKey ?? ""}`,
          `candidate-runs:${claimedRunIds.join(",")}`,
        ],
        rationale: `标识 ${claimedKey ?? ""} 被 ${claimedRunIds.length} 份审计记录认领，关联歧义（不任选一个）。`,
        suggestedAction: action("manual-confirm", "人工核对这些 run 的沙盒归属，先修审计再决定处置。"),
      });
      continue;
    }

    // 判据三：精确 externalId 命中 —— 唯一关联。
    if (claimedRunIds.length === 1) {
      const record = index.byRunId.get(claimedRunIds[0]!)!;
      linkedRunIds.add(record.runId);
      const finding = classifyLinked({
        sandbox,
        record,
        linkedBy: "external-id",
        linkKey: claimedKey ?? "",
        createdAtMs,
      });
      (finding.bucket === "pendingCleanup" ? pendingCleanup : inconsistent).push(finding);
      continue;
    }

    // 判据四：externalId 未命中，退到调用方给的 runIdHint（仍需精确命中审计 runId）。
    const hint = nonEmpty(sandbox.runIdHint);
    if (hint) {
      const record = index.byRunId.get(hint);
      if (!record) {
        // hint 指向一个不存在的 run → 云上有、审计无对应 run。
        orphaned.push({
          ...baseShape,
          bucket: "orphaned",
          linkedBy: "none",
          evidence: ["cloud-sandbox-not-in-audit", `run-id-hint-unresolved:${hint}`],
          rationale: `云侧沙盒存在，但审计里没有 run ${hint} 的记录（hint 未命中）—— 视为残留，需人工确认后处置。`,
          suggestedAction: action(
            "destroy",
            "人工确认该沙盒确无归属后 destroy 释放计费槽位；本报告不代为删除。"
          ),
        });
        continue;
      }
      const recordExternalId = nonEmpty(record.externalId);
      if (recordExternalId && !identityKeys.includes(recordExternalId)) {
        // hint 说"是这个 run"，但该 run 记录的 externalId 指向别的云标识 —— 冲突，不猜。
        unknown.push({
          ...baseShape,
          bucket: "unknown",
          linkedBy: "none",
          runId: record.runId,
          cleanupStatus: record.cleanupStatus,
          evidence: [
            `run-id-hint:${hint}`,
            `run-external-id:${recordExternalId}`,
            "hint-conflicts-external-id",
          ],
          rationale: `hint 指向 run ${hint}，但该 run 的 externalId 是 ${recordExternalId}，与云侧标识不一致 —— 关联冲突，不猜。`,
          suggestedAction: action("manual-confirm", "人工核对沙盒与 run 的真实对应关系。"),
        });
        continue;
      }
      linkedRunIds.add(record.runId);
      const finding = classifyLinked({
        sandbox,
        record,
        linkedBy: "run-id-hint",
        linkKey: hint,
        createdAtMs,
      });
      (finding.bucket === "pendingCleanup" ? pendingCleanup : inconsistent).push(finding);
      continue;
    }

    // 判据五：标识可用但没有任何审计认领 —— 典型的历史 run 残留。
    orphaned.push({
      ...baseShape,
      bucket: "orphaned",
      linkedBy: "none",
      evidence: [
        `cloud-sandbox-not-in-audit:${identityKeys.join("|")}`,
        "no-external-id-match",
        "no-run-id-hint",
      ],
      rationale: "云侧沙盒存在，审计里没有任何 run 认领该标识 —— 审计无对应 run，视为残留。",
      suggestedAction: action(
        "destroy",
        "人工确认该沙盒确无归属后 destroy 释放计费槽位；本报告不代为删除。"
      ),
    });
  }

  // 审计侧：云上无残留的记录。cleanup_pending 且云上已无 → 云侧无计费残留，
  // 但审计账目滞后，证据码显式标出，不静默丢信息。
  for (const record of auditRecords) {
    const runId = nonEmpty(record.runId);
    if (!runId || linkedRunIds.has(runId)) continue;
    const recordExternalId = nonEmpty(record.externalId);
    const missingIdentity = recordExternalId === null;
    const evidence: string[] = [`audit-cleanup-status:${record.cleanupStatus}`, "cloud-sandbox-absent"];
    if (missingIdentity) evidence.push("audit-external-id-missing");

    // cleanup_pending 且审计里没有云标识：云侧状态无法判定 → 不猜，列 unknown。
    if (record.cleanupStatus === "cleanup_pending" && missingIdentity) {
      unknown.push({
        bucket: "unknown",
        sandboxId: "",
        sandboxCreatedAtMs: null,
        runId,
        cleanupStatus: record.cleanupStatus,
        linkedBy: "none",
        evidence: [...evidence, "pending-without-cloud-identity"],
        rationale: `审计 run ${runId} 记 cleanup_pending 但没有 externalId，云侧状态无法判定 —— 需人工核对。`,
        suggestedAction: action("manual-confirm", "人工核对这个 run 是否真的创建过沙盒，并补齐云侧标识。"),
      });
      continue;
    }

    if (record.cleanupStatus === "cleanup_pending") {
      evidence.push("pending-cleanup-but-absent");
    }

    consistent.push({
      bucket: "consistent",
      sandboxId: recordExternalId ?? "",
      sandboxCreatedAtMs: null,
      runId,
      cleanupStatus: record.cleanupStatus,
      linkedBy: "none",
      evidence,
      rationale:
        record.cleanupStatus === "cleanup_pending"
          ? `审计 run ${runId} 仍记 cleanup_pending，但云上已无该沙盒 —— 云侧无残留（不计费），只是审计账目滞后。`
          : `审计 run ${runId} 记 ${record.cleanupStatus}，云上无对应沙盒 —— 账实相符。`,
      suggestedAction: action("none", "云侧无残留，无需处置。"),
    });
  }

  const report: CloudSlotReconcileReport = {
    orphaned: sortFindings(orphaned),
    pendingCleanup: sortFindings(pendingCleanup),
    inconsistent: sortFindings(inconsistent),
    unknown: sortFindings(unknown),
    consistent: sortFindings(consistent),
    counts: {
      orphaned: orphaned.length,
      pendingCleanup: pendingCleanup.length,
      inconsistent: inconsistent.length,
      unknown: unknown.length,
      consistent: consistent.length,
      cloudSandboxes: cloudSandboxes.length,
      auditRecords: auditRecords.length,
    },
    reportOnly: true,
  };
  return report;
}

/** 注入式 IO 门面：真实网络/DB 调用只发生在调用方提供的 reader 里。 */
export interface CloudSlotReconcileIo {
  listAuditRecords(): Promise<readonly ExecutionAuditRecord[]>;
  listCloudSandboxes(): Promise<readonly CloudSlotSandbox[]>;
}

/**
 * 带注入 IO 的对账入口：先取数据，再走纯核心。
 *
 * 只读保证靠注入点约束：reader 由调用方提供，本模块不自己发任何请求。
 */
export async function reconcileCloudSlotsWithIo(args: {
  io: CloudSlotReconcileIo;
}): Promise<CloudSlotReconcileReport> {
  const [auditRecords, cloudSandboxes] = await Promise.all([
    args.io.listAuditRecords(),
    args.io.listCloudSandboxes(),
  ]);
  return reconcileCloudSlots({ auditRecords, cloudSandboxes });
}
