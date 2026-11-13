import type { PermissionRequest } from "../../agent-runtime/actionGate";
import {
  renderDialogCommand,
  renderDialogTitle,
} from "./dialogFrame";
import { t } from "./i18n";
import { displayWidth } from "./tuiAnsi";
import {
  runSelectDialog,
  type KeyReader,
  type SelectDialogItem,
} from "./selectDialog";
import type { DialogSession } from "./dialogHost";

type ConfirmDialogItem = SelectDialogItem & {
  value: boolean;
};

/**
 * Conservative terminal width when the real width is unknown (non-TTY or a
 * stream that doesn't report columns). Keeps long commands from wrapping the
 * confirm frame into an unreadable wall of text.
 */
const FALLBACK_TERMINAL_WIDTH = 80;

/**
 * 宽度一律走共享的 `tuiAnsi.displayWidth`（emoji 2 列、EA=A 在 wide 约定下 2 列）。
 * 本模块曾自带 `WIDE_CHAR` 正则 + 本地 displayWidth：它只认 CJK/韩文/全角，把 emoji
 * 算 1 列、把 `…`/`→`/`×` 这类 EA=A 字符在 wide 终端下也算 1 列，于是「按列截断」的
 * 预算算错——正是它要防的折行/撑破。宽度真值只留一份。
 *
 * 按**字素簇**遍历（不是码点）：`👨‍👩‍👧‍👦`、`👍🏽`、`⚠️` 必须整体计量，逐码点切会把
 * ZWJ 序列拆成两半、宽度算错且截出半个表情。
 */
const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/**
 * Truncate a command to fit within `maxWidth` columns (accounting for the
 * 2-space indent renderDialogCommand adds) and append a localized
 * "(truncated)" marker when it had to be cut. Measures in terminal columns,
 * not code units, so a CJK command is cut where it actually overflows. Pure
 * string math — no ANSI — so the same value works whether color is on or off.
 */
function truncateCommand(command: string, maxWidth: number): string {
  const indent = 2;
  const budget = Math.max(10, maxWidth - indent);
  if (displayWidth(command) <= budget) return command;
  const marker = ` ${t("dialogConfirmCommandTruncated")}`;
  // 标记本身也是本地化文本（含 CJK 时每字 2 列），预算必须按列扣。
  const keep = Math.max(1, budget - displayWidth(marker));
  let kept = "";
  let width = 0;
  for (const { segment } of graphemeSegmenter.segment(command)) {
    const cells = displayWidth(segment);
    if (width + cells > keep) break;
    kept += segment;
    width += cells;
  }
  return `${kept}${marker}`;
}

