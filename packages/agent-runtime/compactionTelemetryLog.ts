/**
 * 本地自动上下文压缩的结构化可观测日志（JSONL）与纯聚合报告。
 *
 * 设计边界：
 * - 只落数字、枚举、模型/provider 名与 dialogId，绝不含任何用户消息、摘要正文或工具输出。
 * - 全程 fail-open：目录创建/写盘失败静默返回 false，绝不阻塞或影响压缩主流程。
 * - 默认路径遵守 `NOLO_HOME`（经 `resolveNoloStateDir("telemetry")` → `$NOLO_HOME/telemetry/compaction.jsonl`）；
 *   在测试环境（NODE_ENV/BUN_ENV=test）未显式给 `logFile`、`NOLO_COMPACTION_LOG_FILE` 或 `NOLO_HOME` 时
 *   返回 null，防止单元测试污染开发者真实 `~/.nolo`。
 */
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { resolveNoloStateDir } from "./noloStateDir";

export const COMPACTION_TELEMETRY_SCHEMA_VERSION = 1;
/** 自动压缩硬超时为 60s；>= 45s 视为逼近超时预算。 */
export const NEAR_TIMEOUT_THRESHOLD_MS = 45_000;

export type CompactionTelemetryOutcome =
  | "success"
  | "empty"
  | "timeout"
  | "provider-error"
  | "aborted"
  | "blocked"
  | "unsafe-projection";

export type CompactionTelemetryTrigger =
  | "real-usage"
  | "estimate"
  | "invalid-summary"
  | "item-limit"
  | "budget-rescue"
  | "unknown";

export type CompactionTelemetryRecord = {
  schemaVersion: 1;
  ts: string;
  dialogId: string;
  outcome: CompactionTelemetryOutcome;
  trigger: CompactionTelemetryTrigger;
  attempts: number | null;
  model: string | null;
  provider: string | null;
  contextWindow: number;
  triggerPromptTokens: number | null;
  realUsageRatio: number | null;
  estimatedTokens: number | null;
  elapsedMs: number | null;
  primaryElapsedMs: number | null;
  saveElapsedMs: number | null;
  summaryInputTokens: number | null;
  summaryInputCapTokens: number | null;
  summaryExpandedMessages: number | null;
  summaryOmittedMessages: number | null;
  pendingMessageCount: number | null;
  compressedCount: number | null;
  retainedCount: number | null;
  compressedTokens: number | null;
  newSummaryTokens: number | null;
  residentReductionTokens: number | null;
  beforeProjectedTokens: number | null;
  afterProjectedTokens: number | null;
  finishReason: string | null;
};

export type CompactionTelemetryWriteOptions = {
  logFile?: string;
  /** 仅用于测试或离线工具强制解析默认路径（跳过 test 环境保护）。 */
  allowDefaultInTest?: boolean;
};

const VALID_OUTCOMES = new Set<CompactionTelemetryOutcome>([
  "success",
  "empty",
  "timeout",
  "provider-error",
  "aborted",
  "blocked",
  "unsafe-projection",
]);

function isTestEnvironment(): boolean {
  if (typeof process === "undefined") return false;
  return process.env?.NODE_ENV === "test" || process.env?.BUN_ENV === "test";
}

export function resolveCompactionTelemetryLogPath(
  opts?: CompactionTelemetryWriteOptions,
): string | null {
  if (typeof process !== "undefined" && process.env?.NOLO_COMPACTION_LOG_DISABLE === "1") {
    return null;
  }
  const explicit = opts?.logFile?.trim();
  if (explicit) return explicit;
  const envFile = typeof process !== "undefined" ? process.env?.NOLO_COMPACTION_LOG_FILE?.trim() : undefined;
  if (envFile) return envFile;
  const noloHome = typeof process !== "undefined" ? process.env?.NOLO_HOME?.trim() : undefined;
  if (isTestEnvironment() && !noloHome && !opts?.allowDefaultInTest) {
    return null;
  }
  return join(resolveNoloStateDir("telemetry"), "compaction.jsonl");
}

