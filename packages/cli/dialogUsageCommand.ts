import { extractCustomId } from "core/prefix";
import { resolveObservedSpeed } from "ai/token/observedSpeedResolver";
import { normalizeTimingMs } from "ai/token/providerCallTiming";
import { fetchUsageRecordsPage } from "ai/token/usageApi";
import type { TokenRecord } from "ai/token/types";
import { resolveAuthToken, resolveServerUrl, type EnvLike } from "./cliEnvHelpers";

/** One usage record is one recorded call, not necessarily every attempted request. */
export function formatDialogUsage(dialogKey: string, records: TokenRecord[]): string {
  if (records.length === 0) return `${dialogKey}: 无用量记录（对话不存在或尚无记录）。\n`;
  const input = records.reduce((sum, record) => sum + record.input_tokens, 0);
  const output = records.reduce((sum, record) => sum + record.output_tokens, 0);
  const durations = records.flatMap((record) => {
    const ms = normalizeTimingMs(record.callDurationMs);
    return ms === undefined ? [] : [ms];
  });
  const lines = [
    `Dialog: ${dialogKey}`,
    `调用次数（用量记录）: ${records.length}`,
    `Tokens: input=${input}, output=${output}`,
  ];
  if (durations.length === 0) {
    lines.push("无耗时数据");
  } else {
    lines.push(`总耗时（已记录调用之和，非对话墙钟时长）: ${durations.reduce((a, b) => a + b, 0)} ms（覆盖 ${durations.length}/${records.length}）`);
    if (durations.length < records.length) lines.push(`无耗时数据: ${records.length - durations.length} 条（仅计 tokens）`);
    const speed = resolveObservedSpeed(records, { limit: records.length });
    for (const group of speed.throughputGroups) {
      lines.push(`${group.basis}: median=${group.medianOutputTokensPerSecond} tokens/s, n=${group.throughputSampleCount}${group.throughputSampleCount === 1 ? "（单样本，不可靠）" : ""}`);
    }
    if (speed.throughputGroups.length === 0) lines.push("无有效速度样本");
  }
  return `${lines.join("\n")}\n`;
}

export async function runDialogUsageCommand(
  args: string[],
  deps: {
    env?: EnvLike;
    output?: { write(text: string): unknown };
    fetchPage?: typeof fetchUsageRecordsPage;
  } = {},
): Promise<number> {
  const output = deps.output ?? process.stdout;
  if (args.includes("--help") || args.includes("-h")) {
    output.write("Usage: nolo dialog usage <dialogKey> [--server-url <url>]\n");
    return 0;
  }
  const dialogKey = args[0]?.trim();
  if (!dialogKey || dialogKey.startsWith("--")) {
    output.write("Usage: nolo dialog usage <dialogKey> [--server-url <url>]\n");
    return 1;
  }
  const env = deps.env ?? process.env;
  const token = resolveAuthToken(args, env);
  if (!token) {
    output.write("[nolo] dialog usage requires login. Run `nolo login`.\n");
    return 1;
  }
  const dialogId = dialogKey.startsWith("dialog-") ? extractCustomId(dialogKey) : dialogKey;
  const api = { server: resolveServerUrl(args, env), token };
  const fetchPage = deps.fetchPage ?? fetchUsageRecordsPage;
  const records: TokenRecord[] = [];
  const endTime = Date.now();
  let cursor: string | null = null;
  const cursors = new Set<string>();
  do {
    const page = await fetchPage(api, { dialogId, startTime: 0, endTime, pageSize: 200, cursor });
    records.push(...page.records);
    if (!page.hasMore) break;
    if (!page.nextCursor || cursors.has(page.nextCursor)) throw new Error("Usage pagination did not advance; refusing a partial total.");
    cursor = page.nextCursor;
    cursors.add(cursor);
  } while (true);
  records.sort((a, b) => b.createdAt - a.createdAt);
  output.write(formatDialogUsage(dialogKey, records));
  return 0;
}
