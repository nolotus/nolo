// packages/agent-runtime/execShellCompletionWarnings.ts
//
// P0 wake-safety (2026-09-27 静默事故): same-shape command heuristics.
//
// 事故原命令 `( three test groups ) > /tmp/batch3-verify*.log; echo LAUNCHED`
// finished synchronously in ~6.8s (exitCode 0, no taskId, no notification);
// the model misread the plain stdout `LAUNCHED` as a platform background
// receipt and ended the turn, silencing the dialog for 10 hours.
//
// This module only DETECTS two statically visible same-shape patterns after a
// synchronous execShell completion and returns human/model-visible warning
// lines. It deliberately does not intercept, rewrite or track anything:
//   - stdout is untrusted free text and must never decide lifecycle;
//   - shell-internal backgrounding cannot be tracked across forks/daemons,
//     so the warning describes known facts ("not tracked", "no completion
//     notification") instead of guessing task state.
//
// Quote discipline (the false-positive guards the review demanded): only text
// OUTSIDE quotes is scanned, `&&` / `&>` / `>&` / `<&` fd-dup and `>>`-style
// append are all handled separately from a lone `&`, and `/dev/null`
// redirects (the ubiquitous `2>/dev/null`) are not flagged.
//
// Shell awareness: `>&` is followed by a token that decides the meaning —
// an fd number or `-` (`>&2`, `>&-`, `2>&1`) is duplication/close and stays
// silent, while a path or ordinary token (`>& out.log`) is bash's file
// redirect and is flagged. `&` itself is shell-dependent: bash's lone `&`
// backgrounds, PowerShell's lone `&` is the call operator (synchronous), so
// callers pass the resolved shell; Start-Process-style escapes are flagged
// for both.

/** One detected same-shape pattern. */
export type ExecShellSynchronousWarning = {
  kind: "output-redirect" | "shell-backgrounding";
  /** Model-visible line appended to the tool content. */
  message: string;
  /** Redirect target file, when statically readable (kind === "output-redirect"). */
  redirectTarget?: string;
};

/** Escape patterns that detach a descendant from the outer shell's lifetime. */
const BG_ESCAPE_WORD_PATTERN =
  /(?:^|[\s;|(&/\\])(nohup|disown|setsid|start-process)(?=$|[\s;|)&])/i;

const SHELL_SPLIT_CHARS = new Set([";", "|", "&", "(", ")", "<", ">", "\n", "\t", " "]);

/**
 * Replace quoted regions, backslash escapes and line comments with spaces,
 * preserving length so indices stay aligned with the original command.
 * Masks: '…' (fully literal), "…", `…` (escapes via backslash), \x, # comment.
 */