export function appendCompactionTelemetryRecord(
  record: CompactionTelemetryRecord,
  opts?: CompactionTelemetryWriteOptions,
): boolean {
  const file = resolveCompactionTelemetryLogPath(opts);
  if (!file) return false;
  try {
    mkdirSync(dirname(file), { recursive: true });
    appendFileSync(file, JSON.stringify(record) + "\n", "utf8");
    return true;
  } catch {
    return false;
  }
}

const optFiniteNum = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

const optStr = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;

export function parseCompactionTelemetryJsonl(raw: string): {
  records: CompactionTelemetryRecord[];
  malformedLines: number;
} {
  const records: CompactionTelemetryRecord[] = [];
  let malformedLines = 0;
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed) as Record<string, unknown>;
      if (
        !obj ||
        typeof obj !== "object" ||
        obj.schemaVersion !== COMPACTION_TELEMETRY_SCHEMA_VERSION ||
        typeof obj.ts !== "string" ||
        typeof obj.dialogId !== "string" ||
        !VALID_OUTCOMES.has(obj.outcome as CompactionTelemetryOutcome) ||
        typeof obj.contextWindow !== "number" ||
        !Number.isFinite(obj.contextWindow)
      ) {
        malformedLines++;
        continue;
      }
      records.push({
        schemaVersion: 1,
        ts: obj.ts,
        dialogId: obj.dialogId,
        outcome: obj.outcome as CompactionTelemetryOutcome,
        trigger: (typeof obj.trigger === "string" ? obj.trigger : "unknown") as CompactionTelemetryTrigger,
        attempts: optFiniteNum(obj.attempts),
        model: optStr(obj.model),
        provider: optStr(obj.provider),
        contextWindow: obj.contextWindow,
        triggerPromptTokens: optFiniteNum(obj.triggerPromptTokens),
        realUsageRatio: optFiniteNum(obj.realUsageRatio),
        estimatedTokens: optFiniteNum(obj.estimatedTokens),
        elapsedMs: optFiniteNum(obj.elapsedMs),
        primaryElapsedMs: optFiniteNum(obj.primaryElapsedMs),
        saveElapsedMs: optFiniteNum(obj.saveElapsedMs),
        summaryInputTokens: optFiniteNum(obj.summaryInputTokens),
        summaryInputCapTokens: optFiniteNum(obj.summaryInputCapTokens),
        summaryExpandedMessages: optFiniteNum(obj.summaryExpandedMessages),
        summaryOmittedMessages: optFiniteNum(obj.summaryOmittedMessages),
        pendingMessageCount: optFiniteNum(obj.pendingMessageCount),
        compressedCount: optFiniteNum(obj.compressedCount),
        retainedCount: optFiniteNum(obj.retainedCount),
        compressedTokens: optFiniteNum(obj.compressedTokens),
        newSummaryTokens: optFiniteNum(obj.newSummaryTokens),
        residentReductionTokens: optFiniteNum(obj.residentReductionTokens),
        beforeProjectedTokens: optFiniteNum(obj.beforeProjectedTokens),
        afterProjectedTokens: optFiniteNum(obj.afterProjectedTokens),
        finishReason: optStr(obj.finishReason),
      });
    } catch {
      malformedLines++;
    }
  }
  return { records, malformedLines };
}

export type PromptTokenBucketLabel =
  | "<120k"
  | "120k-200k"
  | "200k-300k"
  | ">=300k"
  | "no-telemetry";

const BUCKET_ORDER: readonly PromptTokenBucketLabel[] = [
  "<120k",
  "120k-200k",
  "200k-300k",
  ">=300k",
  "no-telemetry",
];

function classifyPromptBucket(promptTokens: number | null): PromptTokenBucketLabel {
  if (promptTokens === null || promptTokens <= 0) return "no-telemetry";
  if (promptTokens < 120_000) return "<120k";
  if (promptTokens < 200_000) return "120k-200k";
  if (promptTokens < 300_000) return "200k-300k";
  return ">=300k";
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1));
  return sorted[idx]!;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, n) => sum + n, 0) / values.length);
}

