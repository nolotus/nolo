import { buildKittyProbe, KITTY_PROBE_ID, planGraphics, resolveGraphicsMode, type GraphicsEnv } from "./terminalGraphics";

const MAX_BUFFER = 4096;
const TIMEOUT_MS = 150;
// ESC alone is also a keyboard key, not evidence of a protocol reply. Give
// only its ambiguous first byte a keyboard-sized grace; confirmed prefixes
// retain the longer protocol window. This applies even after probe completion.
const BARE_ESC_GRACE_MS = 15;
const APC = "\x1b_G";
const ST = "\x1b\\";

/**
 * Can `value` still grow into a complete APC frame?
 *
 * The control block is comma-separated `key=value` pairs; `i` is numeric, and
 * unknown keys plus bare tokens are tolerated so unrelated APC traffic keeps
 * passing through untouched. The first `;` starts the base64 payload, and the
 * frame ends with ST. The grammar is prefix-closed, so the first position where
 * it fails is exactly where the frame ended and keyboard input begins.
 */
function isApcFramePrefix(value: string): boolean {
  if (!value.startsWith(APC)) return false;
  let rest = value.slice(APC.length);
  if (rest.endsWith(ST)) rest = rest.slice(0, -ST.length);
  else if (rest.endsWith("\x1b")) rest = rest.slice(0, -1);
  const semicolon = rest.indexOf(";");
  if (semicolon >= 0 && !/^[A-Za-z0-9+/=]*$/.test(rest.slice(semicolon + 1))) return false;
  const control = semicolon < 0 ? rest : rest.slice(0, semicolon);
  for (const pair of control.split(",")) {
    if (pair === "") continue;
    const eq = pair.indexOf("=");
    if (eq < 0) {
      if (!/^[A-Za-z0-9+/=_-]+$/.test(pair)) return false;
      continue;
    }
    const key = pair.slice(0, eq);
    const val = pair.slice(eq + 1);
    if (key === "i") {
      if (!/^\d*$/.test(val)) return false;
      continue;
    }
    if (!/^[a-z]$/.test(key) || !/^[A-Za-z0-9+/=_-]*$/.test(val)) return false;
  }
  return true;
}

/**
 * Length of the longest prefix of `value` that can still be an APC frame.
 *
 * The grammar is prefix-closed (truncating a valid prefix stays valid), so the
 * valid lengths form a prefix of the range and the boundary can be bisected:
 * O(log n) validations instead of re-validating every growing prefix, which
 * measurably blocked the input timer on long headers.
 */