export function maskQuotedAndEscaped(command: string): string {
  const out = Array.from(command);
  let quote: string | null = null;
  for (let i = 0; i < out.length; i += 1) {
    const ch = out[i];
    if (quote) {
      out[i] = " ";
      if (ch === "\\" && quote !== "'") {
        if (i + 1 < out.length) out[i + 1] = " ";
        i += 1;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === "\\") {
      out[i] = " ";
      if (i + 1 < out.length) out[i + 1] = " ";
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
      out[i] = " ";
      continue;
    }
    if (ch === "#" && (i === 0 || /[\s;]/.test(out[i - 1] ?? " "))) {
      while (i < out.length && out[i] !== "\n") {
        out[i] = " ";
        i += 1;
      }
    }
  }
  return out.join("");
}

/**
 * Read the redirect target token at/after `start` from the ORIGINAL command,
 * quote-aware (a quoted target like `> "my file.log"` must be read verbatim).
 * Boundary chars are shell split chars; `$(...)` / `>(...)` substitutions are
 * not plain files and are not reported.
 */
function readRedirectTarget(
  original: string,
  start: number,
): { text: string; end: number } | undefined {
  let i = start;
  // Skip only literal whitespace; a quote char in the original stops the
  // skip — the target is quoted.
  while (i < original.length && /\s/.test(original[i] ?? "")) {
    i += 1;
  }
  if (i >= original.length) return undefined;
  let text = "";
  let j = i;
  while (j < original.length) {
    const o = original[j]!;
    if (o === "'" || o === '"' || o === "`") {
      const quote = o;
      j += 1;
      while (j < original.length && original[j] !== quote) {
        if (original[j] === "\\" && quote !== "'" && j + 1 < original.length) {
          text += original[j + 1];
          j += 2;
          continue;
        }
        text += original[j];
        j += 1;
      }
      j += 1; // closing quote (or EOL)
      continue;
    }
    if (/\s/.test(o) || SHELL_SPLIT_CHARS.has(o)) break;
    text += o;
    j += 1;
  }
  if (!text || text === "$") return undefined; // $(...) substitution, not a file
  return { text, end: j };
}

function isIgnoredRedirectTarget(target: string): boolean {
  return target === "/dev/null";
}

/** Shell family the command runs under; drives how a lone `&` is read. */
export type ExecShellWarningShell = "bash" | "powershell";

/**
 * Detect same-shape patterns in a shell command (warn-only guardrail).
 * Returns at most one warning per kind, redirect warning first.
 *
 * @param shell resolved shell of the run (bash vs powershell). PowerShell's
 *   lone `&` is the call operator, not backgrounding, so it is not flagged
 *   there; Start-Process-style escapes stay flagged for both shells.
 */
export function detectExecShellSynchronousWarnings(
  command: string,
  shell?: { resolvedShell?: ExecShellWarningShell },
): ExecShellSynchronousWarning[] {
  const masked = maskQuotedAndEscaped(command);
  const isPowerShell = shell?.resolvedShell === "powershell";
  const redirectTargets: string[] = [];
  let backgrounded = false;
  let i = 0;
  while (i < masked.length) {
    const ch = masked[i];
    if (ch === "&") {
      const next = masked[i + 1];
      if (next === "&") {
        i += 2; // list operator && — not backgrounding
        continue;
      }
      if (next === ">") {
        // &> / &>> — both-stream redirect to a file
        let j = i + 2;
        if (masked[j] === ">") j += 1;
        const target = readRedirectTarget(command, j);
        if (target && !isIgnoredRedirectTarget(target.text)) redirectTargets.push(target.text);
        i = target ? target.end : j;
        continue;
      }
      const prev = masked[i - 1];
      if (prev === ">" || prev === "<") {
        i += 1; // >&2 / <&0 fd duplication — not backgrounding
        continue;
      }
      if (isPowerShell) {
        // PowerShell call operator (& ./script.ps1): synchronous invocation,
        // NOT backgrounding. Background escapes there are word patterns
        // (Start-Process …), flagged below.
        i += 1;
        continue;
      }
      backgrounded = true; // lone `&` — bash shell-internal backgrounding
      i += 1;
      continue;
    }
    if (ch === ">") {
      const prev = masked[i - 1];
      if (prev === ">" || prev === "&" || prev === "<") {
        i += 1; // second char of >> / &> / fd-dup — already handled
        continue;
      }
      let j = i + 1;
      if (masked[j] === ">") j += 1;
      if (masked[j] === "&") {
        // `>&` needs the following token to disambiguate: an fd number or
        // `-` (`>&2`, `>&-`, `2>&1`) is duplication/close and silent, while
        // a path or ordinary token is bash's file redirect (`>& out.log`
        // ≡ `&> out.log`) whose output no completion notification returns.
        // readRedirectTarget skips whitespace and reads quoted targets
        // verbatim from the ORIGINAL command (the mask would hide quotes).
        const ampTarget = readRedirectTarget(command, j + 1);
        const isFdDuplication =
          ampTarget !== undefined &&
          (/^\d+$/.test(ampTarget.text) || ampTarget.text === "-");
        if (
          ampTarget &&
          !isFdDuplication &&
          !isIgnoredRedirectTarget(ampTarget.text)
        ) {
          redirectTargets.push(ampTarget.text);
        }
        i = ampTarget ? ampTarget.end : j + 1;
        continue;
      }
      const target = readRedirectTarget(command, j);
      if (target && !isIgnoredRedirectTarget(target.text)) redirectTargets.push(target.text);
      i = target ? target.end : j;
      continue;
    }
    if (ch === "<") {
      i += masked[i + 1] === "<" || masked[i + 1] === "&" ? 2 : 1; // << heredoc / <& fd-dup
      continue;
    }
    i += 1;
  }

  const wordMatch = BG_ESCAPE_WORD_PATTERN.exec(masked);
  if (wordMatch) backgrounded = true;

  const warnings: ExecShellSynchronousWarning[] = [];
  if (redirectTargets.length > 0) {
    const target = redirectTargets[0];
    warnings.push({
      kind: "output-redirect",
      redirectTarget: target,
      message:
        `[wake-safety] This execShell call completed synchronously; its output was redirected to ${target}. ` +
        `That file is NOT delivered by any completion notification — no tracked background task was created. ` +
        `If you need the result, read that file in this turn.`,
    });
  }
  if (backgrounded) {
    warnings.push({
      kind: "shell-backgrounding",
      message:
        `[wake-safety] Detected shell-internal backgrounding (lone \`&\`, nohup/disown/setsid/Start-Process or similar). ` +
        `Descendant processes are NOT tracked as platform tasks and will not produce completion notifications; ` +
        `text such as \`LAUNCHED\` printed by the command is plain stdout, not a platform receipt.`,
    });
  }
  return warnings;
}
