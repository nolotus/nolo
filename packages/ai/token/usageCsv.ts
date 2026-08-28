// 明细导出 CSV 纯函数（无 DOM、无副作用，可单测）。
// 列结构对齐 UsageRecord 表格；费用输出原始数值（不带单位，便于继续计算）。

import type { TokenRecord } from "./types";

export interface UsageCsvOptions {
  /** IANA 时区：与明细表格显示一致（默认用户在哪个时区看就是哪个时区） */
  timeZone?: string;
}

const csvCell = (value: unknown): string => {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const tsOf = (r: TokenRecord): number => {
  const raw: unknown = r.createdAt ?? (r as any).timestamp;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const parsed = typeof raw === "string" ? Date.parse(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatParts = (
  ts: number,
  timeZone: string,
  dateTimeFormat: "date" | "time"
): string => {
  if (!ts) return dateTimeFormat === "date" ? "" : "";
  const fmt = new Intl.DateTimeFormat("zh-CN", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = fmt.formatToParts(ts);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  if (dateTimeFormat === "date") {
    return `${get("year")}-${get("month")}-${get("day")}`;
  }
  return `${get("hour")}:${get("minute")}:${get("second")}`;
};

const HEADERS = [
  "日期",
  "时间(本地)",
  "Robot ID",
  "模型",
  "供应商",
  "Input Tokens",
  "Cache Read",
  "Cache Creation",
  "Output Tokens",
  "费用",
];

/** 明细 → CSV 文本（含 UTF-8 BOM，Excel 打开中文不乱码）。 */
export function buildUsageCsv(
  records: TokenRecord[],
  options: UsageCsvOptions = {}
): string {
  const timeZone = options.timeZone ?? "UTC";
  const rows = records.map((r) => {
    const ts = tsOf(r);
    const served =
      r.billing_provider || r.provider || "";
    return [
      csvCell(formatParts(ts, timeZone, "date")),
      csvCell(formatParts(ts, timeZone, "time")),
      csvCell(r.cybotId ?? ""),
      csvCell(r.model ?? ""),
      csvCell(served),
      csvCell(r.input_tokens ?? 0),
      csvCell(r.cache_read_input_tokens ?? 0),
      csvCell(r.cache_creation_input_tokens ?? 0),
      csvCell(r.output_tokens ?? 0),
      csvCell(r.cost ?? 0),
    ].join(",");
  });

  return "\uFEFF" + [HEADERS.join(","), ...rows].join("\n") + "\n";
}
