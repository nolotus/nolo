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

const ACTION_LABELS = {
  click: "点击",
  type: "输入",
  press: "按键",
  // Without this the window labelled a select as "点击", which is a different action than the
  // one the user is being asked to allow.
  set_select_value: "选择",
  // Arbitrary script: the label has to name it as its own kind of action, never as a click.
  eval_script: "执行脚本",
};

const allowButton = document.getElementById("allow");
const denyButton = document.getElementById("deny");
const statusLine = document.getElementById("status");
const targetLine = document.getElementById("target-name");
const siteLine = document.getElementById("target-site");
const actionLabel = document.getElementById("action-label");

actionLabel.textContent = ACTION_LABELS[action] || ACTION_LABELS.click;
targetLine.textContent = targetName ? `「${targetName}」` : "未命名控件";
const scriptCaption = document.getElementById("script-caption");
const scriptPreview = document.getElementById("script-preview");

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
  scriptPreview.textContent = text || "（脚本内容缺失：请取消，回到 Nolo 重新发起）";
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
  siteLine.textContent = targetOrigin ? `目标站点：${targetOrigin}` : "目标站点：未知站点";
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
  setStatus(decision === "approve" ? "已允许，正在继续……" : "已取消。");

  const windowId = await currentWindowId();
  if (windowId == null) {
    setStatus("无法确认窗口来源，已取消。");
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
      setStatus("这次确认已失效（过期、已使用或来源不符），请在 Nolo 里重新发起。");
    }
  } catch {
    setStatus("无法联系扩展后台，这次确认未生效。");
  }
}

allowButton?.addEventListener("click", () => void decide("approve"));
denyButton?.addEventListener("click", () => void decide("deny"));

if (!approvalId || !nonce) {
  lockButtons();
  setStatus("缺少确认标识，请回到 Nolo 重新发起。");
}