export type CompactionBucketSummary = {
  label: string;
  total: number;
  successCount: number;
  failureCount: number;
  omittedEvents: number;
  totalOmittedMessages: number;
  omittedRate: number;
  nearTimeoutCount: number;
  avgElapsedMs: number | null;
  p95ElapsedMs: number | null;
  avgResidentReductionTokens: number | null;
  avgTriggerPromptTokens: number | null;
};

export type CompactionAuditSample = {
  dialogId: string;
  ts: string;
  model: string | null;
  outcome: CompactionTelemetryOutcome;
  triggerPromptTokens: number | null;
  summaryOmittedMessages: number | null;
  elapsedMs: number | null;
  reason: string;
};

export type CompactionTelemetrySummary = {
  total: number;
  successCount: number;
  failureCount: number;
  buckets: CompactionBucketSummary[];
  byModel: CompactionBucketSummary[];
  auditSamples: CompactionAuditSample[];
};

function aggregateGroup(
  label: string,
  items: CompactionTelemetryRecord[],
): CompactionBucketSummary {
  const total = items.length;
  const succeeded = items.filter((r) => r.outcome === "success");
  const successCount = succeeded.length;
  const failureCount = total - successCount;
  // 仅在 outcome=success 时计入「摘要省略率」，避免把 blocked/失败行里
  // 未产出摘要的请求装载计数混入摘要有损率。
  const omittedEvents = succeeded.filter(
    (r) => typeof r.summaryOmittedMessages === "number" && r.summaryOmittedMessages > 0,
  ).length;
  const totalOmittedMessages = succeeded.reduce(
    (sum, r) => sum + (r.summaryOmittedMessages && r.summaryOmittedMessages > 0 ? r.summaryOmittedMessages : 0),
    0,
  );
  const elapsed = items
    .map((r) => r.elapsedMs)
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  const nearTimeoutCount = elapsed.filter((ms) => ms >= NEAR_TIMEOUT_THRESHOLD_MS).length;
  const reductions = succeeded
    .map((r) => r.residentReductionTokens)
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  const triggerTokens = items
    .map((r) => r.triggerPromptTokens)
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n) && n > 0);

  return {
    label,
    total,
    successCount,
    failureCount,
    omittedEvents,
    totalOmittedMessages,
    omittedRate: successCount > 0 ? Number((omittedEvents / successCount).toFixed(4)) : 0,
    nearTimeoutCount,
    avgElapsedMs: average(elapsed),
    p95ElapsedMs: percentile(elapsed, 0.95),
    avgResidentReductionTokens: average(reductions),
    avgTriggerPromptTokens: average(triggerTokens),
  };
}

function auditPriority(r: CompactionTelemetryRecord): { score: number; reason: string } {
  const reasons: string[] = [];
  let score = 0;
  if (r.outcome !== "success") {
    score += 1000;
    reasons.push(`outcome=${r.outcome}`);
  } else if (typeof r.summaryOmittedMessages === "number" && r.summaryOmittedMessages > 0) {
    score += 500 + Math.min(400, r.summaryOmittedMessages);
    reasons.push(`omitted=${r.summaryOmittedMessages}`);
  }
  if (typeof r.elapsedMs === "number" && r.elapsedMs >= NEAR_TIMEOUT_THRESHOLD_MS) {
    score += 200;
    reasons.push(`elapsed=${Math.round(r.elapsedMs / 1000)}s`);
  }
  if (typeof r.triggerPromptTokens === "number" && r.triggerPromptTokens >= 200_000) {
    score += 100 + Math.min(99, Math.floor(r.triggerPromptTokens / 10_000));
    reasons.push(`prompt=${Math.round(r.triggerPromptTokens / 1000)}k`);
  }
  if (reasons.length === 0) reasons.push("recent-sample");
  return { score, reason: reasons.join(",") };
}

