import type { CliFetchImpl } from "../cliFetch";
import {
  parseUserIdFromAuthToken,
  resolveAuthToken,
  resolveServerCandidates,
  resolveServerUrl,
} from "../cliEnvHelpers";
import { listUserRecordsFromServers } from "../globalRecordOperations";
import {
  isScheduledDialog,
  normalizeDialogRecord,
  readDialogSnapshot,
  sortDialogs,
  type ListedDialog,
} from "../dialogCommands";
import { serializeMessageContent } from "core/chat/messageContentSerialize";
import { clipCompactText } from "core/clipCompactText";
import { t } from "./i18n";
import { runSelectDialog, type KeyReader, type SelectDialogItem } from "./selectDialog";
import { MAX_TUI_HISTORY_TURNS } from "./tuiHistory";

type EnvLike = Record<string, string | undefined>;

const DEFAULT_PICKER_LIMIT = 20;

/**
 * 服务端 ?limit=N 按原始时间戳返回最近 N 条，但不会排除 scheduled 对话
 * （isScheduledDialog 过滤发生在客户端）。为避免 top-N 里混入 scheduled
 * 导致过滤后显示不足，picker 在服务端按 pickerLimit 的该倍数超采，再在
 * 客户端过滤 scheduled -> 截断，兼顾性能（不全量拉取）与"尽量保留近期
 * 正常对话"（在高 scheduled 占比下为优雅退化，非保证）。
 */
const PICKER_OVERSAMPLE_FACTOR = 5;

/**
 * 恢复历史时最多显示 MAX_TUI_HISTORY_TURNS 条 user/assistant 消息。服务端
 * getConvMsgs 在 limit<=0 时全量拉取，对超长对话会遍历+反序列化全部消息（实测
 * 大 limit 拉取会显著变慢、甚至超时）。因此按该因子超采一个受限 limit，保证
 * 过滤掉 tool/system 消息后仍能凑够 MAX_TUI_HISTORY_TURNS 条可显示 turn，
 * 同时避免对超长对话全量拉取。
 */
const HISTORY_OVERSAMPLE_FACTOR = 2;

export type DialogPickerItem = SelectDialogItem & {
  dialog: ListedDialog;
};

