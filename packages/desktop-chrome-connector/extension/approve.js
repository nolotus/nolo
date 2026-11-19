/**
 * The approval page. It is the only place a user decision originates, and it never decides anything
 * on its own: it reports "approve" or "deny" to the worker, which re-checks the sender, the URL, the
 * nonce and the window id before the record can become `approved`.
 */
const CONTROL_CHARS_RE = /[\x00-\x1f\x7f-\x9f]/g;
const MULTILINE_CONTROL_CHARS_RE = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/g;
const BIDI_CONTROL_RE = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;

/**
 * Single-pass O(n) ECMA-48 escape sequence stripper.
 *
 * Handles 7-bit and 8-bit CSI, OSC (BEL / 7-bit ST / 8-bit ST), and DCS/SOS/PM/APC
 * (7-bit ST / 8-bit ST), terminating safely at end-of-input on unterminated sequences
 * without regex backtracking, while leaving ordinary bracketed text untouched.
 */
function stripTerminalEscapes(raw) {
  const text = String(raw || "");
  const len = text.length;
  let out = "";
  let plainStart = 0;
  let i = 0;

  const consumeCsi = (start) => {
    let j = start;
    while (j < len) {
      const c = text.charCodeAt(j);
      if (c >= 0x30 && c <= 0x3f) { j++; continue; }
      break;
    }
    while (j < len) {
      const c = text.charCodeAt(j);
      if (c >= 0x20 && c <= 0x2f) { j++; continue; }
      break;
    }
    if (j < len) {
      const c = text.charCodeAt(j);
      if (c >= 0x40 && c <= 0x7e) j++;
    }
    return j;
  };

  const consumeString = (start, allowBel) => {
    let j = start;
    while (j < len) {
      const c = text.charCodeAt(j);
      if (c === 0x9c || (allowBel && c === 0x07)) return j + 1;
      if (c === 0x1b && j + 1 < len && text.charCodeAt(j + 1) === 0x5c) return j + 2;
      j++;
    }
    return len;
  };

  while (i < len) {
    const c = text.charCodeAt(i);
    if (c === 0x1b) {
      if (i > plainStart) out += text.slice(plainStart, i);
      if (i + 1 >= len) {
        i = len;
        plainStart = len;
        break;
      }
      const next = text.charCodeAt(i + 1);
      if (next === 0x5b) {
        // 7-bit CSI: ESC [
        i = consumeCsi(i + 2);
      } else if (next === 0x5d) {
        // 7-bit OSC: ESC ] (terminated by BEL, ESC \, or 8-bit ST \x9c)
        i = consumeString(i + 2, true);
      } else if (next === 0x50 || next === 0x58 || next === 0x5e || next === 0x5f) {
        // 7-bit DCS (P), SOS (X), PM (^), APC (_)
        i = consumeString(i + 2, false);
      } else {
        // Other nF / 2-byte ESC sequence: ESC (0x20..0x2f)* (0x30..0x7e)?
        let j = i + 1;
        while (j < len) {
          const b = text.charCodeAt(j);
          if (b >= 0x20 && b <= 0x2f) { j++; continue; }
          break;
        }
        if (j < len) {
          const b = text.charCodeAt(j);
          if (b >= 0x30 && b <= 0x7e) j++;
        }
        i = j;
      }
      plainStart = i;
      continue;
    }

    if (c === 0x9b) {
      // 8-bit CSI
      if (i > plainStart) out += text.slice(plainStart, i);
      i = consumeCsi(i + 1);
      plainStart = i;
      continue;
    }

    if (c === 0x9d) {
      // 8-bit OSC
      if (i > plainStart) out += text.slice(plainStart, i);
      i = consumeString(i + 1, true);
      plainStart = i;
      continue;
    }

    if (c === 0x90 || c === 0x98 || c === 0x9e || c === 0x9f) {
      // 8-bit DCS (0x90), SOS (0x98), PM (0x9e), APC (0x9f)
      if (i > plainStart) out += text.slice(plainStart, i);
      i = consumeString(i + 1, false);
      plainStart = i;
      continue;
    }

    i++;
  }

  if (plainStart === 0) return text;
  if (plainStart < len) out += text.slice(plainStart);
  return out;
}

