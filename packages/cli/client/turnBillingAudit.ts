import {
  appendFileSync,
  closeSync,
  mkdirSync,
  openSync,
  readSync,
  statSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { normalizeUsage } from "../../ai/token/normalizeUsage";

/**
 * Turn 级计费审计日志（JSONL，append-only）。
 *
 * 背景：cli-local 前台对话的计费走 fail-open 客户端记账（无 providerCallId 时
 * 服务端不写 token- 明细、不扣 chat 账本），会话积分只在 TUI 内存里累计——
 * turn 一结束，「这个对话到底花了多少积分」就只剩状态行一个数字，无法对账。
 * 这里把每个 turn 的逐次调用用量落一份本地 JSONL，让积分永远可追溯。
 *
 * 副作用控制（设计约束，缺一不可）：
 * - 只写 `$NOLO_HOME/logs/turn-billing.jsonl` 一个文件；不进 LevelDB、不触发
 *   远端同步、不 patch dialog 记录、不改任何扣费/展示行为；
 * - 全程 try/catch 静默——审计失败绝不能影响对话（对齐 debugCaptureRawUsage
 *   的「审计捕获绝不能影响计费主链路」先例）；
 * - 只写 token 数字与计费元数据（model/provider/cost/callId），不写任何对话内容；
 * - env `NOLO_TURN_BILLING_AUDIT=0` 可整体关闭。
 */

/** usageRecords 里单次调用的最小形状（localLoop 的 usageRecords 元素子集）。 */
export type TurnBillingAuditUsageRecord = {
  callId?: string;
  usage?: Record<string, unknown> | null;
  model?: string;
  provider?: string;
};

export type TurnBillingAuditInput = {
  dialogId?: string | null;
  agentKey?: string | null;
  /** 本轮平台积分汇总（sumPlatformCredits 口径）；undefined = 本轮无平台计费。 */
  turnCredits?: number | null;
  /** 中断/失败的 turn 照样扣了费，标记出来便于对账时区分。 */
  aborted?: boolean;
  usageRecords?: readonly TurnBillingAuditUsageRecord[] | null;
};

/** usage 帧的审计投影：只保留 token 数字与计费元数据，字段名对齐服务端 token 记录。 */
export function projectUsageForAudit(
  usage?: Record<string, unknown> | null
): Record<string, number | string> | null {
  if (!usage || typeof usage !== "object") return null;
  const normalized = normalizeUsage(usage as never);
  const projected: Record<string, number | string> = {
    input_tokens: normalized.input_tokens,
    output_tokens: normalized.output_tokens,
    cache_read_input_tokens: normalized.cache_read_input_tokens,
    cache_creation_input_tokens: normalized.cache_creation_input_tokens,
  };
  if (typeof usage.cost === "number" && Number.isFinite(usage.cost)) {
    projected.cost = usage.cost;
  }
  if (typeof usage.billing_unit === "string" && usage.billing_unit.trim()) {
    projected.billing_unit = usage.billing_unit;
  }
  if (
    typeof usage.provider_call_id === "string" &&
    usage.provider_call_id.trim()
  ) {
    projected.provider_call_id = usage.provider_call_id.trim();
  }
  return projected;
}

export function resolveTurnBillingAuditLogPath(
  env: { NOLO_HOME?: string } = process.env
): string {
  const noloHome = env.NOLO_HOME?.trim() || join(homedir(), ".nolo");
  return join(noloHome, "logs", "turn-billing.jsonl");
}

/**
 * 把一个 turn 的逐次调用用量追加进审计日志。fire-and-forget：
 * 同步 append 一行（每 turn 一次、单行 ~1-2KB），失败静默吞掉。
 */
export function appendTurnBillingAudit(input: TurnBillingAuditInput): void {
  try {
    if (process.env.NOLO_TURN_BILLING_AUDIT === "0") return;
    const calls = (input.usageRecords ?? [])
      .map((record) => {
        const usage = projectUsageForAudit(record?.usage);
        if (!usage) return null;
        return {
          ...(record?.callId ? { callId: record.callId } : {}),
          ...(record?.model ? { model: record.model } : {}),
          ...(record?.provider ? { provider: record.provider } : {}),
          ...usage,
        };
      })
      .filter((call): call is Record<string, number | string> => call !== null);
    if (calls.length === 0 && (input.turnCredits === undefined || input.turnCredits === null)) {
      return;
    }
    const row = {
      ts: Date.now(),
      ...(input.dialogId ? { dialogId: input.dialogId } : {}),
      ...(input.agentKey ? { agentKey: input.agentKey } : {}),
      ...(input.turnCredits !== undefined && input.turnCredits !== null
        ? { turnCredits: input.turnCredits }
        : {}),
      ...(input.aborted ? { aborted: true } : {}),
      calls,
    };
    const logPath = resolveTurnBillingAuditLogPath();
    mkdirSync(join(logPath, ".."), { recursive: true });
    appendFileSync(logPath, `${JSON.stringify(row)}\n`);
  } catch {
    // 审计捕获绝不能影响计费主链路 / 对话可用性。
  }
}

/**
 * 从 turn-billing.jsonl 尾部读取指定 dialog 最近一次调用的 input_tokens。
 * 仅作为 dialog 记录未命中 lastInputTokens 时的轻量回退。
 * 小 IO：只读取文件末尾最大 64KB，单次 read，禁止全量扫描大文件。
 */
export function readLastTurnBillingInputTokens(
  dialogId: string,
  env: { NOLO_HOME?: string } = process.env,
): number | undefined {
  if (!dialogId || typeof dialogId !== "string") return undefined;
  try {
    const logPath = resolveTurnBillingAuditLogPath(env);
    const stat = statSync(logPath, { throwIfNoEntry: false });
    if (!stat || !stat.isFile() || stat.size === 0) return undefined;

    const maxBytesToRead = 64 * 1024;
    const bytesToRead = Math.min(stat.size, maxBytesToRead);
    const buffer = Buffer.alloc(bytesToRead);
    const fd = openSync(logPath, "r");
    try {
      readSync(fd, buffer, 0, bytesToRead, stat.size - bytesToRead);
    } finally {
      closeSync(fd);
    }

    const text = buffer.toString("utf-8");
    const lines = text.split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (!line) continue;
      try {
        const parsed = JSON.parse(line);
        if (parsed && typeof parsed === "object" && parsed.dialogId === dialogId) {
          if (Array.isArray(parsed.calls) && parsed.calls.length > 0) {
            for (let j = parsed.calls.length - 1; j >= 0; j--) {
              const call = parsed.calls[j];
              if (
                call &&
                typeof call.input_tokens === "number" &&
                Number.isFinite(call.input_tokens) &&
                call.input_tokens > 0
              ) {
                return call.input_tokens;
              }
            }
          }
        }
      } catch {
        // partial first line from chunk boundary or malformed line, continue
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
}