/** Compact "3m/2h/5d ago" stamp; absolute date once it is over a month old. */
export function formatDialogTimestamp(
  value: string | number | null,
  now = Date.now(),
): string {
  if (value == null) return "";
  const time = typeof value === "number" ? value : Date.parse(value);
  if (!Number.isFinite(time) || time <= 0) return "";
  const deltaSeconds = Math.max(0, Math.floor((now - time) / 1000));
  if (deltaSeconds < 60) return t("timeJustNow");
  if (deltaSeconds < 3600) return t("timeMinutesAgo", String(Math.floor(deltaSeconds / 60)));
  if (deltaSeconds < 86400) return t("timeHoursAgo", String(Math.floor(deltaSeconds / 3600)));
  if (deltaSeconds < 30 * 86400) return t("timeDaysAgo", String(Math.floor(deltaSeconds / 86400)));
  const date = new Date(time);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toDialogPickerItems(dialogs: ListedDialog[]): DialogPickerItem[] {
  return dialogs.map((dialog) => {
    const stamp = formatDialogTimestamp(dialog.updatedAt ?? dialog.createdAt);
    return {
      label: clipCompactText(dialog.title, 48, "…"),
      detail: stamp,
      dialog,
    };
  });
}

export function renderDialogList(dialogs: ListedDialog[]): string {
  if (dialogs.length === 0) return t("noDialogsYet");
  const lines = [t("recentDialogs")];
  for (const [index, dialog] of dialogs.entries()) {
    const stamp = formatDialogTimestamp(dialog.updatedAt ?? dialog.createdAt);
    lines.push(
      `  ${index + 1}  ${clipCompactText(dialog.title, 48, "…")}${stamp ? `  ${stamp}` : ""}`,
      `     id=${dialog.id}`,
    );
  }
  lines.push("", t("dialogListTip"));
  return lines.join("\n");
}

export async function fetchRecentDialogs(args: {
  env: EnvLike;
  fetchImpl?: CliFetchImpl;
  fallbackFetchImpl?: CliFetchImpl;
  limit?: number;
}): Promise<{ dialogs: ListedDialog[] } | { error: string }> {
  const authToken = resolveAuthToken(args.env);
  if (!authToken) {
    return { error: t("historyNoToken") };
  }
  const userId = parseUserIdFromAuthToken(authToken);
  if (!userId) {
    return { error: t("historyBadToken") };
  }
  const serverUrls = resolveServerCandidates(args.env, resolveServerUrl(args.env));
  const pickerLimit = Math.max(1, args.limit ?? DEFAULT_PICKER_LIMIT);
  const result = await listUserRecordsFromServers({
    authToken,
    fetchImpl: args.fetchImpl ?? fetch,
    fallbackFetchImpl: args.fallbackFetchImpl,
    label: "dialog query",
    limit: pickerLimit * PICKER_OVERSAMPLE_FACTOR,
    serverUrls,
    type: "dialog",
    userId,
  });
  const dialogs = sortDialogs(
    result.records
      .map((record) => normalizeDialogRecord(record))
      .filter((dialog): dialog is ListedDialog => dialog != null)
      .filter((dialog) => !isScheduledDialog(dialog)),
  ).slice(0, pickerLimit);
  return { dialogs };
}

export type DialogPickerResult =
  | { kind: "selected"; dialog: ListedDialog }
  | { kind: "cancelled" }
  | { kind: "list"; output: string }
  | { kind: "error"; message: string };

export type DialogHistoryTurn = {
  role: "user" | "assistant";
  content: string;
};

export async function loadDialogHistoryForDisplay(args: {
  dialog: ListedDialog;
  env: EnvLike;
  fetchImpl?: CliFetchImpl;
}): Promise<DialogHistoryTurn[]> {
  const authToken = resolveAuthToken(args.env);
  if (!authToken) throw new Error(t("historyNoToken"));

  const read = await readDialogSnapshot({
    authToken,
    base: resolveServerUrl(args.env),
    dialogId: args.dialog.id,
    dialogKey: args.dialog.dbKey,
    fetchImpl: args.fetchImpl ?? fetch,
    limit: MAX_TUI_HISTORY_TURNS * HISTORY_OVERSAMPLE_FACTOR,
    messagesOnly: true,
  });
  const messages = Array.isArray(read.msgs) ? [...read.msgs].reverse() : [];
  const turns: DialogHistoryTurn[] = [];
  for (const message of messages) {
    const role = message?.role ?? message?.authorRole;
    if (role !== "user" && role !== "assistant") continue;
    const content = serializeMessageContent(message?.content, "[image]");
    if (content) turns.push({ role, content });
  }
  return turns;
}

export async function runDialogPicker(args: {
  env?: EnvLike;
  input?: NodeJS.ReadStream;
  output?: NodeJS.WritableStream;
  fetchImpl?: CliFetchImpl;
  fallbackFetchImpl?: CliFetchImpl;
  readKey?: KeyReader;
  interactive?: boolean;
  limit?: number;
  /** Dock the list above the composer; see runSelectDialog.bottomAnchored. */
  bottomAnchored?: boolean;
  bottomRow?: number | (() => number);
  inputPolicy?: import("./dialogHost").DialogInputPolicy;
  onTranscriptScroll?: (action: string) => void;
  registerForegroundRepaint?: (repaint: () => void) => void;
  mouseEnabled?: boolean;
}): Promise<DialogPickerResult> {
  const output = args.output ?? process.stdout;
  const input = args.input ?? process.stdin;
  const interactive =
    args.interactive ??
    ("isTTY" in input && Boolean(input.isTTY) && "isTTY" in output && Boolean(output.isTTY));

  const fetched = await fetchRecentDialogs({
    env: args.env ?? process.env,
    fetchImpl: args.fetchImpl,
    fallbackFetchImpl: args.fallbackFetchImpl,
    limit: args.limit,
  });
  if ("error" in fetched) {
    return { kind: "error", message: fetched.error };
  }
  if (!interactive || fetched.dialogs.length === 0) {
    return { kind: "list", output: renderDialogList(fetched.dialogs) };
  }

  const items = toDialogPickerItems(fetched.dialogs);
  const result = await runSelectDialog({
    items,
    title: `${t("historyPickerTitle")}  ${items.length}`,
    input,
    output,
    readKey: args.readKey,
    bottomAnchored: args.bottomAnchored,
    bottomRow: args.bottomRow,
    inputPolicy: args.inputPolicy,
    onTranscriptScroll: args.onTranscriptScroll,
    registerForegroundRepaint: args.registerForegroundRepaint,
    mouseEnabled: args.mouseEnabled,
  });
  if (result.kind === "cancelled") {
    return { kind: "cancelled" };
  }
  return { kind: "selected", dialog: result.item.dialog };
}