export async function runConfirmDialog(args: {
  request: PermissionRequest;
  signal?: AbortSignal;
  /** Background shell confirmation must display the complete verbatim command. */
  fullCommand?: boolean;
  input?: NodeJS.ReadStream;
  output?: NodeJS.WritableStream;
  readKey?: KeyReader;
  /**
   * Dock the prompt above the composer; see runSelectDialog.bottomAnchored.
   * Required in practice for confirms opened mid-turn: an unanchored frame is
   * painted into the scroll region and wiped by the next streaming repaint.
   */
  bottomAnchored?: boolean;
  bottomRow?: number | (() => number);
  onTranscriptScroll?: (action: string) => void;
  mouseEnabled?: boolean;
  registerForegroundRepaint?: (repaint: () => void) => void;
  session?: DialogSession;
  /**
   * Called once when the user approves, before the dialog resolves `true`.
   * Approving means "remember this permission class", so callers use it to
   * record + persist the relevant bucket (local-run / remote-origin).
   * A throwing callback must never turn the approval into a rejection.
   */
  onApprove?: () => void;
}): Promise<boolean> {
  const output = args.output ?? process.stdout;
  const input = args.input ?? process.stdin;
  const interactive = Boolean((input as any).isTTY && (output as any).isTTY);
  if (!interactive) {
    return false;
  }

  // Two rows only: approve (remember this class + persist it) / reject.
  // There is no "this once" option — an approval that forgets is exactly what
  // made the user confirm the same class forever.
  const items: ConfirmDialogItem[] = [
    {
      label: t("dialogConfirmAllowLabel"),
      detail: t("dialogConfirmAllowDetail"),
      value: true,
    },
    {
      label: t("dialogConfirmCancelLabel"),
      detail: t("dialogConfirmCancelDetail"),
      value: false,
    },
  ];
  // Cursor rests on reject: Enter on a permission prompt must not grant.
  const rejectIndex = items.length - 1;

  // Build the title block as pre-rendered lines so the command can carry its
  // own danger color (renderDialogTitle wraps the whole string in one color
  // and cannot color a sub-line differently). Layout matches select/multi:
  // label line, then body, then the command (if any), then the key hint.
  //
  // PermissionRequest is a generic type (any tool/action can raise one), so
  // only known actions (destructive-shell and external-file access) get
  // localized copies. These permission requests have hardcoded Chinese
  // title/body at their request source. Every other action renders its own
  // title/body verbatim.
  let titleText = args.request.title;
  let bodyText = args.request.body;
  // Local-run bucket: its three classes share one approval, so each dialog
  // names its own class and then states what approving covers + how to undo.
  let localRunClass = false;
  if (args.request.action === "destructive_shell_command") {
    titleText = t("dialogConfirmTitle");
    bodyText = t("dialogConfirmBody");
    localRunClass = true;
  } else if (args.request.action === "external_file_access") {
    titleText = t("dialogConfirmExternalFileTitle");
    bodyText = t("dialogConfirmExternalFileBody");
    localRunClass = true;
  } else if (args.request.action === "file_write") {
    titleText = t("dialogConfirmFileWriteTitle");
    bodyText = t("dialogConfirmFileWriteBody");
    localRunClass = true;
  }
  if (localRunClass && bodyText && args.onApprove) {
    bodyText = `${bodyText}\n${t("dialogConfirmRememberLocal")}`;
  }

  const terminalWidth =
    typeof (output as any).columns === "number" && (output as any).columns > 0
      ? (output as any).columns
      : FALLBACK_TERMINAL_WIDTH;

  const titleLines: string[] = [
    renderDialogTitle(`${titleText}  ${t("dialogConfirmHint")}`),
  ];
  if (bodyText) titleLines.push(renderDialogTitle(bodyText));
  if (args.request.command) {
    const shown = args.fullCommand ? args.request.command : truncateCommand(args.request.command, terminalWidth);
    titleLines.push(renderDialogCommand(shown));
  }

  const result = await runSelectDialog({
    items,
    signal: args.signal,
    initialIndex: rejectIndex,
    titleLines,
    input,
    output,
    // Fixed by the modal-ownership spec: this gate never owns the wheel —
    // "transcript" routes wheel/page events to the workspace history,
    // and when no transcript callback exists (standalone runs) the event is
    // simply dropped. The wheel must never flip Approve/Reject.
    inputPolicy: { wheel: "transcript", pageKeys: "transcript" },
    onTranscriptScroll: args.onTranscriptScroll,
    mouseEnabled: args.mouseEnabled,
    registerForegroundRepaint: args.registerForegroundRepaint,
    session: args.session,
    ...(args.readKey ? { readKey: args.readKey } : {}),
    ...(args.bottomAnchored ? { bottomAnchored: args.bottomAnchored } : {}),
    ...(args.bottomRow ? { bottomRow: args.bottomRow } : {}),
  });

  if (result.kind === "cancelled") {
    return false;
  }

  const chosen = result.item as ConfirmDialogItem;
  if (chosen.value === true && args.onApprove) {
    // Remembering the grant is a side effect of approving *this* action, so a
    // failed write (read-only config, no profile) must never flip the answer
    // to "rejected" — the user approved, and the callback reports the failure.
    try {
      args.onApprove();
    } catch {
      /* best-effort: the approval below still stands */
    }
  }

  return chosen.value;
}
