/**
 * The approval page. It is the only place a user decision originates, and it never decides anything
 * on its own: it reports "approve" or "deny" to the worker, which re-checks the sender, the URL, the
 * nonce and the window id before the record can become `approved`.
 */
const params = new URLSearchParams(location.search);
const approvalId = params.get("approvalId") || "";
const nonce = params.get("nonce") || "";
const action = params.get("action") || "click";
const targetName = params.get("target") || "";
/**
 * The site the action belongs to. Only an origin ever reaches this page — a full URL could carry a
 * token in its query string, and this page is shown to the user. The tab title is deliberately
 * absent: the page controls it, so it could carry a mail subject, an account name or a one-time
 * code, and it could be written to imitate a brand next to the origin.
 */
const targetOrigin = (params.get("origin") || "").trim();
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

const ACTION_LABELS = {
  click: t("approveClick", "click"),
  type: t("approveType", "type"),
  press: t("approvePress", "press a key"),
  // Without this the window labelled a select as "点击", which is a different action than the
  // one the user is being asked to allow.
  set_select_value: t("approveSelect", "select an option"),
  // Arbitrary script: the label has to name it as its own kind of action, never as a click.
  eval_script: t("approveEval", "run a script"),
};

const allowButton = document.getElementById("allow");
const denyButton = document.getElementById("deny");
const statusLine = document.getElementById("status");
const targetLine = document.getElementById("target-name");
const siteLine = document.getElementById("target-site");
const heading = document.getElementById("approval-heading");

const actionLabel = ACTION_LABELS[action] || ACTION_LABELS.click;
heading.textContent = t("approveHeading", `Nolo requests permission to ${actionLabel} on the target below`, [actionLabel]);
document.getElementById("approval-hint").textContent = t("approveHint", "Permission applies to this action only, expires after 60 seconds, and is invalidated if the page changes.");
allowButton.textContent = t("approveAllow", "Allow once");
denyButton.textContent = t("approveCancel", "Cancel");
targetLine.textContent = targetName ? `「${targetName}」` : t("approveUnnamed", "Unnamed control");
const scriptCaption = document.getElementById("script-caption");
const scriptPreview = document.getElementById("script-preview");
scriptCaption.textContent = t("approveScriptCaption", "Script to run (original text; scroll to inspect)");

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
  const text = summary ? summary.label : "";
  if (scriptCaption) scriptCaption.hidden = false;
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
  targetLine.textContent += `→ ${summary.label}`;
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

if (!approvalId || !nonce) {
  lockButtons();
  setStatus(t("approveMissingId", "Missing approval identifier. Request again in Nolo."));
}