function sanitizeSingleLine(raw) {
  return stripTerminalEscapes(raw)
    .replace(/[\r\n\u2028\u2029]+/g, " ")
    .replace(CONTROL_CHARS_RE, "")
    .replace(BIDI_CONTROL_RE, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeMultiline(raw) {
  return stripTerminalEscapes(raw)
    .replace(/\r\n?|\u2028|\u2029/g, "\n")
    .replace(MULTILINE_CONTROL_CHARS_RE, "")
    .replace(BIDI_CONTROL_RE, "");
}

const params = new URLSearchParams(location.search);
const approvalId = params.get("approvalId") || "";
const nonce = params.get("nonce") || "";
const action = params.get("action") || "";
const targetName = sanitizeSingleLine(params.get("target"));
/**
 * The site the action belongs to. Only an origin ever reaches this page — a full URL could carry a
 * token in its query string, and this page is shown to the user. The tab title is deliberately
 * absent: the page controls it, so it could carry a mail subject, an account name or a one-time
 * code, and it could be written to imitate a brand next to the origin.
 */
const targetOrigin = sanitizeSingleLine(params.get("origin"));
/**
 * What the action would change, for a select: the option it would set (`{"value":"jp","label":"Japan"}`).
 *
 * The control name and the site say *where* the action happens; this says *which item*. Without it
 * the user cannot tell two identically named controls on the same site apart, nor two requests for
 * the same control with different options — so the decision would be made blind.
 *
 * Only the option label ever travels here. The text a `type` action typed is free text
 * (it can carry a name, a token, a password) and is not a "which one of these" decision, so it is
 * never part of this summary. The page title is absent for a different reason: it is decorative and
 * page-controlled, while the option label is the item being approved.
 */
function parseSummary(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") return null;
    const label = String(parsed.label ?? "").trim();
    if (!label) return null;
    return { label };
  } catch {
    return null;
  }
}
const summary = parseSummary(params.get("summary"));

const t = (key, fallback, substitutions) => chrome?.i18n?.getMessage?.(key, substitutions) || fallback;
document.documentElement.lang = chrome?.i18n?.getUILanguage?.() || "en";
document.title = t("approveTitle", "Nolo needs your approval");

const ACTION_LABELS = new Map([
  ["click", t("approveClick", "Click a control")],
  ["type", t("approveType", "Enter text")],
  ["press", t("approvePress", "Press a key")],
  ["set_select_value", t("approveSelect", "Select an option")],
  ["file_upload", t("approveUpload", "Attach files")],
  ["eval_script", t("approveEval", "Run a script")],
]);

const allowButton = document.getElementById("allow");
const denyButton = document.getElementById("deny");
const statusLine = document.getElementById("status");
const targetLine = document.getElementById("target-name");
const siteLine = document.getElementById("target-site");
const heading = document.getElementById("approval-heading");

const actionLabel = ACTION_LABELS.get(action) || t("approveUnknownAction", "Unknown browser action");
heading.textContent = t("approveHeading", actionLabel, [actionLabel]);
document.getElementById("approval-impact").textContent = action === "eval_script"
  ? t("approveEvalImpact", "May read or modify the page and cause changes outside the page.")
  : t("approveImpact", "May modify the page or cause changes outside the page.");
document.getElementById("approval-hint").textContent = action === "eval_script"
  ? t("approveEvalHint", "One-time permission, valid up to 60s, bound to this script and its target document. Esc cancels.")
  : t("approveHint", "One-time permission, valid up to 60s. Esc cancels.");
allowButton.textContent = t("approveAllow", "Allow once");
denyButton.textContent = t("approveCancel", "Cancel");
targetLine.textContent = action === "eval_script" ? t("approveTargetTab", "Target tab") : targetName ? `「${targetName}」` : t("approveUnnamed", "Unnamed control");
const scriptDetails = document.getElementById("script-details");
const scriptCaption = document.getElementById("script-caption");
const scriptPreview = document.getElementById("script-preview");
scriptCaption.textContent = t("approveScriptCaption", "Script preview");

/**
 * A script is shown as its own block, line for line, in a scrollable <pre>.
 *
 * The old window put the script into the single-line control name after a "→", so a preview that
 * had been flattened to one line (comment first, statement second) read as one harmless sentence:
 * the user approved text they had never been shown. Line breaks are kept here, and the connector's
 * header (first line of the preview) states the full length, any truncation and the digest of the
 * whole script, so "this is an excerpt" is visible instead of implied.
 */
function renderScriptPreview() {
  const text = summary ? sanitizeMultiline(summary.label) : "";
  scriptDetails.hidden = false;
  if (!scriptPreview) return;
  scriptPreview.hidden = false;
  // Assigned as text, never as HTML: the script is page-adjacent data, not markup.
  scriptPreview.textContent = text || t("approveScriptMissing", "Script content is missing. Cancel and request again in Nolo.");
}

if (action === "eval_script") {
  // A script has no value to set, so it never joins the control line.
  renderScriptPreview();
} else if (summary && summary.label) {
  // The item the action would set, right after the control it would set it on. With no summary the
  // line stays exactly as it was — a lone arrow would say nothing.
  const optionLabel = sanitizeSingleLine(summary.label);
  if (optionLabel) targetLine.textContent += `→ ${optionLabel}`;
}
// A site the user cannot name is a site the user cannot judge: say "unknown" instead of leaving
// the line blank, so a missing origin never reads as "nothing to see here".
if (siteLine) {
  siteLine.textContent = t("approveSite", `Target site: ${targetOrigin || "Unknown site"}`, [targetOrigin || t("approveUnknownSite", "Unknown site")]);
}

let decided = false;

function setStatus(text) {
  if (statusLine) statusLine.textContent = text;
}

function lockButtons() {
  decided = true;
  for (const button of [allowButton, denyButton]) {
    if (button) button.disabled = true;
  }
}

async function currentWindowId() {
  try {
    // The worker only accepts a decision carrying the id of the window it opened itself.
    const win = await chrome.windows.getCurrent();
    const id = Number(win?.id);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

async function decide(decision) {
  if (decided) return;
  lockButtons();
  setStatus(decision === "approve" ? t("approveSubmitting", "Submitting approval\u2026") : t("approveCancelled", "Cancelled."));

  const windowId = await currentWindowId();
  if (windowId == null) {
    setStatus(t("approveWindowFailed", "Cannot verify the window source. Cancelled."));
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: "browser_consent_decision",
      approvalId,
      nonce,
      decision,
      windowId,
    });
    if (!response?.ok) {
      setStatus(t("approveExpired", "This approval is no longer valid (expired, used, or source mismatch). Request again in Nolo."));
    }
  } catch {
    setStatus(t("approveFailed", "Cannot reach the extension background. This approval did not take effect."));
  }
}

allowButton?.addEventListener("click", () => void decide("approve"));
denyButton?.addEventListener("click", () => void decide("deny"));

document.addEventListener("keydown", (event) => {
  if (event.defaultPrevented || event.isComposing || event.key !== "Escape" || decided) return;
  event.preventDefault();
  void decide("deny");
});

if (!approvalId || !nonce) {
  lockButtons();
  setStatus(t("approveMissingId", "Missing approval identifier. Request again in Nolo."));
} else {
  denyButton.focus();
}
