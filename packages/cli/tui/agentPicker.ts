import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
import { resolveCliAgentKeyInput } from "../agentAliases";
import type { CliFetchImpl } from "../cliFetch";
import { formatQuotaSummary } from "ai/agent/quotaSnapshot";
import {
  findAgentCatalogEntry,
  formatAgentSourceLabel,
  formatUnavailableFavoritesNotice,
  hasWarmAgentCatalogCache,
  loadAgentCatalogWithNotices,
  renderAgentCatalogList,
  type AgentCatalogEntry,
} from "./agentCatalog";
import { runSelectDialog, outputIsTty, type KeyReader, type SelectDialogItem } from "./selectDialog";
import { t } from "./i18n";

type EnvLike = Record<string, string | undefined>;

export type AgentPickerItem = SelectDialogItem & {
  entry: AgentCatalogEntry;
};

export function toAgentPickerItems(entries: AgentCatalogEntry[]): AgentPickerItem[] {
  return entries.map((entry) => {
    // compact：picker 行宽敏感（超 80 列物理换行会破坏 anchored 帧的按行清屏），
    // 只显示容量段；完整窗口与重置时间在 `nolo agent list` / catalog 列表里看。
    const quota = formatQuotaSummary(entry.quota, Date.now(), { compact: true });
    return {
      label: entry.name,
      detail: `${entry.favoritedAt ? "★ " : ""}${entry.model}  ${formatAgentSourceLabel(entry)}${quota ? `  [${quota}]` : ""}`,
      entry,
    };
  });
}

export function formatAgentSwitchMessage(args: {
  name: string;
  dialogId?: string;
}) {
  const dialog = args.dialogId ? `Dialog kept: ${args.dialogId}` : "Dialog kept: new";
  return `Switched to ${args.name}. ${dialog}`;
}

export async function runAgentPicker(args: {
  currentKey: string;
  env?: EnvLike;
  input?: NodeJS.ReadStream;
  output?: NodeJS.WritableStream;
  fetchImpl?: CliFetchImpl;
  fallbackFetchImpl?: CliFetchImpl;
  readKey?: KeyReader;
  interactive?: boolean;
  /** Dock the list above the composer; see runSelectDialog.bottomAnchored. */
  bottomAnchored?: boolean;
  bottomRow?: number | (() => number);
  inputPolicy?: import("./dialogHost").DialogInputPolicy;
  onTranscriptScroll?: (action: string) => void;
  registerForegroundRepaint?: (repaint: () => void) => void;
  mouseEnabled?: boolean;
  session?: import("./dialogHost").DialogSession;
  /** Force synchronous network revalidation before opening instead of serving cached catalog. */
  fresh?: boolean;
  /** When serving from cache, trigger a background revalidation. Defaults to true. */
  revalidateInBackground?: boolean;
}) {
  const output = args.output ?? process.stdout;
  const input = args.input ?? process.stdin;
  const interactive =
    args.interactive ??
    ("isTTY" in input && Boolean(input.isTTY) && "isTTY" in output && Boolean(output.isTTY));

  const fresh = args.fresh ?? false;
  // 仅在无可用缓存或显式要求 fresh 时显示 loading 提示；
  // warm 场景直接返回缓存渲染，避免终端闪烁与无意义网络阻塞。
  const isTty = outputIsTty(output);
  const showLoading = isTty && (fresh || !hasWarmAgentCatalogCache({ env: args.env }));
  if (showLoading) {
    output.write(t("agentPickerLoading"));
  }

  let loadResult: Awaited<ReturnType<typeof loadAgentCatalogWithNotices>>;
  try {
    loadResult = await loadAgentCatalogWithNotices({
      env: args.env,
      currentKey: args.currentKey,
      fetchImpl: args.fetchImpl,
      fallbackFetchImpl: args.fallbackFetchImpl,
      fresh,
      revalidateInBackground: args.revalidateInBackground ?? true,
    });
  } finally {
    // 清除 loading 提示行（异常时也不残留）。
    if (showLoading) {
      output.write("\r\x1b[2K");
    }
  }
  const entries = loadResult.entries;
  // 收藏项 hydrate 失败时的单行提示；成功路径下为 null（零额外输出）。
  const unavailableNotice = formatUnavailableFavoritesNotice(
    loadResult.unavailableFavoriteCount
  );
  const staleNotice = loadResult.refreshStatus === "degraded" || loadResult.refreshStatus === "failed"
    ? "列表可能不是最新（刷新未完成，请再次打开重试）" : null;
  const footerLines = [unavailableNotice, staleNotice].filter((line): line is string => Boolean(line));

  if (!interactive) {
    return {
      kind: "list" as const,
      output: renderAgentCatalogList(entries, args.currentKey, {
        unavailableFavoriteCount: loadResult.unavailableFavoriteCount,
      }),
      entries,
    };
  }

  const items = toAgentPickerItems(entries);
  const initialIndex = Math.max(
    entries.findIndex((entry) => entry.key === args.currentKey),
    0
  );
  const result = await runSelectDialog({
    items,
    initialIndex,
    title: undefined,
    ...(footerLines ? { footerLines } : {}),
    input,
    output,
    readKey: args.readKey,
    bottomAnchored: args.bottomAnchored,
    bottomRow: args.bottomRow,
    inputPolicy: args.inputPolicy,
    onTranscriptScroll: args.onTranscriptScroll,
    registerForegroundRepaint: args.registerForegroundRepaint,
    mouseEnabled: args.mouseEnabled,
    session: args.session,
  });
  if (result.kind === "cancelled") {
    return { kind: "cancelled" as const, entries };
  }

  const selected = result.item.entry;
  return {
    kind: "selected" as const,
    name: selected.name,
    key: selected.key,
    model: selected.model,
    entries,
  };
}

export function resolveAgentSwitchTarget(
  rawTarget: string,
  catalogEntries: AgentCatalogEntry[] = []
) {
  // 自动路由只剩 flash 一档，catalog 不再提供 "auto" 项；把旧入口
  // /switch auto 当作 /switch nolo 解析，回到默认 agent（同 key）。
  const target = rawTarget.trim() === "auto" ? "nolo" : rawTarget.trim();
  const resolvedKey = resolveCliAgentKeyInput(target);
  if (resolvedKey !== target) {
    const aliasEntry = catalogEntries.find((entry) => entry.key === resolvedKey);
    return {
      name: aliasEntry?.name ?? asTrimmedLowercaseString(target),
      key: resolvedKey,
      ...(aliasEntry?.model ? { model: aliasEntry.model } : {}),
    };
  }
  return findAgentCatalogEntry(catalogEntries, rawTarget);
}
