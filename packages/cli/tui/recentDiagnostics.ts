import { getProcessRingBuffer, resolveDefaultLogPath } from "../diagnostics";
import type { DiagnosticEvent } from "../diagnostics/types";
import { t } from "./i18n";

export const RECENT_DIAGNOSTICS_LIMIT = 20;

function formatEventTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatEvent(event: DiagnosticEvent): string {
  const error = event.error ? ` — ${event.error}` : "";
  return `${formatEventTime(event.ts)} ${event.level.padEnd(5)} ${event.component}: ${event.message}${error}`;
}

/**
 * /logs：TUI 模式下诊断只进 ring buffer + 滚动日志文件，不上屏（避免残影）。
 * 这是用户在界面里唯一能看到它们的入口；完整历史指向日志文件。
 */
export function renderRecentDiagnostics(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
  events: DiagnosticEvent[] = getProcessRingBuffer()?.drain() ?? [],
  limit = RECENT_DIAGNOSTICS_LIMIT,
): string {
  if (events.length === 0) return t("logsEmpty");
  const recent = events.slice(-limit);
  return [
    t("logsHeader", String(recent.length), String(events.length), resolveDefaultLogPath(env)),
    ...recent.map(formatEvent),
  ].join("\n");
}
