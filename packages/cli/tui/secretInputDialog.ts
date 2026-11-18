/** Private secret buffer: never use ask_choice/composer answer state or echo input. */
import { safeAskText } from "./askTextSanitize";
import { createStandaloneDialogSession } from "./dialogHost";
import { renderDialogRow, renderDialogRule } from "./dialogFrame";
import {
  createDialogFramePainter,
  createRawKeyReader,
  STREAM_CLOSED,
  type KeyReader,
} from "./selectDialog";
import { PASTE_TOKEN_PREFIX } from "./sessionInput";
import { truncateAnsi } from "./tuiAnsi";

const PASTE_START = "\x1b[200~";
const PASTE_END = "\x1b[201~";

export type SecretTokenSession = { readKey: KeyReader; signal: AbortSignal; decodedTokens: true };

/** Workspace-local FIFO; head owns its slot through operation finally. */
export function createSecretInputCoordinator() {
  type Entry = { start: (s: SecretTokenSession) => Promise<unknown>; settle: (v: any) => void; cancelled: () => unknown; controller: AbortController; detach: () => void };
  const queue: Entry[] = [];
  let active: Entry | null = null;
  let inbox: string[] = [];
  let waiter: ((key: string | typeof STREAM_CLOSED) => void) | null = null;
  let closed = false;
  const closeInbox = () => { inbox = []; waiter?.(STREAM_CLOSED); waiter = null; };
  const cancel = (entry: Entry) => {
    entry.controller.abort();
    if (active === entry) { closeInbox(); return; }
    const index = queue.indexOf(entry);
    if (index >= 0) queue.splice(index, 1);
    entry.detach(); entry.settle(entry.cancelled());
  };
  return {
    enqueue<T>(start: (s: SecretTokenSession) => Promise<T>, options: { signal?: AbortSignal; cancelled: () => T }): Promise<T> {
      return new Promise((resolve) => {
        const entry: Entry = { start, settle: resolve, cancelled: options.cancelled, controller: new AbortController(), detach: () => options.signal?.removeEventListener("abort", abort) };
        const abort = () => cancel(entry);
        if (closed || options.signal?.aborted) { resolve(options.cancelled()); return; }
        queue.push(entry);
        options.signal?.addEventListener("abort", abort, { once: true });
      });
    },
    isActive: () => active !== null,
    handleToken(token: string): boolean {
      if (active) {
        if (!active.controller.signal.aborted) {
          if (waiter) { const resolve = waiter; waiter = null; resolve(token); }
          else inbox.push(token);
        }
        return true;
      }
      if (closed || !queue.length || token !== "\x07") return false;
      const entry = queue[0]!;
      active = entry; inbox = [];
      const readKey: KeyReader = () => new Promise((resolve) => {
        if (entry.controller.signal.aborted) resolve(STREAM_CLOSED);
        else if (inbox.length) resolve(inbox.shift()!);
        else waiter = resolve;
      });
      readKey.dispose = closeInbox;
      // Inbox is registered before start, including synchronous decoder bursts.
      let operation: Promise<unknown>;
      try { operation = entry.start({ readKey, signal: entry.controller.signal, decodedTokens: true }); }
      catch { operation = Promise.resolve(entry.cancelled()); }
      const release = () => {
        closeInbox(); entry.detach();
        queue.splice(queue.indexOf(entry), 1); active = null;
      };
      void Promise.resolve(operation).then((value) => { release(); entry.settle(value); }, () => { release(); entry.settle(entry.cancelled()); });
      return true;
    },
    dispose() { closed = true; for (const entry of [...queue]) cancel(entry); },
  };
}