function apcFrameEnd(value: string): number {
  if (isApcFramePrefix(value)) return value.length;
  let lo = APC.length;
  let hi = value.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (isApcFramePrefix(value.slice(0, mid))) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export interface TerminalGraphicsRuntimeOptions {
  output: { write(data: string): unknown };
  env: GraphicsEnv;
  isTTY: boolean;
  onCapabilityChanged?: (enabled: boolean) => void;
  onForwardInput?: (input: string) => void;
  timeoutMs?: number;
}

export function createTerminalGraphicsRuntime(options: TerminalGraphicsRuntimeOptions) {
  const timeout = options.timeoutMs ?? TIMEOUT_MS;
  let enabled = false;
  let disposed = false;
  let started = false;
  let issued = false;
  let probing = false;
  let replied = false;
  let probeUntil = 0;
  let daUntil = 0;
  let pending = "";
  // Oversized APCs stream through (unknown) or drain (our query), without buffering.
  let overflow: "pass" | "drop" | undefined;
  let overflowEsc = false;
  let inputTimer: ReturnType<typeof setTimeout> | undefined;
  let probeTimer: ReturnType<typeof setTimeout> | undefined;

  const clearInputTimer = () => {
    if (inputTimer !== undefined) clearTimeout(inputTimer);
    inputTimer = undefined;
  };
  const cancelProbe = () => {
    if (probeTimer !== undefined) clearTimeout(probeTimer);
    probeTimer = undefined;
    probing = false;
  };
  const queryReply = (packet: string) => {
    const semicolon = packet.indexOf(";", APC.length);
    if (semicolon < 0) return undefined;
    const id = /(?:^|,)i=(\d+)(?:,|$)/.exec(packet.slice(APC.length, semicolon));
    if (!id || Number(id[1]) !== KITTY_PROBE_ID) return undefined;
    return packet.slice(semicolon + 1, -ST.length);
  };
  const finishReply = (body?: string) => {
    const timely = probing && Date.now() < probeUntil;
    cancelProbe();
    // Only the first reply opens an associated DA window; duplicates cannot extend it.
    if (!replied) { replied = true; daUntil = Date.now() + timeout; }
    if (timely && body === "OK" && !enabled) {
      enabled = true;
      options.onCapabilityChanged?.(true);
    }
  };
  const armInput = () => {
    clearInputTimer();
    if (disposed || (!pending && !overflow)) return;
    inputTimer = setTimeout(() => {
      inputTimer = undefined;
      // A held buffer is a truncated reply only up to the end of its frame;
      // everything behind that point is keystrokes typed while the reply was
      // still arriving and must reach the composer instead of being dropped.
      // Non-APC holds (bare ESC, DA fragments) are keyboard input in full.
      const frameEnd = pending.startsWith(APC) ? apcFrameEnd(pending) : 0;
      const forward = pending.slice(frameEnd);
      pending = "";
      overflow = undefined;
      overflowEsc = false;
      if (!disposed && forward) options.onForwardInput?.(forward);
    }, pending === "\x1b" ? Math.min(BARE_ESC_GRACE_MS, timeout) : timeout);
  };
  const start = () => {
    if (disposed || started) return;
    started = true;
    if (!options.isTTY || !planGraphics(resolveGraphicsMode(options.env.NOLO_TUI_IMAGES), options.env).probe) return;
    issued = true;
    probing = true;
    probeUntil = daUntil = Date.now() + timeout;
    probeTimer = setTimeout(() => { probeTimer = undefined; probing = false; }, timeout);
    options.output.write(buildKittyProbe());
  };
  const filterInput = (input: string): string => {
    if (disposed || !issued) return input;
    clearInputTimer();
    let output = "";
    for (const char of input) {
      if (disposed) { output += char; continue; }
      if (overflow) {
        if (overflow === "pass") output += char;
        if (overflowEsc && char === "\\") {
          const matching = overflow === "drop";
          overflow = undefined;
          if (matching) finishReply();
        }
        overflowEsc = char === "\x1b";
        continue;
      }
      if (!pending) {
        if (char === "\x1b") pending = char;
        else output += char;
        continue;
      }
      pending += char;
      if (pending.startsWith(APC)) {
        if (pending.endsWith(ST)) {
          const body = queryReply(pending);
          if (body === undefined) output += pending;
          else finishReply(body);
          pending = "";
        } else if (pending.length >= MAX_BUFFER) {
          // Add a synthetic terminator solely to inspect the already received header.
          overflow = queryReply(pending + ST) === undefined ? "pass" : "drop";
          if (overflow === "pass") output += pending;
          overflowEsc = pending.endsWith("\x1b");
          pending = "";
        }
        continue;
      }
      const daActive = Date.now() < daUntil;
      if (pending === "\x1b_" || (daActive && (pending === "\x1b[" || /^\x1b\[\?[0-9;]*$/.test(pending)))) {
        if (pending.length < MAX_BUFFER) continue;
      } else if (daActive && /^\x1b\[\?[0-9;]*c$/.test(pending)) {
        cancelProbe();
        daUntil = 0;
        pending = "";
        continue;
      }
      // Not a candidate: preserve every byte, retaining only a new trailing ESC.
      const trailingEsc = pending.endsWith("\x1b");
      output += trailingEsc ? pending.slice(0, -1) : pending;
      pending = trailingEsc ? "\x1b" : "";
    }
    armInput();
    return output;
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    clearInputTimer();
    cancelProbe();
    pending = "";
    overflow = undefined;
    daUntil = 0;
  };
  return { start, filterInput, dispose, get enabled() { return enabled; } };
}