export function summarizeCompactionTelemetry(
  records: readonly CompactionTelemetryRecord[],
  opts?: { maxAuditSamples?: number },
): CompactionTelemetrySummary {
  const bucketMap = new Map<PromptTokenBucketLabel, CompactionTelemetryRecord[]>();
  for (const label of BUCKET_ORDER) bucketMap.set(label, []);
  const modelMap = new Map<string, CompactionTelemetryRecord[]>();

  for (const r of records) {
    bucketMap.get(classifyPromptBucket(r.triggerPromptTokens))!.push(r);
    const modelKey = r.model ?? "(unknown)";
    const list = modelMap.get(modelKey);
    if (list) list.push(r);
    else modelMap.set(modelKey, [r]);
  }

  const buckets = BUCKET_ORDER.map((label) => aggregateGroup(label, bucketMap.get(label)!)).filter(
    (b) => b.total > 0,
  );
  const byModel = Array.from(modelMap.entries())
    .map(([model, list]) => aggregateGroup(model, list))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));

  const ranked = records
    .map((r) => ({ r, ...auditPriority(r) }))
    .sort((a, b) => b.score - a.score || b.r.ts.localeCompare(a.r.ts));

  const seenDialogs = new Set<string>();
  const maxSamples = opts?.maxAuditSamples ?? 10;
  const auditSamples: CompactionAuditSample[] = [];
  for (const item of ranked) {
    if (seenDialogs.has(item.r.dialogId)) continue;
    seenDialogs.add(item.r.dialogId);
    auditSamples.push({
      dialogId: item.r.dialogId,
      ts: item.r.ts,
      model: item.r.model,
      outcome: item.r.outcome,
      triggerPromptTokens: item.r.triggerPromptTokens,
      summaryOmittedMessages: item.r.summaryOmittedMessages,
      elapsedMs: item.r.elapsedMs,
      reason: item.reason,
    });
    if (auditSamples.length >= maxSamples) break;
  }

  const successCount = records.filter((r) => r.outcome === "success").length;
  return {
    total: records.length,
    successCount,
    failureCount: records.length - successCount,
    buckets,
    byModel,
    auditSamples,
  };
}

function fmtMs(ms: number | null): string {
  return ms === null ? "-" : `${(ms / 1000).toFixed(1)}s`;
}

function fmtTokens(n: number | null): string {
  if (n === null) return "-";
  return Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export function formatCompactionTelemetryReport(summary: CompactionTelemetrySummary): string {
  const lines: string[] = [];
  lines.push(
    `Compaction Observability Summary: total=${summary.total} success=${summary.successCount} fail/blocked=${summary.failureCount}`,
  );
  if (summary.total === 0) {
    lines.push("No compaction telemetry records found.");
    return lines.join("\n");
  }

  lines.push("");
  lines.push("By triggerPromptTokens bucket:");
  for (const b of summary.buckets) {
    const omitPct = `${Math.round(b.omittedRate * 100)}%`;
    lines.push(
      `  - ${b.label}: n=${b.total} (ok=${b.successCount}, fail=${b.failureCount}) | omitted=${b.omittedEvents}/${b.successCount} (${omitPct}, msgs=${b.totalOmittedMessages}) | avg=${fmtMs(b.avgElapsedMs)} p95=${fmtMs(b.p95ElapsedMs)} near60s=${b.nearTimeoutCount} | avgReduce=${fmtTokens(b.avgResidentReductionTokens)}`,
    );
  }

  lines.push("");
  lines.push("By model:");
  for (const m of summary.byModel) {
    const omitPct = `${Math.round(m.omittedRate * 100)}%`;
    lines.push(
      `  - ${m.label}: n=${m.total} (ok=${m.successCount}, fail=${m.failureCount}) | avgTrigger=${fmtTokens(m.avgTriggerPromptTokens)} | omitted=${omitPct} (msgs=${m.totalOmittedMessages}) | p95=${fmtMs(m.p95ElapsedMs)} near60s=${m.nearTimeoutCount}`,
    );
  }

  if (summary.auditSamples.length > 0) {
    lines.push("");
    lines.push("Priority dialogs for post-compaction accuracy spot-check:");
    for (const s of summary.auditSamples) {
      lines.push(
        `  - ${s.dialogId} (${s.model ?? "unknown"} | ${s.reason} | ${s.ts})`,
      );
    }
  }
  return lines.join("\n");
}