export async function runSecretInputDialog(args: {
  label: string;
  input: NodeJS.ReadStream;
  output: NodeJS.WritableStream;
  /** Caller holds dialogHost.withKeyboard and pauses the composer. */
  bottomRow: () => number;
  readKey?: KeyReader;
  signal?: AbortSignal;
  decodedTokens?: boolean;
  /** Synchronous existing store operation; errors stay private and retryable. */
  save?: (value: string) => void;
}): Promise<string> {
  const { input, output } = args;
  const checkAbort = () => { if (args.signal?.aborted) throw new Error("secret.promptAborted"); };
  checkAbort();
  if (!input.isTTY || !(output as NodeJS.WriteStream).isTTY) {
    throw new Error("secret.promptNonTtyNotSupported");
  }
  const session = createStandaloneDialogSession({ input, output });
  // Acquire raw mode before attaching a reader: canonical terminal echo must
  // never see secret bytes. In the workspace the composer already owns raw mode.
  const acquired = session.acquireRaw();
  let value = "";
  let notice = "";
  const invalid = () => /[\x00-\x1f\x7f-\x9f]/.test(value);
  let paste: string | null = null;
  // Activation belongs to the workspace before it claims keyboard ownership.
  let tail = "";
  let readKey: KeyReader | undefined;
  const painter = createDialogFramePainter({
    output,
    bottomAnchored: true,
    resolveBottomRow: args.bottomRow,
    session,
    render: () => {
      const cols = (output as NodeJS.WriteStream).columns || 80;
      const width = Math.max(1, cols - 1);
      const mask = "•".repeat(Math.min(Array.from(value).length, Math.max(1, width - 4)));
      const lines = [
        renderDialogRule(cols, false),
        `? ${safeAskText(args.label)}`,
        "  保存到本机现有 secret store · 不进入聊天记录",
        renderDialogRow({ label: mask || "输入凭据（已掩码）", focused: true }, false),
        ...(invalid() ? ["  输入含控制字符，尚未保存 · Ctrl+U 清空重输 · Esc 取消"] : notice ? [`  ${notice}`] : []),
        "  尚未保存 · Ctrl+G 保存并继续 · Esc 取消",
      ];
      // No real cursor relocation/focus request. Only mask length is visible.
      return lines.map((line) => truncateAnsi(line, width)).join("\n");
    },
  });
  const resize = () => painter.paint();
  // Pasted line breaks / terminal controls are never commands. The complete
  // bracketed payload is sanitized only after its terminator, including splits.
  // Preserve anomalous data privately; never silently save a transformed value.
  const append = (text: string) => { value += text; notice = ""; };
  let wakeAbort: (() => void) | undefined;
  const abort = () => { wakeAbort?.(); readKey?.dispose?.(); };
  const aborted = new Promise<typeof STREAM_CLOSED>((resolve) => { wakeAbort = () => resolve(STREAM_CLOSED); });
  try {
    readKey = args.readKey ?? createRawKeyReader(input, { preserveBracketedPaste: true });
    args.signal?.addEventListener("abort", abort, { once: true });
    output.on("resize", resize);
    painter.paint();
    while (true) {
      checkAbort();
      let sequence = await Promise.race([readKey(), aborted]);
      checkAbort();
      if (args.decodedTokens && typeof sequence === "string" && sequence.startsWith(PASTE_TOKEN_PREFIX)) {
        append(sequence.slice(PASTE_TOKEN_PREFIX.length));
        painter.paint();
        continue;
      }
      if (sequence === STREAM_CLOSED) throw new Error("secret.promptAborted");
      sequence = tail + sequence;
      tail = "";
      while (sequence) {
        if (paste !== null) {
          paste += sequence;
          const end = paste.indexOf(PASTE_END);
          if (end < 0) break;
          append(paste.slice(0, end));
          sequence = paste.slice(end + PASTE_END.length);
          paste = null;
          continue;
        }
        if (sequence.startsWith(PASTE_START)) {
          paste = "";
          sequence = sequence.slice(PASTE_START.length);
          continue;
        }
        // The shared reader can deliver a whole data burst, including text,
        // Enter and bracketed markers. Decode controls before handling text.
        const csi = /^(?:\x1b\[[0-9;< ?]*[A-Za-z~]|\x1bO[A-Za-z])/.exec(sequence);
        if (csi) { sequence = sequence.slice(csi[0].length); continue; }
        if (/^\x1b\[[0-9;?]*$/.test(sequence) || sequence === "\x1bO") {
          tail = sequence;
          break;
        }
        const char = Array.from(sequence)[0]!;
        sequence = sequence.slice(char.length);
        if (char === "\x1b" || char === "\x03" || char === "\x04") {
          throw new Error("secret.promptAborted");
        }
        if (char === "\x07") {
          if (!value || invalid()) { notice = "请修正输入：Ctrl+U 清空重输，或 Esc 取消"; continue; }
          checkAbort();
          try { args.save?.(value); return value; }
          catch { checkAbort(); notice = "保存失败，输入已保留 · Ctrl+G 重试 · Esc 取消"; }
        } else if (char === "\x15") {
          value = ""; notice = "";
        } else if (char === "\r" || char === "\n") {
          notice = "尚未保存，请按 Ctrl+G 保存并继续";
        } else if (char === "\x7f" || char === "\b") {
          value = Array.from(value).slice(0, -1).join("");
        } else {
          append(char);
        }
      }
      painter.paint();
    }
  } finally {
    args.signal?.removeEventListener("abort", abort);
    value = "";
    paste = null;
    tail = "";
    output.off("resize", resize);
    readKey?.dispose?.();
    painter.clear();
    session.releaseRaw(acquired);
  }
}
