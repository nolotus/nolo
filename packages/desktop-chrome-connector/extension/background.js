import {
  COMPACT_BUDGET,
  CONNECTOR_FEATURES,
  CONNECTOR_PROTOCOL_VERSION,
  DETACH_IDLE_MS,
  OPENED_TABS_STORAGE_KEY,
  PROTECTED_PAGE_CODE,
  buildCompactObservation,
  buildPageRevision,
  createElementRefRegistry,
  createOpenedTabSet,
  decideCloseTab,
  decideIrreversibleAction,
  deserializeOpenedTabs,
  isActivationKey,
  isOwnExtensionPage,
  isProtectedPageUrl,
  normalizeTabId,
  resolveActionTarget,
  serializeOpenedTabs,
  summarizeConsoleEntries,
  summarizeNetworkEntries,
  verifyActionEffect,
  verifySelectValueEffect,
} from "./compactObservation.js";
import { captureBrowserConsentState } from "./browserConsentCapture.js";
import { createActionFingerprint } from "./browserConsentFingerprint.js";
import {
  buildPrepareArgs,
  createPreparedActionStore,
  handlePrepareBrowserAction,
} from "./browserConsentPreparation.js";

const HOST_NAME = "com.nolo.chrome_connector";

/**
 * Runtime capability probe. Firefox does not implement `chrome.debugger` (Mozilla bug 1316741),
 * and the Firefox build also drops the permission from the manifest. Every `chrome.debugger.*`
 * call site must sit behind this flag; CDP-only actions answer an explicit
 * `UNSUPPORTED_ON_FIREFOX` verdict instead of throwing a bare TypeError.
 */
const HAS_DEBUGGER = typeof chrome !== "undefined" && Boolean(chrome?.debugger);
const DEBUGGER_UNSUPPORTED_SIGNAL = "UNSUPPORTED_ON_FIREFOX";
const DEBUGGER_UNSUPPORTED_MESSAGE =
  "This action needs the chrome.debugger API, which Firefox does not implement. " +
  "Use the Firefox build's remaining actions (read_page, click, type, press, scroll, tabs) instead.";

const consoleByTab = new Map();
const networkByTab = new Map();
const refRegistry = createElementRefRegistry();
const basePreparedActionStore = createPreparedActionStore();
const consumedChallengeIds = new Set();
const preparedActionStore = {
  save(record) {
    return basePreparedActionStore.save(record);
  },
  get(id) {
    if (consumedChallengeIds.has(id)) return null;
    return basePreparedActionStore.get(id);
  },
  delete(id) {
    consumedChallengeIds.add(id);
    const rec = basePreparedActionStore.get(id);
    if (rec) {
      rec.expiresAt = 0;
    }
  },
  clear() {
    consumedChallengeIds.clear();
    basePreparedActionStore.clear();
  },
  size() {
    return basePreparedActionStore.size();
  },
  get ttlMs() {
    return basePreparedActionStore.ttlMs;
  },
  get maxEntries() {
    return basePreparedActionStore.maxEntries;
  },
};
/* ------------------------------------------------------------------------------------------------
 * Interactive approval for irreversible actions
 *
 * The agent never authorizes itself. When the gate fires, this worker opens a small extension page
 * (`approve.html`) that the *user* clicks; the agent only ever receives `USER_APPROVAL_PENDING` plus a
 * query key (`approvalId`). A record holding only `prepareId`/`challengeId`/`grantTicket` therefore
 * authorizes nothing: preparation is not consent.
 *
 * Storage: the in-memory Map is the working copy and `chrome.storage.session` is the durable copy —
 * MV3 recycles this worker, but a 60 s approval window has to survive that. Hydration is lazy and
 * merges "memory wins", so a storage stub that returns nothing simply leaves the Map authoritative.
 * ---------------------------------------------------------------------------------------------- */
const APPROVAL_TTL_MS = 60_000;
const APPROVAL_SWEEP_INTERVAL_MS = 60_000;
const APPROVAL_STORAGE_PREFIX = "noloConnectorApproval:";
const APPROVAL_PENDING_CODE = "USER_APPROVAL_PENDING";
const APPROVAL_DENIED_CODE = "USER_APPROVAL_DENIED";
const APPROVAL_EXPIRED_CODE = "USER_APPROVAL_EXPIRED";
const APPROVAL_STALE_CODE = "STALE_ACTION_CHALLENGE";
const APPROVAL_DECISION_MESSAGE_TYPE = "browser_consent_decision";
const APPROVAL_PAGE_PATH = "approve.html";

const approvalPendingMessage =
  "A confirmation request has been opened for the user in the browser. Ask the user to click \"Allow once\" in the " +
  "Nolo window, then retry this exact action with this approvalId before it expires. Nothing has been performed yet.";
const approvalDeniedMessage =
  "The user did not allow this action, so nothing was performed. Name the control and ask the user to activate it " +
  "themselves; do not retry the same request hoping for a different answer.";
const approvalExpiredMessage =
  "The approval window for this action expired before the user allowed it. Nothing was performed.";

const approvalRecords = new Map();
let approvalHydration = null;

function normalizeApprovalId(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function approvalStorageArea() {
  const area = typeof chrome !== "undefined" ? chrome?.storage?.session : null;
  return area && typeof area.get === "function" && typeof area.set === "function" ? area : null;
}

function approvalSnapshot(record) {
  const target = record?.target || {};
  return {
    ...record,
    target: {
      name: String(target.name ?? ""),
      tag: String(target.tag ?? ""),
      role: String(target.role ?? ""),
      type: String(target.type ?? ""),
    },
  };
}

async function persistApprovalRecord(record) {
  const area = approvalStorageArea();
  if (!area || !record) return;
  try {
    await area.set({ [APPROVAL_STORAGE_PREFIX + record.approvalId]: approvalSnapshot(record) });
  } catch {
    // Session storage only adds durability across worker restarts; the Map stays authoritative.
  }
}

async function hydrateApprovals() {
  if (approvalHydration) return approvalHydration;
  approvalHydration = (async () => {
    const area = approvalStorageArea();
    if (!area) return;
    try {
      const raw = await area.get(null);
      const items = raw && typeof raw === "object" ? raw : {};
      for (const [key, value] of Object.entries(items)) {
        if (typeof key !== "string" || !key.startsWith(APPROVAL_STORAGE_PREFIX)) continue;
        if (!value || typeof value !== "object") continue;
        const approvalId =
          typeof value.approvalId === "string" ? value.approvalId : key.slice(APPROVAL_STORAGE_PREFIX.length);
        // Memory wins: a state this worker already advanced must never be rolled back by a merge.
        if (approvalRecords.has(approvalId)) continue;
        approvalRecords.set(approvalId, { ...value, approvalId });
      }
    } catch {
      // A failed hydrate must not authorize anything; the Map simply stays empty.
    }
  })();
  return approvalHydration;
}

function sweepApprovalRecords(nowMs = Date.now()) {
  for (const record of approvalRecords.values()) {
    if (record.state !== "pending" && record.state !== "approved") continue;
    if (!(Number(record.expiresAt) <= nowMs)) continue;
    record.state = "expired";
    record.expiredAt = nowMs;
    // A failed write only costs durability across a worker restart — the in-memory record stays
    // authoritative, and the authorization decision itself is unaffected by it.
    void persistApprovalRecord(record).catch(() => {});
  }
}

const approvalSweepTimer =
  typeof setInterval === "function"
    ? setInterval(() => {
        sweepApprovalRecords();
      }, APPROVAL_SWEEP_INTERVAL_MS)
    : null;
// `unref()` keeps this worker-level timer from holding bun's test process open.
if (approvalSweepTimer && typeof approvalSweepTimer.unref === "function") approvalSweepTimer.unref();

function approvalVerdict(code, message, extra = {}) {
  return {
    ok: false,
    code,
    signal: code,
    effect: code === APPROVAL_PENDING_CODE ? "approval_pending" : "failed",
    verified: false,
    ...extra,
    message,
  };
}

async function getApprovalRecord(approvalId) {
  await hydrateApprovals();
  sweepApprovalRecords();
  return approvalRecords.get(approvalId) || null;
}

/**
 * Recomputes the DOM fingerprint the action would be bound to. Kept deliberately identical in shape
 * to the drift check in `verifyConsentAndDrift`: the same document/revision/target/args/form/owner
 * inputs, so an approval can only ever cover the page state the user was asked about.
 */
async function computeApprovalFingerprint({ action, tabId, payload, target }) {
  const captureOptions = { rejectAsResult: true, _frameId: target?.kind === "ref" ? 0 : target?._frameId };
  if (
    payload?.active === true ||
    target?.kind === "active" ||
    (action === "press" && !payload?.selector && !target?.selector)
  ) {
    captureOptions.active = true;
  } else if (typeof target?.selector === "string" && target.selector.trim()) {
    captureOptions.selector = target.selector.trim();
  } else if (typeof payload?.selector === "string" && payload.selector.trim()) {
    captureOptions.selector = payload.selector.trim();
  }

  let currentCapture;
  try {
    currentCapture = await executeInTab(tabId, captureBrowserConsentState, [captureOptions]);
  } catch (error) {
    return {
      ok: false,
      verdict: approvalVerdict("DOM_MUTATED", `Failed to capture DOM state before asking the user: ${toMessage(error)}`, {
        action,
      }),
    };
  }
  if (!currentCapture || currentCapture.ok === false) {
    return {
      ok: false,
      verdict: approvalVerdict("DOM_MUTATED", currentCapture?.message || "DOM state verification failed.", { action }),
    };
  }

  const registrySnapshot = refRegistry.snapshot(tabId);
  const pageRevision = String(registrySnapshot?.pageRevision || currentCapture.document?.pageRevision || "").trim();
  const actionArgs = buildPrepareArgs({
    action,
    targetMetadata: currentCapture.target,
    formSnapshot: currentCapture.form,
    payload,
  });

  try {
    const fpRes = await createActionFingerprint({
      document: {
        documentId: currentCapture.document?.documentId,
        url: currentCapture.document?.url,
        pageRevision,
      },
      tabId: String(tabId),
      target: {
        targetId: currentCapture.target?.targetId,
        tag: currentCapture.target?.tag,
        name: currentCapture.target?.name,
      },
      action: { action, args: actionArgs },
      form: currentCapture.form?.fields || null,
      owner: typeof payload?.owner === "string" ? payload.owner : "",
      dialogId: typeof payload?.dialogId === "string" ? payload.dialogId : "",
    });
    return { ok: true, fingerprint: fpRes.fingerprint };
  } catch (error) {
    return {
      ok: false,
      verdict: approvalVerdict("DOM_MUTATED", `Fingerprint computation failed: ${toMessage(error)}`, { action }),
    };
  }
}

/**
 * The origin of the page an approval is about — origin only, never a full URL.
 *
 * A URL can carry a token in its query string, and the approval page is a document the user reads
 * (and whose address bar is visible), so only the origin is ever derived from it. Non-http(s) pages
 * (chrome://, file://, about:) have no meaningful origin and are reported as unknown.
 */
function originFromUrl(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) return "";
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.origin;
  } catch {
    return "";
  }
}

/**
 * Which site the user is about to authorize. Read from the tab the action targets, so the approval
 * window can name the site the action belongs to; a tab that cannot be read yields an empty
 * origin, which the approval page shows as "unknown site" rather than as a blank line.
 *
 * Only the origin is returned — never the tab title. The title is content the *page* controls: it
 * can carry a mail subject, an account name or a one-time code, and it can be written to look like
 * a brand ("Google 账号") to make a hostile origin look familiar. The origin is handed out by the
 * browser and cannot be forged by the page, so it alone answers "which site is asking".
 */
async function resolveApprovalSite(tabId) {
  try {
    if (typeof chrome === "undefined" || typeof chrome?.tabs?.get !== "function") return "";
    const tab = await chrome.tabs.get(Number(tabId));
    return originFromUrl(typeof tab?.url === "string" ? tab.url : "");
  } catch {
    return "";
  }
}

/**
 * The option a select request would set, read without touching the page.
 *
 * Why this exists: the approval window names the action, the control and the site. That still does
 * not say *which option* of the select would be chosen — and the user cannot make a correct
 * decision without it: two pages on the same site can carry a control with the very same name, and
 * one select can be asked for different options on two runs. The option label is exactly the piece
 * the decision is about, so it belongs on the window.
 *
 * Note the asymmetry with the page title, which is deliberately not shown anywhere: the title is
 * decorative and page-controlled (a page can write a brand name next to a hostile origin), while the
 * option label is the item the user is being asked to approve. The test is not "is the content
 * page-controlled" but "can the user still decide correctly without it" — and without the label
 * they cannot.
 *
 * Only the resolved option label is carried — never the raw value or payload.
 */
function approvalPageArgs(target) {
  return target?.kind === "ref" ? {
    region: target.expect?.region || "", expectedUrl: target.expect?.url,
    expectedSignature: target.expect?.signature, index: target.expect?.index,
    expectedTag: target.expect?.tag, expectedName: target.expect?.name,
  } : { selector: String(target?.selector || "") };
}

/** Match in the page using the same identity and option rules as execution; export labels only. */
async function resolveSelectApprovalSummary({ action, tabId, payload, target }) {
  if (action !== "set_select_value") return null;
  const pageArgs = approvalPageArgs(target);
  const mark = await captureSelectToken(tabId, pageArgs);
  if (!mark.ok) return null;
  try {
    const result = await executeInTab(tabId, pageOperation, [{
      ...pageArgs, op: "read_select_options", selectToken: mark.token,
      value: payload?.value, label: payload?.label,
    }]);
    return result?.ok === true && result.matched === true && result.label
      ? { label: result.label } : null;
  } catch {
    return null;
  } finally {
    await clearSelectToken(tabId, mark.token);
  }
}

/**
 * Opens the approval window and returns a pending verdict. Fails closed to `USER_APPROVAL_DENIED`
 * when this runtime has no `chrome.windows` (Firefox builds, bare test stubs, a rejected create): a
 * pending record nobody can ever approve is worse than a plain refusal.
 */
async function requestUserApproval({ action, tabId, payload, target, refusal }) {
  if (typeof chrome === "undefined" || typeof chrome?.windows?.create !== "function") {
    return approvalVerdict(APPROVAL_DENIED_CODE, approvalDeniedMessage, { action });
  }

  const computed = await computeApprovalFingerprint({ action, tabId, payload, target });
  if (!computed.ok) return computed.verdict;

  await hydrateApprovals();
  const now = Date.now();
  const randomId = () =>
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${now}-${Math.random().toString(36).slice(2)}`;
  const approvalId = `apr_${randomId()}`;
  const nonce = randomId();
  const targetInfo = refusal?.target || {};
  // Approval metadata is separate from labelOf: changing identity labels would invalidate refs.
  let targetName = "未命名控件";
  try {
    const inspected = await executeInTab(tabId, pageOperation, [{ ...approvalPageArgs(target), op: "inspect" }]);
    if (inspected?.ok === true) targetName = String(inspected.approvalName ?? inspected.name ?? "未命名控件").slice(0, 200);
  } catch { /* Unreadable controls must not fall back to potentially private content. */ }
  // The site the action belongs to: the approval window is the only place the user can decide, so
  // it has to say *which site* is asking, not only which control.
  const site = await resolveApprovalSite(tabId);
  // What the action would change, in one phrase: for a select, the option it would set. The control
  // name and the site say *where*; this says *which item*.
  const summary = await resolveSelectApprovalSummary({ action, tabId, payload, target, refusal });

  // One pending request per tab: a second gate must not stack windows the user cannot tell apart.
  for (const record of approvalRecords.values()) {
    if (record.state === "pending" && String(record.tabId) === String(tabId)) {
      record.state = "superseded";
      record.supersededAt = now;
      // A failed write only costs durability across a worker restart, not the decision itself.
      void persistApprovalRecord(record).catch(() => {});
    }
  }

  const record = {
    approvalId,
    nonce,
    windowId: null,
    tabId: String(tabId),
    action: String(action),
    fingerprint: computed.fingerprint,
    origin: site,
    target: {
      name: targetName,
      tag: String(targetInfo.tag ?? ""),
      role: String(targetInfo.role ?? ""),
      type: String(targetInfo.type ?? ""),
    },
    // Only the option label — never the raw value or payload.
    summary: summary ? { label: summary.label } : null,
    owner: typeof payload?.owner === "string" ? payload.owner : "",
    dialogId: typeof payload?.dialogId === "string" ? payload.dialogId : "",
    state: "pending",
    createdAt: now,
    expiresAt: now + APPROVAL_TTL_MS,
  };
  approvalRecords.set(approvalId, record);

  let windowId = null;
  try {
    const base =
      typeof chrome?.runtime?.getURL === "function" ? chrome.runtime.getURL(APPROVAL_PAGE_PATH) : APPROVAL_PAGE_PATH;
    const params = new URLSearchParams({
      approvalId,
      nonce,
      action: String(action),
      target: targetName,
      // Origin only: a query string can carry a token, and this URL is visible in the popup.
      // No title: the page controls its title, so it must not be able to put text next to the origin.
      origin: site,
    });
    // The item the action would set, for a select: only the option label.
    // Nothing else of the request travels — no payload, and never the text a `type` action typed.
    if (summary) {
      params.set("summary", JSON.stringify({ label: summary.label }));
    }
    const created = await chrome.windows.create({
      url: `${base}?${params.toString()}`,
      type: "popup",
      width: 460,
      height: 260,
      focused: true,
    });
    windowId = Number(created?.id);
    if (!Number.isFinite(windowId)) throw new Error("chrome.windows.create returned no window id");
  } catch (error) {
    approvalRecords.delete(approvalId);
    return approvalVerdict(APPROVAL_DENIED_CODE, `${approvalDeniedMessage} (${toMessage(error)})`, { action });
  }

  record.windowId = windowId;
  await persistApprovalRecord(record);

  return approvalVerdict(APPROVAL_PENDING_CODE, approvalPendingMessage, {
    action,
    approvalId,
    expiresAtMs: record.expiresAt,
    target: { name: targetName },
  });
}

/**
 * The credential check that has to pass before any page effect: approved by the user, not expired,
 * not used. Consumption happens here — before execution — so a later drift failure cannot hand the
 * credential back.
 */
async function consumeApprovalCredential({ approvalId, record, action }) {
  if (!record) {
    return {
      verdict: approvalVerdict(
        APPROVAL_STALE_CODE,
        "The provided approvalId was not found, was already used, or belongs to another worker session.",
        { action, approvalId },
      ),
    };
  }
  if (record.state === "consumed") {
    return {
      verdict: approvalVerdict(
        APPROVAL_STALE_CODE,
        "That approvalId has already been used once; an approval covers exactly one action.",
        { action, approvalId },
      ),
    };
  }
  if (record.state === "expired" || Number(record.expiresAt) <= Date.now()) {
    if (record.state !== "expired") {
      record.state = "expired";
      record.expiredAt = Date.now();
      // A failed write only costs durability across a worker restart, not the decision itself.
      void persistApprovalRecord(record).catch(() => {});
    }
    return { verdict: approvalVerdict(APPROVAL_EXPIRED_CODE, approvalExpiredMessage, { action, approvalId }) };
  }
  if (record.state === "pending") {
    // Still waiting on the user: repeat the pending verdict and never extend the window.
    return {
      verdict: approvalVerdict(APPROVAL_PENDING_CODE, approvalPendingMessage, {
        action,
        approvalId,
        expiresAtMs: record.expiresAt,
        target: { name: String(record.target?.name ?? "") },
      }),
    };
  }
  if (record.state === "denied" || record.state === "superseded") {
    return { verdict: approvalVerdict(APPROVAL_DENIED_CODE, approvalDeniedMessage, { action, approvalId }) };
  }
  if (record.state !== "approved") {
    return {
      verdict: approvalVerdict(APPROVAL_STALE_CODE, "The approval record is not in a usable state.", {
        action,
        approvalId,
      }),
    };
  }

  record.state = "consumed";
  record.consumedAt = Date.now();
  await persistApprovalRecord(record);
  return { ok: true, record };
}

/**
 * The only writer of `approved`. Reachable exclusively from the extension's own approve page: a
 * decision must come from this extension, from that page URL, with this request's nonce, from the
 * window this worker opened. Anything else discards the request instead of retrying.
 */
export async function handleApprovalDecision(message = {}, sender = {}) {
  const approvalId = normalizeApprovalId(message?.approvalId);
  if (!approvalId) return { ok: false, code: "USER_APPROVAL_REJECTED" };

  const record = await getApprovalRecord(approvalId);
  if (!record) return { ok: false, code: "USER_APPROVAL_REJECTED" };

  const extensionId = typeof chrome !== "undefined" ? chrome?.runtime?.id : "";
  const senderId = typeof sender?.id === "string" ? sender.id : "";
  const senderUrl = typeof sender?.url === "string" ? sender.url : "";
  // The approval page is an extension page, so its URL carries the browser's extension scheme:
  // `chrome-extension://<id>/approve.html` on Chrome, `moz-extension://<uuid>/approve.html` on
  // Firefox. `runtime.getURL()` is the only source that is right on both (on Firefox the moz
  // uuid is not `runtime.id` for AMO-signed add-ons), so ask the browser first and keep the
  // Chrome-shaped spelling as the fallback for a runtime without getURL.
  const approvePagePrefixes = [];
  if (typeof chrome?.runtime?.getURL === "function") {
    const ownPage = chrome.runtime.getURL(APPROVAL_PAGE_PATH);
    if (ownPage) approvePagePrefixes.push(ownPage);
  }
  if (typeof extensionId === "string" && extensionId) {
    approvePagePrefixes.push(`chrome-extension://${extensionId}/${APPROVAL_PAGE_PATH}`);
    approvePagePrefixes.push(`moz-extension://${extensionId}/${APPROVAL_PAGE_PATH}`);
  }
  const senderOk =
    Boolean(approvePagePrefixes.length) &&
    senderId === extensionId &&
    approvePagePrefixes.some((prefix) => senderUrl.startsWith(prefix));
  const nonceOk = typeof record.nonce === "string" && record.nonce.length > 0 && message?.nonce === record.nonce;
  const windowOk = record.windowId != null && Number(message?.windowId) === Number(record.windowId);

  if (!senderOk || !nonceOk || !windowOk || record.state !== "pending" || Number(record.expiresAt) <= Date.now()) {
    if (record.state === "pending") {
      record.state = "denied";
      record.deniedAt = Date.now();
      record.denyReason = "unverified_decision_sender";
      await persistApprovalRecord(record);
    }
    return { ok: false, code: "USER_APPROVAL_REJECTED" };
  }

  const approved = message?.decision === "approve";
  record.state = approved ? "approved" : "denied";
  record[approved ? "approvedAt" : "deniedAt"] = Date.now();
  await persistApprovalRecord(record);

  if (typeof chrome?.windows?.remove === "function" && record.windowId != null) {
    try {
      await chrome.windows.remove(record.windowId);
    } catch {
      // The user may have closed the window already; the decision still stands.
    }
  }
  return { ok: true, approvalId, state: record.state };
}

/** Closing the approval window is a refusal, not an implicit approval left hanging in `pending`. */
function denyApprovalsForWindow(windowId) {
  for (const record of approvalRecords.values()) {
    if (record.state !== "pending") continue;
    if (record.windowId == null || Number(record.windowId) !== Number(windowId)) continue;
    record.state = "denied";
    record.deniedAt = Date.now();
    record.denyReason = "approval_window_closed";
    // A failed write only costs durability across a worker restart, not the decision itself.
    void persistApprovalRecord(record).catch(() => {});
  }
}

if (typeof chrome !== "undefined" && chrome?.windows?.onRemoved?.addListener) {
  try {
    chrome.windows.onRemoved.addListener((windowId) => {
      denyApprovalsForWindow(windowId);
    });
  } catch {
    // A runtime without windows events simply keeps relying on expiry.
  }
}

const openedTabs = createOpenedTabSet();
const detachTimers = new Map();
/**
 * Tabs this worker attached itself. MV3 suspends the worker while a `chrome.debugger` attachment
 * survives, so a startup reconciliation must never release an attachment made by the current worker.
 */
const attachedInThisWorker = new Set();
let openedTabsLoaded = null;
let nativePort = null;

function toMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function tabTarget(tabId) {
  return { tabId: Number(tabId) };
}

/** Read-only discovery. Never runs a page action while enumerating frames. */
function probeTargetFrame(options) {
  let allowed = true;
  try {
    let view = window;
    while (view !== view.top) {
      const parent = view.parent;
      const frame = view.frameElement;
      if (!frame || frame.contentDocument !== view.document || parent.document !== frame.ownerDocument) {
        allowed = false;
        break;
      }
      view = parent;
    }
  } catch (_) { allowed = false; }
  // Sole source-of-truth predicate, mirrored verbatim in browserConsentCapture.js,
  // probeTargetFrame and pageOperation in background.js: update all three together.
  // Each function is serialized into the page independently; module helpers cannot be shared.
  // aria-disabled is semantic, not a click barrier; opacity:0 layers can receive clicks.
  function isTargetCandidate(element) {
    if (!element || element.isConnected === false || element.type === "hidden" ||
        element.closest?.('[inert], [hidden]')) return false;
    const view = element.ownerDocument?.defaultView;
    if (!view || typeof element.getBoundingClientRect !== "function") return false;
    const rect = element.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return false;
    for (let node = element; node; node = node.parentElement) {
      const style = view.getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden" ||
          style.visibility === "collapse") return false;
    }
    return true;
  }
  let count = 0;
  if (options.selector) {
    // Routing cannot safely infer the meaning of non-CSS selectors in child documents.
    try { count = Array.from(document.querySelectorAll(options.selector)).filter(isTargetCandidate).length; }
    catch (_) { return { allowed, count: 0, nonCss: true }; }
  } else {
    const el = document.activeElement;
    count = el && el !== document.body && el !== document.documentElement &&
      !/^(iframe|frame)$/i.test(el.tagName) && document.hasFocus() ? 1 : 0;
  }
  return { allowed, count };
}

async function executeInTab(tabId, func, args = [], frameId) {
  await assertScriptableTab(tabId);
  const options = args[0] || {};
  frameId ??= options._frameId;
  const routedOps = new Set(["inspect", "click", "type", "press", "mark_select_token", "set_select_value", "read_select_state"]);
  const discover = frameId === undefined &&
    (func === captureBrowserConsentState || (func === pageOperation && routedOps.has(options.op))) &&
    (options.selector || options.active || options.subject === "active" || options.op === "press");
  if (discover) {
    const probes = await chrome.scripting.executeScript({
      target: { ...tabTarget(tabId), allFrames: true },
      func: probeTargetFrame,
      args: [{ selector: options.selector || "" }],
    });
    const matches = probes.filter((entry) => entry.result?.count > 0);
    if (matches.some((entry) => !entry.result.allowed)) {
      throw connectorError("UNSUPPORTED_IFRAME", "Target crosses an inaccessible frame boundary.");
    }
    if (matches.length > 1 || matches.some((entry) => entry.result.count > 1)) {
      throw connectorError("FRAME_TARGET_AMBIGUOUS", "Target does not identify one element in one document.");
    }
    if (matches.length === 1) {
      frameId = matches[0].frameId;
      if (!Number.isInteger(frameId)) throw connectorError("UNSUPPORTED_IFRAME", "Target frame identity is unavailable.");
    } else if (probes.some((entry) => entry.result?.allowed === false)) {
      throw connectorError("UNSUPPORTED_IFRAME", "No target can be proven across an inaccessible frame boundary.");
    } else if (!options.selector) {
      throw connectorError("TARGET_NOT_FOUND", "No focused accessible frame target was found.");
    } else if (options.selector && !probes.some((entry) => entry.frameId === 0 && entry.result?.nonCss)) {
      throw connectorError("TARGET_NOT_FOUND", "No unique accessible frame target was found.");
    }
  }
  const [result] = await chrome.scripting.executeScript({
    target: frameId === undefined ? tabTarget(tabId) : { ...tabTarget(tabId), frameIds: [frameId] },
    func,
    args,
  });
  const value = result?.result;
  if (value && typeof value === "object" && Number.isInteger(frameId)) value._frameId = frameId;
  return value;
}

/**
 * Chrome answers "The extensions gallery cannot be scripted" for its own UI and the Web Store.
 * Detecting it up front turns an opaque failure into something the model can act on: ask the user.
 */
async function assertScriptableTab(tabId) {
  let url = "";
  try {
    const tab = await chrome.tabs.get(Number(tabId));
    url = typeof tab?.url === "string" ? tab.url : "";
  } catch {
    return; // A missing tab is reported by the script call itself.
  }
  if (isProtectedPageUrl(url)) {
    throw connectorError(
      PROTECTED_PAGE_CODE,
      `Chrome does not allow scripts on this page (${url.split("?")[0].slice(0, 80)}), so it cannot be read or operated automatically. Ask the user to look at it or act on it.`,
    );
  }
}

/**
 * The debugger path never runs a page script, so `assertScriptableTab` does not cover it: attaching to
 * the extension's own approval page and dispatching `Input.dispatchMouseEvent` there would let the
 * connector press "Allow once" itself. Same protected-prefix list, same refusal — deliberately not a
 * second policy to keep in sync.
 */
async function assertDebuggableTab(tabId) {
  let url = "";
  try {
    const tab = await chrome.tabs.get(Number(tabId));
    url = typeof tab?.url === "string" ? tab.url : "";
  } catch {
    return; // A missing tab is reported by the debugger attach itself.
  }
  if (isProtectedPageUrl(url)) {
    throw connectorError(
      PROTECTED_PAGE_CODE,
      `Chrome does not allow debugging this page (${url.split("?")[0].slice(0, 80)}), so the connector will not send it input. Ask the user to act on it.`,
    );
  }
}

function pushBounded(store, tabId, entry, cap) {
  const entries = store.get(tabId) || [];
  entries.push(entry);
  if (entries.length > cap) entries.splice(0, entries.length - cap);
  store.set(tabId, entries);
}

function serializeTab(tab) {
  return {
    id: String(tab.id),
    title: tab.title || "",
    url: tab.url || "",
    active: Boolean(tab.active),
    windowId: tab.windowId,
  };
}

/** Everything the connector remembers about one tab: buffers, ref snapshot and detach timer. */
function dropTabState(tabId) {
  const id = normalizeTabId(tabId);
  if (!id) return;
  consoleByTab.delete(id);
  networkByTab.delete(id);
  refRegistry.invalidate(id);
  const timer = detachTimers.get(id);
  if (timer) clearTimeout(timer);
  detachTimers.delete(id);
}

function connectorError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

/**
 * Best effort by contract: a tab without an attachment (or an already closed tab) is already
 * released, so a failed detach must never fail the action that triggered it.
 */
async function detachTab(tabId) {
  if (!HAS_DEBUGGER) return false;
  const id = normalizeTabId(tabId);
  if (!id) return false;
  const timer = detachTimers.get(id);
  if (timer) clearTimeout(timer);
  detachTimers.delete(id);
  try {
    await chrome.debugger.detach(tabTarget(id));
    attachedInThisWorker.delete(id);
    return true;
  } catch (error) {
    console.warn(`[nolo chrome connector] debugger detach skipped for tab ${id}: ${toMessage(error)}`);
    return false;
  }
}

/** One timer per tab; every debugger-backed action resets the idle window. */
function scheduleDetach(tabId) {
  const id = normalizeTabId(tabId);
  if (!id) return;
  const timer = detachTimers.get(id);
  if (timer) clearTimeout(timer);
  detachTimers.set(id, setTimeout(() => {
    detachTimers.delete(id);
    void detachTab(id);
  }, DETACH_IDLE_MS));
}

/**
 * Ownership lives in chrome.storage.session: it survives service-worker suspension within one
 * browser session and is cleared by the browser. Storage failures stay non-fatal.
 */
async function loadOpenedTabs() {
  if (!openedTabsLoaded) {
    openedTabsLoaded = (async () => {
      try {
        const stored = await chrome.storage.session.get(OPENED_TABS_STORAGE_KEY);
        for (const id of deserializeOpenedTabs(stored?.[OPENED_TABS_STORAGE_KEY])) {
          openedTabs.add(id);
        }
      } catch (error) {
        console.warn(`[nolo chrome connector] opened-tab state unavailable: ${toMessage(error)}`);
        // A transient failure must not disable ownership tracking for the rest of the worker's life.
        openedTabsLoaded = null;
      }
    })();
  }
  return openedTabsLoaded;
}

async function persistOpenedTabs() {
  try {
    await chrome.storage.session.set({
      [OPENED_TABS_STORAGE_KEY]: serializeOpenedTabs(openedTabs),
    });
  } catch (error) {
    console.warn(`[nolo chrome connector] opened-tab state not persisted: ${toMessage(error)}`);
  }
}

async function ensureDebugger(tabId) {
  if (!HAS_DEBUGGER) {
    throw connectorError(DEBUGGER_UNSUPPORTED_SIGNAL, DEBUGGER_UNSUPPORTED_MESSAGE);
  }
  const target = tabTarget(tabId);
  // The debugger path dispatches *trusted* input, which no script-level guard covers: attaching to
  // the extension's own approval page would let the connector click "Allow once" itself.
  await assertDebuggableTab(tabId);
  try {
    await chrome.debugger.attach(target, "1.3");
  } catch (error) {
    if (!String(error?.message || error).includes("Another debugger is already attached")) {
      throw error;
    }
  }
  await chrome.debugger.sendCommand(target, "Runtime.enable");
  await chrome.debugger.sendCommand(target, "Network.enable");
  attachedInThisWorker.add(normalizeTabId(tabId));
}

/**
 * A `chrome.debugger` attachment outlives the service worker that created it, so an idle timer can
 * die with the worker and leave Chrome's "started debugging this browser" banner up for the rest of
 * the browser session. On every worker start, release anything still attached that this worker did
 * not attach itself. Detaching a target another debugger owns simply fails and is swallowed.
 */
async function reconcileDebuggerAttachments() {
  if (!HAS_DEBUGGER) return;
  try {
    const targets = await chrome.debugger.getTargets();
    for (const target of targets) {
      if (!target?.attached) continue;
      const tabId = normalizeTabId(target.tabId);
      if (tabId && attachedInThisWorker.has(tabId)) continue;
      try {
        await chrome.debugger.detach(tabId ? tabTarget(tabId) : { targetId: target.id });
      } catch {
        // Not ours, already gone, or the tab closed underneath us.
      }
    }
  } catch (error) {
    console.warn(`[nolo chrome connector] debugger reconciliation skipped: ${toMessage(error)}`);
  }
}

if (HAS_DEBUGGER) {
chrome.debugger.onEvent.addListener((source, method, params) => {
  const tabId = String(source.tabId || "");
  if (!tabId) return;
  if (method === "Runtime.consoleAPICalled") {
    pushBounded(consoleByTab, tabId, {
      type: params.type,
      text: (params.args || [])
        .map((arg) => arg.value ?? arg.description ?? "")
        .join(" ")
        .slice(0, COMPACT_BUDGET.console.rawTextMaxChars),
      timestamp: params.timestamp,
    }, COMPACT_BUDGET.console.rawCap);
  }
  if (method === "Runtime.exceptionThrown") {
    const ex = params.exceptionDetails || {};
    pushBounded(consoleByTab, tabId, {
      type: "error",
      text: `Uncaught: ${ex.text || ex.exception?.description || ex.exception?.value || JSON.stringify(ex)}`.slice(
        0,
        COMPACT_BUDGET.console.rawTextMaxChars,
      ),
      timestamp: params.timestamp,
    }, COMPACT_BUDGET.console.rawCap);
  }
  if (method === "Network.requestWillBeSent") {
    pushBounded(networkByTab, tabId, {
      requestId: params.requestId,
      url: params.request?.url,
      method: params.request?.method,
      type: params.type,
      timestamp: params.timestamp,
    }, COMPACT_BUDGET.network.rawCap);
  }
});
} // HAS_DEBUGGER — Firefox never reaches this listener; console/network read paths degrade below.

/** A removed tab has no attachment and no per-tab state worth keeping. */
chrome.tabs.onRemoved.addListener((tabId) => {
  const id = normalizeTabId(tabId);
  dropTabState(id);
  // Ownership lives in session storage, which the next worker instance has to load first.
  void (async () => {
    await loadOpenedTabs();
    if (!openedTabs.has(id)) return;
    openedTabs.remove(id);
    await persistOpenedTabs();
  })();
});

/**
 * Single injected page agent. This function is serialized into the tab, so it must stay
 * self-contained: no closure over service worker state, no imports.
 */
function pageOperation(payload) {
  // Recheck at the effect boundary: a navigation between discovery and injection
  // must not turn an allowed frame into an inaccessible one.
  try {
    let view = window;
    while (view !== view.top) {
      const frame = view.frameElement;
      if (!frame || frame.contentDocument !== view.document || frame.ownerDocument !== view.parent.document) {
        return { ok: false, code: "UNSUPPORTED_IFRAME", message: "Inaccessible frame boundary" };
      }
      view = view.parent;
    }
  } catch (_) { return { ok: false, code: "UNSUPPORTED_IFRAME", message: "Inaccessible frame boundary" }; }
  // Sole source-of-truth predicate, mirrored verbatim in browserConsentCapture.js,
  // probeTargetFrame and pageOperation in background.js: update all three together.
  // Each function is serialized into the page independently; module helpers cannot be shared.
  // aria-disabled is semantic, not a click barrier; opacity:0 layers can receive clicks.
  function isTargetCandidate(element) {
    if (!element || element.isConnected === false || element.type === "hidden" ||
        element.closest?.('[inert], [hidden]')) return false;
    const view = element.ownerDocument?.defaultView;
    if (!view || typeof element.getBoundingClientRect !== "function") return false;
    const rect = element.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return false;
    for (let node = element; node; node = node.parentElement) {
      const style = view.getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden" ||
          style.visibility === "collapse") return false;
    }
    return true;
  }
  if (payload.selector && !/^(point:|percent:|text:)/.test(payload.selector)) {
    try {
      if (Array.from(document.querySelectorAll(payload.selector)).filter(isTargetCandidate).length > 1) {
        return { ok: false, code: "FRAME_TARGET_AMBIGUOUS", message: "Multiple target elements" };
      }
    } catch (_) { /* Existing non-CSS selector semantics remain top-frame only. */ }
  }
  const MAX_CANDIDATES = 300;
  const INTERACTIVE_SELECTOR =
    'a[href],button,input:not([type="hidden"]),select,textarea,[role],[contenteditable="true"],[tabindex]';

  function isVisible(element) {
    if (!element || typeof element.getBoundingClientRect !== "function") return false;
    const rect = element.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return false;
    if (typeof window.getComputedStyle === "function") {
      const style = window.getComputedStyle(element);
      if (style && (style.visibility === "hidden" || style.display === "none")) return false;
    }
    return true;
  }

  function labelOf(element) {
    if (!element) return "";
    const attribute = (name) => (typeof element.getAttribute === "function" ? element.getAttribute(name) || "" : "");
    const text =
      attribute("aria-label") ||
      attribute("placeholder") ||
      attribute("title") ||
      attribute("name") ||
      element.innerText ||
      element.textContent ||
      "";
    return String(text).replace(/\s+/g, " ").trim().slice(0, 200);
  }

  /**
   * The identity of a marked select lives *outside* the page's DOM, in a registry of live node
   * references that the page cannot see, copy or forge.
   *
   * Why not a marker attribute (the previous design): `cloneNode(true)` copies attributes. A clone
   * that replaces the original carries the very same marker value, so "the element carrying the
   * token" stops being proof of identity — the token names a *value*, and the page may hand that
   * value to another node. A registry of node references cannot be copied: a clone is a different
   * object, is not in the registry, and therefore can never be mistaken for the node that was
   * marked. (An attribute value such as id → name → aria-label is weaker still: it names a *kind*
   * of control, not a node.)
   *
   * Where the registry lives: `chrome.scripting.executeScript({func, args})` runs the injected
   * function in the extension's *isolated world*, and that world keeps one `globalThis` for as long
   * as the frame lives. The page's own scripts run in a different world and can neither read nor
   * write this registry.
   *
   * ASSUMPTION (not verified on a real browser): that the isolated world survives between two
   * `executeScript` calls. The JSDOM tests simulate exactly this — one shared `globalThis` per
   * frame — but they run the page op in the page realm, so the *isolation* is not exercised there.
   * If the assumption were false, the registry would be empty at the set/read step and both would
   * fail closed: the set is refused and nothing is written. The failure mode is "refuses to
   * write", never "writes to the wrong control".
   */
  const SELECT_TOKEN_REGISTRY_KEY = "__noloSelectTokens";
  /** A bounded registry: an abandoned mark must not keep its node alive forever. */
  const SELECT_TOKEN_REGISTRY_LIMIT = 32;
  /** The attribute an older version used; it is only ever removed, never written. */
  const SELECT_TOKEN_ATTRIBUTE = "data-nolo-select-token";

  /** A fresh, unpredictable marker value per operation. */
  function randomSelectToken() {
    const bytes = new Uint8Array(16);
    const source = typeof globalThis !== "undefined" ? globalThis.crypto : null;
    if (source && typeof source.getRandomValues === "function") {
      source.getRandomValues(bytes);
    } else {
      for (let index = 0; index < bytes.length; index += 1) {
        bytes[index] = Math.floor(Math.random() * 256);
      }
    }
    let hex = "";
    for (let index = 0; index < bytes.length; index += 1) {
      hex += bytes[index].toString(16).padStart(2, "0");
    }
    return `nolo-${hex}`;
  }

  /**
   * The registry of marked nodes, or null when no registry can exist at all.
   *
   * A missing registry is a hard failure and never a fallback: without it there is no identity
   * proof, and a set without identity proof would write to whatever control the selector happens
   * to name now — the very failure this design exists to prevent.
   */
  function selectTokenRegistry() {
    try {
      const host = globalThis;
      if (!host) return null;
      let registry = host[SELECT_TOKEN_REGISTRY_KEY];
      if (!registry || typeof registry.get !== "function" || typeof registry.set !== "function") {
        registry = new Map();
        host[SELECT_TOKEN_REGISTRY_KEY] = registry;
      }
      return registry;
    } catch (_) {
      return null;
    }
  }

  /** Drop entries whose node is gone and keep the registry inside its bound. */
  function pruneSelectTokens(registry) {
    if (!registry) return 0;
    try {
      for (const [token, node] of registry) {
        if (!node || node.isConnected !== true) registry.delete(token);
      }
      // The oldest entry goes first, so a fresh mark always fits within the limit.
      while (registry.size >= SELECT_TOKEN_REGISTRY_LIMIT) {
        const oldest = registry.keys().next();
        if (oldest.done) break;
        registry.delete(oldest.value);
      }
    } catch (_) {}
    return registry.size;
  }

  /**
   * The node a token stands for — or null when the token is unknown, its node was detached, or it
   * is no longer a select. A clone is a different node and is not in the registry, so it can never
   * be returned here.
   */
  function selectTokenNode(registry, token) {
    if (!registry || !token || typeof token !== "string") return null;
    let node = null;
    try {
      node = registry.get(token) || null;
    } catch (_) {
      return null;
    }
    if (!node) return null;
    if (node.isConnected !== true) return null;
    if (String(node.tagName || "").toLowerCase() !== "select") return null;
    return node;
  }

  /**
   * Take the mark off the page again: it must never outlive its operation.
   *
   * The registry entry *is* the mark now, so clearing it is a lookup rather than a sweep of the
   * current document: a mark on a node that has already been detached is cleared with it.
   */
  function clearSelectToken(token) {
    if (!token || typeof token !== "string") return 0;
    let removed = 0;
    const registry = selectTokenRegistry();
    if (registry) {
      try {
        if (registry.delete(token)) removed += 1;
      } catch (_) {}
    }
    // An older version put the mark on the node as an attribute; take such leftovers off as well,
    // so no page-visible trace of a mark survives the operation.
    try {
      for (const holder of Array.prototype.slice.call(document.querySelectorAll(`[${SELECT_TOKEN_ATTRIBUTE}]`))) {
        try {
          holder.removeAttribute(SELECT_TOKEN_ATTRIBUTE);
          removed += 1;
        } catch (_) {}
      }
    } catch (_) {}
    return removed;
  }

  /**
   * How many elements a plain CSS selector matches, or null when the selector is not a plain one.
   *
   * A selector that matches several controls names no single control. `querySelector` would
   * silently return the first of them, and the read-back could not tell that apart from the
   * control that was really set — so such a selector is refused instead of resolved by luck.
   */
  function plainSelectorMatchCount(selector) {
    if (typeof selector !== "string" || !selector) return null;
    if (selector.startsWith("point:") || selector.startsWith("percent:") || selector.startsWith("text:")) {
      return null;
    }
    if (/text=|:has-text\(/i.test(selector)) return null;
    try {
      return Array.from(document.querySelectorAll(selector)).filter(isTargetCandidate).length;
    } catch (_) {
      return null;
    }
  }

  /** The one control an action addresses — or a refusal, never a guess. */
  function resolveSelectTarget(found, payload) {
    const resolved = resolveElement(found, payload, { verifyName: true });
    if (!resolved.element) return resolved;
    const matchCount = plainSelectorMatchCount(payload.selector);
    if (matchCount !== null && matchCount > 1) {
      return {
        code: "SELECT_TARGET_AMBIGUOUS",
        message: `The selector ${payload.selector} matches ${matchCount} elements, so it names no single control; the value was not set.`,
      };
    }
    return resolved;
  }

  function describe(element, index) {
    const tag = String(element.tagName || "").toLowerCase();
    const described = {
      index,
      tag,
      name: labelOf(element),
      role: String(element.getAttribute?.("role") || "").toLowerCase(),
    };
    if (element.disabled) described.disabled = true;
    if (element.readOnly) described.readonly = true;
    if (tag === "input" || tag === "textarea" || tag === "select") {
      const inputType = tag === "input" ? String(element.type || "text").toLowerCase() : tag;
      described.type = inputType;
      described.value = inputType === "password" ? null : String(element.value ?? "").slice(0, 120);
    }
    return described;
  }

  function regionRoot(region) {
    if (!region) return document.body || document.documentElement;
    return document.querySelector(region);
  }

  function inViewport(element) {
    const rect = element.getBoundingClientRect();
    return rect.right > 0 && rect.bottom > 0 && rect.left < window.innerWidth && rect.top < window.innerHeight;
  }

  function candidates(region) {
    const root = regionRoot(region);
    if (!root) return null;
    const nodes = Array.prototype.slice.call(root.querySelectorAll(INTERACTIVE_SELECTOR));
    // A region that is itself interactive (e.g. a link or button) is a candidate, listed first.
    const rootIsCandidate = root !== document.body && root !== document.documentElement
      && typeof root.matches === "function" && root.matches(INTERACTIVE_SELECTOR);
    const pool = rootIsCandidate ? [root].concat(nodes) : nodes;
    const visible = [];
    for (let index = 0; index < pool.length && visible.length < MAX_CANDIDATES; index += 1) {
      const node = pool[index];
      if (!isVisible(node)) continue;
      visible.push(node);
    }
    return { root, list: visible };
  }

  function signatureOf(found) {
    const keys = [];
    for (let index = 0; index < found.list.length && index < 24; index += 1) {
      const element = found.list[index];
      keys.push(`${String(element.tagName || "").toLowerCase()}:${labelOf(element).slice(0, 40)}`);
    }
    return [String(location.href), found.list.length, keys.join("|")].join("\u00a7").slice(0, 1024);
  }

  function textOf(root) {
    if (!root) return "";
    if (typeof root.innerText === "string" && root.innerText) return root.innerText;
    return String(root.textContent || "");
  }

  function readbackOf(element) {
    const tag = String(element.tagName || "").toLowerCase();
    if (tag === "input" && String(element.type || "").toLowerCase() === "password") return null;
    if ("value" in element && element.value != null) return String(element.value);
    return String(element.textContent ?? "");
  }

  function snapshotOf(element) {
    return {
      tag: String((element && element.tagName) || "").toLowerCase(),
      name: labelOf(element),
      exists: Boolean(element),
      disabled: Boolean(element && element.disabled),
      readonly: Boolean(element && element.readOnly),
      value: element ? readbackOf(element) : null,
    };
  }

  /**
   * Resolve the element an action means to address.
   *
   * `expectedName` is the guard that stops the page from swapping a different control in between
   * inspection and action, and nothing more: `labelOf` falls back to `innerText`, and for a select
   * that text *is the selected option*, so a label comparison cannot survive the very change the
   * setter performs. Callers that only ask "what is this element now" (the read-back) pass
   * `verifyName: false`; `expectedTag` and the index still pin the identity.
   */
  function resolveElement(found, target, options) {
    const verifyName = !(options && options.verifyName === false);
    if (target.selector) {
      let bySelector = null;
      if (target.selector === "point:bottom-publish") {
        const x = Math.round(window.innerWidth * 0.55);
        const y = Math.round(window.innerHeight * 0.96);
        bySelector = document.elementFromPoint(x, y);
      } else if (target.selector.startsWith("percent:")) {
        const [px, py] = target.selector.slice(8).split(",").map(Number);
        const x = Math.round(window.innerWidth * px);
        const y = Math.round(window.innerHeight * py);
        bySelector = document.elementFromPoint(x, y);
      } else if (target.selector.startsWith("point:")) {
        const [px, py] = target.selector.slice(6).split(",").map(Number);
        if (!isNaN(px) && !isNaN(py)) {
          bySelector = document.elementFromPoint(px, py);
        }
      }
      if (!bySelector) {
        try {
          bySelector = Array.from(document.querySelectorAll(target.selector)).filter(isTargetCandidate)[0] || null;
        } catch (_) {}
      }

      if (!bySelector && target.selector) {
        const textMatch =
          target.selector.match(/text=([^\s,)]+)/i) ||
          target.selector.match(/:has-text\(['"]?([^'"]+)['"]?\)/i) ||
          (target.selector.startsWith("text:") ? [null, target.selector.slice(5)] : null);
        const searchText = textMatch ? textMatch[1].trim() : (target.selector.trim() === "发布" ? "发布" : null);
        if (searchText) {
          const allElements = Array.from(document.querySelectorAll("button, div[role='button'], a, span, div"));
          const matched = allElements.filter(
            (el) => el.textContent && el.textContent.trim() === searchText && el.children.length <= 1,
          );
          if (matched.length > 0) {
            bySelector = matched.reduce((lowest, el) => {
              const r1 = el.getBoundingClientRect();
              const r2 = lowest.getBoundingClientRect();
              return r1.bottom > r2.bottom ? el : lowest;
            }, matched[0]);
          } else {
            const allBtnTexts = Array.from(document.querySelectorAll("button, div[role='button']"))
              .map((b) => b.textContent.trim())
              .filter(Boolean)
              .slice(-10);
            return {
              code: "ELEMENT_NOT_FOUND",
              message: `Element not found for "${searchText}". Found bottom buttons: [${allBtnTexts.join(", ")}]`,
            };
          }
        }
      }

      if (!bySelector) {
        return { code: "ELEMENT_NOT_FOUND", message: `Element not found: ${target.selector}` };
      }
      // Guards the inspect-then-act window: the page must not be able to swap in a different control
      // between the gate decision and the action.
      if (target.expectedName && labelOf(bySelector) !== target.expectedName) {
        return {
          code: "STALE_PAGE_REVISION",
          message: "The target changed on the page since it was inspected; re-read the page and retry.",
        };
      }
      return { element: bySelector };
    }
    const candidate = typeof target.index === "number" ? found.list[target.index] || null : null;
    if (!candidate) {
      return {
        code: "STALE_PAGE_REVISION",
        message: "The elementRef no longer matches the page; call chrome_read_page again.",
      };
    }
    if (target.expectedTag && String(candidate.tagName || "").toLowerCase() !== target.expectedTag) {
      return {
        code: "STALE_PAGE_REVISION",
        message: "The elementRef resolved to a different element; call chrome_read_page again.",
      };
    }
    if (verifyName && target.expectedName && labelOf(candidate) !== target.expectedName) {
      return {
        code: "STALE_PAGE_REVISION",
        message: "The elementRef target changed on the page; call chrome_read_page again.",
      };
    }
    return { element: candidate };
  }

  /** The control an activation key would trigger, or null when nothing meaningful is focused. */
  function activeControl() {
    const element = document.activeElement || null;
    if (!element || element === document.body || element === document.documentElement) return null;
    const form = typeof element.closest === "function" ? element.closest("form") : null;
    if (form) {
      const submitControl = form.querySelector(
        'button[type="submit"],input[type="submit"],button:not([type])',
      );
      if (submitControl) return submitControl;
    }
    return element;
  }

  const op = String((payload && payload.op) || "");
  const region = String((payload && payload.region) || "");

  if (op === "inspect") {
    // Used before acting: the worker must know what a target *is* before deciding to refuse it.
    let element = null;
    if (payload.subject === "active") {
      // null when focus sits on <body>: the page's whole text must never be read as a control name.
      element = activeControl();
    } else {
      const found = candidates(region);
      if (!found) {
        return {
          ok: false,
          code: "REGION_NOT_FOUND",
          message: `Region selector matched no element: ${region}`,
        };
      }
      const resolved = resolveElement(found, payload);
      if (resolved.code) return { ok: false, code: resolved.code, message: resolved.message };
      element = resolved.element;
    }
    if (!element) {
      return { ok: false, code: "ELEMENT_NOT_FOUND", message: "There is no element to inspect." };
    }
    const tag = String(element.tagName || "").toLowerCase();
    const declaredRole = String(element.getAttribute?.("role") || "").toLowerCase();
    const declaredType = String(element.getAttribute?.("type") || "").toLowerCase();
    return {
      ok: true,
      name: labelOf(element),
      // Do not use editable content as approval metadata; keep identity labels unchanged.
      approvalName: (tag === "textarea" || tag === "input" || element.isContentEditable ||
        (element.hasAttribute("contenteditable") && element.getAttribute("contenteditable") !== "false"))
        ? (["name", "aria-label", "placeholder", "title"].map((key) => element.getAttribute(key)).find((text) => text?.trim()) || "未命名控件")
        : labelOf(element),
      tag,
      role: declaredRole,
      type: tag === "input" ? String(element.type || declaredType || "text").toLowerCase() : declaredType,
    };
  }

  if (op === "read") {
    const found = candidates(region);
    if (!found) {
      return {
        ok: false,
        code: "REGION_NOT_FOUND",
        message: `Region selector matched no element: ${region}`,
        region,
      };
    }
    const described = found.list.map(describe);
    const elements = payload.viewportOnly === true
      ? described.filter((_, index) => inViewport(found.list[index]))
      : described;
    return {
      ok: true,
      url: String(location.href),
      title: String(document.title || ""),
      text: textOf(found.root),
      html: payload.includeHtml ? String(found.root.outerHTML || "").slice(0, 40000) : null,
      elements,
      elementCount: elements.length,
      signature: signatureOf(found),
    };
  }

  if (op === "click" || op === "type") {
    const found = candidates(region);
    if (!found) {
      return {
        ok: false,
        code: "REGION_NOT_FOUND",
        message: `Region selector matched no element: ${region}`,
        region,
      };
    }
    if (payload.expectedUrl && String(location.href) !== payload.expectedUrl) {
      return {
        ok: false,
        code: "STALE_PAGE_REVISION",
        message: "The tab navigated to a different document; call chrome_read_page again.",
      };
    }
    if (payload.expectedSignature && signatureOf(found) !== payload.expectedSignature) {
      return {
        ok: false,
        code: "STALE_PAGE_REVISION",
        message: "The page revision changed since the elementRef was issued; call chrome_read_page again.",
      };
    }
    const resolved = resolveElement(found, payload);
    if (!resolved.element) {
      return { ok: false, code: resolved.code, message: resolved.message, signature: signatureOf(found) };
    }
    const target = resolved.element;
    if (target.disabled) {
      return {
        ok: false,
        code: "ELEMENT_DISABLED",
        message: "The target element is disabled; the action was not attempted.",
      };
    }
    if (op === "type" && target.readOnly) {
      return {
        ok: false,
        code: "ELEMENT_READONLY",
        message: "The target element is read-only; the text was not typed.",
      };
    }

    if (op === "type") {
      // A native <select> is not a text field: writing `value` on it does not type anything, it
      // silently clears the selection (an unknown value leaves the control with no option chosen).
      // `type` used to be a way around `set_select_value` — and therefore around its identity
      // check, its option matching and its read-back — so it refuses selects outright and points
      // at the action that does verify itself.
      const targetTag = String(target.tagName || "").toLowerCase();
      if (targetTag === "select") {
        return {
          ok: false,
          code: "TYPE_ON_SELECT_REFUSED",
          message:
            "The target is a native <select>; typing does not choose an option. Use set_select_value instead — the value was not changed.",
          signature: signatureOf(found),
        };
      }
      const before = snapshotOf(target);
      try {
        target.focus();
      } catch (error) {
        /* focus is best effort; the value write below is the observable effect */
      }
      const text = String(payload.text || "");
      const wantsClear = payload.clearFirst !== false;
      if ("value" in target) {
        const current = String(target.value ?? "");
        target.value = wantsClear ? text : `${current}${text}`;
        target.dispatchEvent(new Event("input", { bubbles: true }));
        target.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        const current = String(target.textContent ?? "");
        try {
          target.focus();
          if (wantsClear) {
            document.execCommand("selectAll", false, null);
          }
          document.execCommand("insertText", false, text);
        } catch (_) {
          target.textContent = wantsClear ? text : `${current}${text}`;
          target.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
      const after = snapshotOf(target);
      return {
        ok: true,
        before,
        after,
        element: after,
        signature: signatureOf(found),
        url: String(location.href),
      };
    }

    const before = {
      url: String(location.href),
      textLength: textOf(found.root).length,
      exists: true,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    };
    try {
      target.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
    } catch (_) {}

    let clickTarget = target;
    if (target.shadowRoot) {
      const inner = target.shadowRoot.querySelector("button, div[role='button'], div, *");
      if (inner) clickTarget = inner;
    }

    const mouseOpts = { bubbles: true, cancelable: true, view: window, button: 0, composed: true };
    try {
      clickTarget.dispatchEvent(new PointerEvent("pointerdown", mouseOpts));
      clickTarget.dispatchEvent(new MouseEvent("mousedown", mouseOpts));
      clickTarget.dispatchEvent(new PointerEvent("pointerup", mouseOpts));
      clickTarget.dispatchEvent(new MouseEvent("mouseup", mouseOpts));
    } catch (_) {}
    if (typeof clickTarget.click === "function") {
      clickTarget.click();
    }
    if (clickTarget !== target && typeof target.click === "function") {
      target.click();
    }
    const afterRoot = regionRoot(region);
    return {
      ok: true,
      before,
      hitElement: {
        tag: String(target.tagName || ""),
        text: (target.textContent || "").trim().slice(0, 50),
        className: String(target.className || ""),
      },
      after: {
        url: String(location.href),
        textLength: textOf(afterRoot).length,
        exists: target.isConnected === false
          ? false
          : typeof document.contains === "function"
            ? document.contains(target)
            : true,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
      },
      element: snapshotOf(target),
      signature: signatureOf(found),
      url: String(location.href),
    };
  }

  if (op === "mark_select_token") {
    // Mark the target select *before* its value is set. The marker is the one thing that can
    // prove, later, that the read-back is looking at the very same node.
    const foundForMark = candidates(region);
    if (!foundForMark) {
      return {
        ok: false,
        code: "REGION_NOT_FOUND",
        message: `Region selector matched no element: ${region}`,
        region,
      };
    }
    if (payload.expectedUrl && String(location.href) !== payload.expectedUrl) {
      return {
        ok: false,
        code: "STALE_PAGE_REVISION",
        message: "The tab navigated to a different document; call chrome_read_page again.",
      };
    }
    if (payload.expectedSignature && signatureOf(foundForMark) !== payload.expectedSignature) {
      return {
        ok: false,
        code: "STALE_PAGE_REVISION",
        message: "The page revision changed since the elementRef was issued; call chrome_read_page again.",
        signature: signatureOf(foundForMark),
      };
    }
    const resolvedForMark = resolveSelectTarget(foundForMark, payload);
    const element = resolvedForMark.element || null;
    if (!element) {
      return {
        ok: false,
        code: typeof resolvedForMark.code === "string" ? resolvedForMark.code : "ELEMENT_NOT_FOUND",
        message: resolvedForMark.message || "The target select could not be located.",
      };
    }
    if (String(element.tagName || "").toLowerCase() !== "select") {
      const tag = String(element.tagName || "").toLowerCase();
      return {
        ok: false,
        code: "NOT_A_SELECT",
        message: `The target is a <${tag || "unknown"}>, not a native <select>; a custom dropdown must be opened with click and one of its options clicked.`,
      };
    }
    const token = randomSelectToken();
    const registry = selectTokenRegistry();
    if (!registry) {
      // Fail closed: without a registry there is no identity proof, and a set without one would
      // write to whichever control the selector names now.
      return {
        ok: false,
        code: "SELECT_TOKEN_UNAVAILABLE",
        message:
          "This page cannot hold a select identity token, so the target select cannot be identified safely; the value was not set.",
      };
    }
    pruneSelectTokens(registry);
    try {
      registry.set(token, element);
    } catch (error) {
      return {
        ok: false,
        code: "SELECT_TOKEN_FAILED",
        message: `The target select could not be marked: ${String((error && error.message) || error)}`,
      };
    }
    return { ok: true, token, signature: signatureOf(foundForMark) };
  }

  if (op === "read_select_state" || op === "read_select_options") {
    const stateOf = (select) => {
      const chosen = Array.prototype.slice.call(select.options || []).filter((option) => option.selected === true)[0] || null;
      return {
        value: select.value == null ? "" : String(select.value),
        label: chosen ? String(chosen.textContent || chosen.label || "").replace(/\s+/g, " ").trim() : "",
      };
    };
    // Why the registry and not the selector/index: the read-back has to answer "what does the
    // control that was set hold now?". A selector or an index names a *place*, and the page may
    // have put another control there; an attribute value names a *kind* of control, and the page
    // may have handed that value to another element. The registry holds the node itself, so
    // finding it again is proof that the node is the one that was set — and a clone that replaced
    // it is simply not in the registry.
    const foundForRead = candidates(region);
    if (!foundForRead) {
      return {
        ok: false,
        code: "REGION_NOT_FOUND",
        message: `Region selector matched no element: ${region}`,
        region,
      };
    }
    if (payload.expectedUrl && String(location.href) !== payload.expectedUrl) {
      return {
        ok: false,
        code: "STALE_PAGE_REVISION",
        message: "The tab navigated to a different document; call chrome_read_page again.",
      };
    }
    if (payload.expectedSignature && signatureOf(foundForRead) !== payload.expectedSignature) {
      return {
        ok: false,
        code: "STALE_PAGE_REVISION",
        message: "The page revision changed since the elementRef was issued; call chrome_read_page again.",
        signature: signatureOf(foundForRead),
      };
    }
    const token = typeof payload.selectToken === "string" ? payload.selectToken : "";
    try {
      const registry = selectTokenRegistry();
      if (!registry) {
        return {
          ok: false,
          code: "SELECT_TOKEN_UNAVAILABLE",
          message:
            "This page cannot hold a select identity token, so the select that was set cannot be identified; the applied option could not be verified.",
        };
      }
      const select = selectTokenNode(registry, token);
      if (!select) {
        // The marked node is gone: it was removed, or the page re-rendered and replaced it. Some
        // other control may well sit at the same place now, but it is a different node, so
        // nothing at all can be said about the value that was set. Report *why* it is gone
        // without reading a value from any look-alike.
        return diagnoseMissingSelect(foundForRead, payload);
      }
      // No name comparison: `labelOf` falls back to `innerText` and, for a select, that text is
      // the selected option — it changes precisely because the set succeeded. The registry already
      // pins which node this is about.
      if (op === "read_select_options") {
        const { matches } = matchSelectOptions(select);
        if (matches.length !== 1 || select.multiple || select.disabled || matches[0].disabled ||
            (matches[0].parentElement?.tagName === "OPTGROUP" && matches[0].parentElement.disabled)) {
          return { ok: true, matched: false };
        }
        const label = String(matches[0].textContent || matches[0].label || "").replace(/\s+/g, " ").trim().slice(0, 120);
        return { ok: true, matched: true, ...(label ? { label } : {}) };
      }
      return { ok: true, ...stateOf(select) };
    } finally {
      // The mark lives exactly one operation: it is gone whether the read succeeded or not.
      clearSelectToken(token);
    }
  }

  /**
   * Why the marked node is gone, without reading any value from a look-alike.
   *
   * The marker is what proves the identity, so its absence is the end of the proof: a control that
   * carries the same id is a different control and says nothing about the value that was set.
   * The reason is still worth reporting, so the verdict can say whether the control was removed
   * or replaced by something else.
   */
  function diagnoseMissingSelect(found, payload) {
    const resolved = resolveElement(found, payload, { verifyName: false });
    if (!resolved.element) {
      const code = typeof resolved.code === "string" && resolved.code ? resolved.code : "";
      if (code && code !== "ELEMENT_NOT_FOUND") {
        return {
          ok: false,
          code,
          message: "The element that was set is no longer the same control, so it cannot be confirmed that it is the same control and the applied option could not be verified.",
        };
      }
      return {
        ok: false,
        code: "SELECT_GONE",
        message: "The select that was set is no longer in the page (it was removed or replaced), so it cannot be confirmed that it is the same control and the applied option could not be verified.",
      };
    }
    const tag = String(resolved.element.tagName || "").toLowerCase();
    if (tag !== "select") {
      return {
        ok: false,
        code: "NOT_A_SELECT",
        message: "The target is no longer a native <select>, so it cannot be confirmed that it is the same control and the applied option could not be verified.",
      };
    }
    return {
      ok: false,
      code: "SELECT_GONE",
      message: "Another select now occupies the target, so the select that was set is no longer in the page; it cannot be confirmed that it is the same control and the applied option could not be verified.",
    };
  }

  // One matcher for both preview and execution: exactly one string target, including "".
  function matchSelectOptions(select) {
    const wantedValue = typeof payload.value === "string" ? payload.value : null;
    const wantedLabel = typeof payload.label === "string" ? payload.label : null;
    const allOptions = Array.prototype.slice.call(select.options || []);
    const valid = (wantedValue === null) !== (wantedLabel === null);
    const normalize = (text) => String(text == null ? "" : text).replace(/\s+/g, " ").trim();
    const matches = !valid ? [] : allOptions.filter((option) => wantedValue !== null
      ? String(option.value) === wantedValue
      : normalize(option.textContent || option.label || "") === normalize(wantedLabel));
    return { wantedValue, wantedLabel, allOptions, matches, valid };
  }


  if (op === "set_select_value") {
    const applySelectValue = () => {
      const normalizeOptionText = (value) => String(value == null ? "" : value).replace(/\s+/g, " ").trim();
      const describeOption = (option) => ({
        value: String(option.value),
        label: normalizeOptionText(option.textContent || option.label || ""),
        disabled: Boolean(option.disabled),
      });
      const selectedStateOf = (select) => {
        const chosen = Array.prototype.slice.call(select.options || []).filter((option) => option.selected === true)[0] || null;
        return {
          value: select.value == null ? "" : String(select.value),
          label: chosen ? normalizeOptionText(chosen.textContent || chosen.label || "") : "",
        };
      };

      const found = candidates(region);
      if (!found) {
        return { ok: false, code: "REGION_NOT_FOUND", message: `Region selector matched no element: ${region}`, region };
      }
      if (payload.expectedUrl && String(location.href) !== payload.expectedUrl) {
        return {
          ok: false,
          code: "STALE_PAGE_REVISION",
          message: "The tab navigated to a different document; call chrome_read_page again.",
        };
      }
      if (payload.expectedSignature && signatureOf(found) !== payload.expectedSignature) {
        return {
          ok: false,
          code: "STALE_PAGE_REVISION",
          message: "The page revision changed since the elementRef was issued; call chrome_read_page again.",
          signature: signatureOf(found),
        };
      }
      const resolved = resolveSelectTarget(found, payload);
      // The mark taken before the set is the identity proof: the element this resolution points
      // at has to be the very node that was marked. If it is not, the page moved the target (or
      // swapped the control) in between, and writing the value would change a control nobody
      // addressed — so nothing is written at all.
      const selectToken = typeof payload.selectToken === "string" && payload.selectToken ? payload.selectToken : "";
      if (!selectToken) {
        // No mark means no identity proof. A set without one would write to whichever control the
        // selector names now, so it is refused outright.
        return {
          ok: false,
          code: "SELECT_TOKEN_REQUIRED",
          message:
            "The target select was not marked before the set, so it cannot be identified; the value was not set.",
          signature: signatureOf(found),
        };
      }
      const registry = selectTokenRegistry();
      if (!registry) {
        return {
          ok: false,
          code: "SELECT_TOKEN_UNAVAILABLE",
          message:
            "This page cannot hold a select identity token, so the target select cannot be identified safely; the value was not set.",
          signature: signatureOf(found),
        };
      }
      const marked = selectTokenNode(registry, selectToken);
      if (!marked) {
        // The marked node is gone (removed, re-rendered away) or is no longer a select. A clone
        // that replaced it is a different node and is not in the registry, so it can never be
        // mistaken for the node that was marked.
        return {
          ok: false,
          code: "SELECT_GONE",
          message:
            "The select that was marked before the set is no longer the same node in the page, so the value was not set.",
          signature: signatureOf(found),
        };
      }
      if (resolved.element && resolved.element !== marked) {
        return {
          ok: false,
          code: "SELECT_TARGET_CONFLICT",
          message: "The target resolved to a different control than the one that was marked before the set, so the value was not set on either of them.",
          signature: signatureOf(found),
        };
      }
      if (!resolved.element) {
        return { ok: false, code: resolved.code, message: resolved.message, signature: signatureOf(found) };
      }
      const select = resolved.element;
      const selectTag = String(select.tagName || "").toLowerCase();
      if (selectTag !== "select") {
        return {
          ok: false,
          code: "NOT_A_SELECT",
          message: `The target is a <${selectTag || "unknown"}>, not a native <select>; a custom dropdown must be opened with click and one of its options clicked.`,
          signature: signatureOf(found),
        };
      }
      if (select.disabled) {
        return { ok: false, code: "SELECT_DISABLED", message: "The target <select> is disabled; the value was not set." };
      }
      if (select.multiple) {
        return {
          ok: false,
          code: "SELECT_MULTIPLE_UNSUPPORTED",
          message: "The target <select> accepts multiple selections; only single-choice selects are supported.",
        };
      }

      const { wantedValue, wantedLabel, allOptions, matches, valid } = matchSelectOptions(select);
      if (!valid) {
        return {
          ok: false,
          code: "OPTION_TARGET_REQUIRED",
          message: "Provide exactly one of value or label for the option to select.",
        };
      }

      if (matches.length === 0) {
        return {
          ok: false,
          code: "OPTION_NOT_FOUND",
          message: `No option matched ${
            wantedValue !== null ? `value ${JSON.stringify(wantedValue)}` : `label ${JSON.stringify(wantedLabel)}`
          }.`,
          options: allOptions.slice(0, 20).map(describeOption),
          signature: signatureOf(found),
        };
      }
      if (matches.length > 1) {
        return {
          ok: false,
          code: "OPTION_AMBIGUOUS",
          message: `${matches.length} options carry that label; pass the option value instead, or disambiguate the label.`,
          options: matches.slice(0, 20).map(describeOption),
          signature: signatureOf(found),
        };
      }
      const option = matches[0];
      if (option.disabled) {
        return {
          ok: false,
          code: "OPTION_DISABLED",
          message: `The option ${JSON.stringify(
            normalizeOptionText(option.textContent || option.label || ""),
          )} is disabled and cannot be selected.`,
          signature: signatureOf(found),
        };
      }

      const before = selectedStateOf(select);
      const requested = { value: String(option.value), label: describeOption(option).label };
      try {
        option.selected = true;
        select.value = requested.value;
      } catch (error) {
        return {
          ok: false,
          code: "SELECT_VALUE_NOT_APPLIED",
          message: `Assigning the option failed: ${String((error && error.message) || error)}`,
        };
      }
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
      // Synchronous read-back only: it proves the events were dispatched with the value in place, but
      // NOT that the page kept it (a listener may still revert us). The worker re-reads after a short
      // delay and that second read-back decides the verdict.
      const immediate = selectedStateOf(select);
      return {
        ok: true,
        before,
        immediate,
        requested,
        clickedIndex: allOptions.indexOf(option),
        element: snapshotOf(select),
        signature: signatureOf(candidates(region) || found),
        url: String(location.href),
      };
    };
    let outcome = null;
    try {
      outcome = applySelectValue();
    } catch (error) {
      outcome = {
        ok: false,
        code: "SELECT_VALUE_NOT_APPLIED",
        message: `Assigning the option failed: ${String((error && error.message) || error)}`,
      };
    }
    if (!outcome || outcome.ok !== true) {
      // The operation is over: the marker must not stay on the page.
      clearSelectToken(typeof payload.selectToken === "string" ? payload.selectToken : "");
    }
    return outcome;
  }

  if (op === "rect_row_delete") {
    const keyword = String((payload && payload.keyword) || "");
    const nodes = Array.prototype.slice.call(document.querySelectorAll("div,article,tr"));
    const rows = nodes.filter(function (el) {
      const t = el.textContent || "";
      if (!t.includes("删除作品")) return false;
      if (keyword && !t.includes(keyword)) return false;
      return true;
    });
    if (!rows.length) return { ok: false, code: "NO_ROW", message: "No row matched keyword + delete button" };
    rows.sort(function (a, b) {
      return (a.textContent || "").length - (b.textContent || "").length;
    });
    const row = rows[0];
    const btns = Array.prototype.slice.call(row.querySelectorAll("span,div,button,a"));
    const btn = btns.filter(function (el) {
      return (el.textContent || "").trim() === "删除作品" && el.children.length <= 1;
    })[0];
    if (!btn) return { ok: false, code: "NO_BTN", message: "Delete label not found inside row" };
    try {
      btn.scrollIntoView({ block: "center", behavior: "instant" });
    } catch (_) {
      try { btn.scrollIntoView(); } catch (__) {}
    }
    const rr = row.getBoundingClientRect();
    const r = btn.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return { ok: false, code: "BTN_INVISIBLE", message: "Delete button has zero size" };
    return {
      ok: true,
      x: Math.round(r.left + r.width / 2),
      y: Math.round(r.top + r.height / 2),
      rowX: Math.round(rr.left + rr.width / 2),
      rowY: Math.round(rr.top + rr.height / 2),
      title: (row.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60),
    };
  }

  if (op === "rect_confirm_button") {
    const wanted = String((payload && payload.text) || "确定");
    const all = Array.prototype.slice.call(document.querySelectorAll("button, span, div"));
    const cands = all.filter(function (el) {
      if ((el.textContent || "").trim() !== wanted) return false;
      if (el.children.length > 0) return false;
      const r = el.getBoundingClientRect();
      if (!r || r.width <= 0 || r.height <= 0) return false;
      const modal = el.closest('[class*="modal" i], [class*="dialog" i], [class*="popconfirm" i], [role="dialog"]');
      return Boolean(modal);
    });
    if (!cands.length) return { ok: false, code: "NO_CONFIRM", message: "Confirm label not found inside any modal" };
    const leaf = cands[cands.length - 1];
    const clickable = leaf.closest("button") || leaf;
    const r = clickable.getBoundingClientRect();
    return {
      ok: true,
      x: Math.round(r.left + r.width / 2),
      y: Math.round(r.top + r.height / 2),
      tag: clickable.tagName,
      cls: String(clickable.className || "").slice(0, 90),
    };
  }

  if (op === "hit_test") {
    const x = Math.round(Number((payload && payload.x) || 0));
    const y = Math.round(Number((payload && payload.y) || 0));
    const el = document.elementFromPoint(x, y);
    if (!el) return { ok: false, code: "NOTHING_AT_POINT", x, y };
    const chain = [];
    let n = el;
    for (let i = 0; i < 4 && n; i++) {
      chain.push(String(n.tagName) + "." + String(n.className || "").split(" ")[0]);
      n = n.parentElement;
    }
    return {
      ok: true,
      x,
      y,
      tag: el.tagName,
      cls: String(el.className || "").slice(0, 100),
      text: (el.textContent || "").trim().slice(0, 60),
      chain: chain.join(" < "),
    };
  }

  if (op === "click_row_delete") {
    const keyword = String((payload && payload.keyword) || "");
    const nodes = Array.prototype.slice.call(document.querySelectorAll("div,article,tr"));
    const rows = nodes.filter(function (el) {
      const t = el.textContent || "";
      if (!t.includes("删除作品")) return false;
      if (keyword && !t.includes(keyword)) return false;
      return true;
    });
    if (!rows.length) return { ok: false, code: "NO_ROW", message: "No row matched keyword + delete label" };
    rows.sort(function (a, b) { return (a.textContent || "").length - (b.textContent || "").length; });
    const row = rows[0];
    const btns = Array.prototype.slice.call(row.querySelectorAll("span,div,button,a"));
    const btn = btns.filter(function (el) {
      return (el.textContent || "").trim() === "删除作品" && el.children.length <= 1;
    })[0];
    if (!btn) return { ok: false, code: "NO_BTN", message: "Delete label not found inside row" };
    try { btn.scrollIntoView({ block: "center", behavior: "instant" }); } catch (_) { try { btn.scrollIntoView(); } catch (__) {} }
    const opts = { bubbles: true, cancelable: true, view: window, button: 0, composed: true };
    try {
      btn.dispatchEvent(new PointerEvent("pointerdown", opts));
      btn.dispatchEvent(new MouseEvent("mousedown", opts));
      btn.dispatchEvent(new PointerEvent("pointerup", opts));
      btn.dispatchEvent(new MouseEvent("mouseup", opts));
    } catch (_) {}
    try { btn.click(); } catch (_) {}
    return { ok: true, title: (row.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60), tag: btn.tagName };
  }

  if (op === "click_confirm") {
    const wanted = String((payload && payload.text) || "确定");
    const all = Array.prototype.slice.call(document.querySelectorAll("button, span, div"));
    const leaves = all.filter(function (el) {
      if ((el.textContent || "").trim() !== wanted) return false;
      if (el.children.length > 0) return false;
      return Boolean(el.closest('[class*="modal" i], [class*="dialog" i], [role="dialog"]'));
    });
    if (!leaves.length) return { ok: false, code: "NO_CONFIRM", message: "Confirm label not found inside any modal" };
    const leaf = leaves[leaves.length - 1];
    const target = leaf.closest("button") || leaf;
    const opts = { bubbles: true, cancelable: true, view: window, button: 0, composed: true };
    try {
      target.dispatchEvent(new PointerEvent("pointerdown", opts));
      target.dispatchEvent(new MouseEvent("mousedown", opts));
      target.dispatchEvent(new PointerEvent("pointerup", opts));
      target.dispatchEvent(new MouseEvent("mouseup", opts));
    } catch (_) {}
    try { target.click(); } catch (_) {}
    return { ok: true, tag: target.tagName, text: (target.textContent || "").trim().slice(0, 20) };
  }

  if (op === "press") {
    const key = String((payload && payload.key) || "");
    // Re-check the focused control: the page can move focus between the worker's decision and this dispatch.
    if (typeof payload.expectedActiveName === "string" && payload.expectedActiveName) {
      const current = activeControl();
      const currentName = current ? labelOf(current) : "";
      if (currentName !== payload.expectedActiveName) {
        return {
          ok: false,
          code: "STALE_PAGE_REVISION",
          message: "The focused control changed since it was checked; re-read the page and retry.",
        };
      }
    }
    const root = document.body || document.documentElement;
    const pressTarget = document.activeElement || root;
    const before = {
      url: String(location.href),
      textLength: textOf(root).length,
      exists: true,
    };
    if (pressTarget && typeof pressTarget.dispatchEvent === "function") {
      pressTarget.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
      pressTarget.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true }));
    }
    return {
      ok: true,
      before,
      after: { url: String(location.href), textLength: textOf(root).length, exists: true },
      pressed: key,
    };
  }

  if (op === "scroll") {
    const deltaX = Number((payload && payload.deltaX) || 0);
    const deltaY = Number((payload && payload.deltaY) || 0);
    const measure = (element) => ({
      scrollTop: element.scrollTop,
      scrollLeft: element.scrollLeft,
      scrollHeight: element.scrollHeight,
      scrollWidth: element.scrollWidth,
      clientHeight: element.clientHeight,
      clientWidth: element.clientWidth,
    });

    let target = null;
    if (typeof payload?.selector === "string") {
      let matches;
      try {
        matches = document.querySelectorAll(payload.selector);
      } catch (error) {
        return { ok: false, code: "INVALID_SELECTOR", message: String(error?.message || error) };
      }
      if (matches.length === 0) {
        return { ok: false, code: "ELEMENT_NOT_FOUND", message: `Element not found: ${payload.selector}` };
      }
      if (matches.length !== 1) {
        return { ok: false, code: "AMBIGUOUS_SELECTOR", message: `Selector matched ${matches.length} elements: ${payload.selector}` };
      }
      target = matches[0];
    }

    const before = { scrollX: window.scrollX, scrollY: window.scrollY };
    if (target) {
      const targetBefore = measure(target);
      if (deltaX !== 0 || deltaY !== 0) {
        target.scrollBy({ left: deltaX, top: deltaY, behavior: "instant" });
      }
      const targetAfter = measure(target);
      return {
        ok: true,
        before: { ...before, target: targetBefore },
        after: { scrollX: window.scrollX, scrollY: window.scrollY, target: targetAfter },
        targetBefore,
        targetAfter,
        target: { tagName: target.tagName, id: target.id || "" },
        scrollX: window.scrollX,
        scrollY: window.scrollY,
      };
    }

    // Keep legacy viewport-first behavior, but report actual movement for every internal scroller.
    window.scrollBy(deltaX, deltaY);
    const candidates = Array.from(document.querySelectorAll("*")).filter((element) => {
      const style = window.getComputedStyle(element);
      const scrollsY = (style.overflowY === "auto" || style.overflowY === "scroll") && element.scrollHeight > element.clientHeight;
      const scrollsX = (style.overflowX === "auto" || style.overflowX === "scroll") && element.scrollWidth > element.clientWidth;
      return scrollsX || scrollsY;
    });
    const containersBefore = candidates.map(measure);
    if (window.scrollY === before.scrollY && (deltaY !== 0 || deltaX !== 0)) {
      for (const element of candidates) element.scrollBy(deltaX, deltaY);
    }
    const changedContainers = [];
    let containersTotal = 0;
    for (let index = 0; index < candidates.length; index += 1) {
      const after = measure(candidates[index]);
      const beforePosition = containersBefore[index];
      if (beforePosition.scrollTop === after.scrollTop && beforePosition.scrollLeft === after.scrollLeft) continue;
      containersTotal += 1;
      if (changedContainers.length < 5) changedContainers.push({ before: beforePosition, after });
    }
    return {
      ok: true,
      before,
      after: {
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        scrolledContainer: containersTotal > 0,
        containers: changedContainers,
        containersTotal,
      },
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    };
  }

  if (op === "prepare_set_files") {
    let target = null;
    let signature = "";
    if (payload.selector) {
      let bySelector = null;
      try {
        bySelector = document.querySelector(payload.selector);
      } catch (error) {
        return {
          ok: false,
          code: "INVALID_SELECTOR",
          message: `Invalid selector '${payload.selector}': ${
            error && error.message ? error.message : String(error)
          }`,
        };
      }
      if (!bySelector) {
        return { ok: false, code: "ELEMENT_NOT_FOUND", message: `Element not found: ${payload.selector}` };
      }
      target = bySelector;
    } else {
      const found = candidates(region);
      if (!found) {
        return {
          ok: false,
          code: "REGION_NOT_FOUND",
          message: `Region selector matched no element: ${region}`,
        };
      }
      if (payload.expectedUrl && payload.expectedUrl !== String(location.href)) {
        return {
          ok: false,
          code: "STALE_PAGE_REVISION",
          message: "The tab navigated to a different document; call chrome_read_page again.",
        };
      }
      if (payload.expectedSignature && signatureOf(found) !== payload.expectedSignature) {
        return {
          ok: false,
          code: "STALE_PAGE_REVISION",
          message: "The page revision changed since the elementRef was issued; call chrome_read_page again.",
        };
      }
      const resolved = resolveElement(found, payload);
      if (!resolved.element) {
        return { ok: false, code: resolved.code, message: resolved.message, signature: signatureOf(found) };
      }
      target = resolved.element;
      signature = signatureOf(found);
    }

    if (target.disabled) {
      return {
        ok: false,
        code: "ELEMENT_DISABLED",
        message: "The target element is disabled; files were not set.",
      };
    }

    const tag = String(target.tagName || "").toLowerCase();
    const inputType = tag === "input" ? String(target.type || "").toLowerCase() : "";
    if (tag !== "input" || inputType !== "file") {
      return {
        ok: false,
        code: "NOT_FILE_INPUT",
        message: `Target element is <${tag}${inputType ? ` type="${inputType}"` : ""}>, not an <input type="file">. File upload requires an <input type="file"> element.`,
      };
    }

    const marker = "nolo_upload_" + Math.random().toString(36).slice(2, 11);
    target.setAttribute("data-nolo-upload-id", marker);
    return {
      ok: true,
      selector: `[data-nolo-upload-id="${marker}"]`,
      marker,
      signature,
      url: String(location.href),
    };
  }

  if (op === "clear_select_token") {
    // The marker's lifetime is one operation; this op is how the worker takes it off the page on
    // every path, including the ones where the set itself never ran.
    const token = String((payload && payload.selectToken) || "");
    const removed = clearSelectToken(token);
    return { ok: true, removed };
  }

  if (op === "cleanup_marker") {
    const marker = String((payload && payload.marker) || "");
    if (marker) {
      const el = document.querySelector(`[data-nolo-upload-id="${marker}"]`);
      if (el) el.removeAttribute("data-nolo-upload-id");
    }
    return { ok: true };
  }

  return { ok: false, code: "UNSUPPORTED_PAGE_OP", message: `Unsupported page operation: ${op}` };
}

/** Action verdicts are explicit: `effect` (and `verified`) is the authority, never `ok` alone. */
function verdictEnvelope(action, verification, extra = {}, options = {}) {
  // `ok` is a promise about the outcome, not just "did not fail". Selects are strict: only a
  // read-back that matches the requested option may answer ok, so an unreadable/unverifiable select
  // (status `uncertain`) reports ok:false with an explicit code instead of passing as success.
  const ok = options.okRequiresVerified === true
    ? verification.status === "verified"
    : verification.status !== "failed";
  // Only strict verdicts carry a `code`: their callers need to tell "unverifiable" from "rejected".
  const failureCode = !ok && options.okRequiresVerified === true
    ? (typeof verification.code === "string" && verification.code) ||
      (typeof verification.signal === "string" ? verification.signal : "")
    : "";
  return {
    ok,
    verified: verification.status === "verified",
    effect: verification.status,
    action,
    signal: verification.signal,
    ...(failureCode ? { code: failureCode } : {}),
    ...(verification.message ? { message: verification.message } : {}),
    ...extra,
  };
}

/** Selector targets carry no cached name, so the page is asked what the element is before acting. */
async function inspectSelectorTarget(tabId, selector) {
  const inspected = await executeInTab(tabId, pageOperation, [{ op: "inspect", selector }]);
  if (!inspected || inspected.ok !== true) {
    const code = typeof inspected?.code === "string" && inspected.code ? inspected.code : "ELEMENT_INSPECTION_FAILED";
    throw connectorError(code, inspected?.message || "The target element could not be inspected before acting.");
  }
  return {
    name: String(inspected.name ?? ""),
    tag: String(inspected.tag ?? ""),
    role: String(inspected.role ?? ""),
    type: String(inspected.type ?? ""),
    _frameId: inspected._frameId,
  };
}

/** The same question for the focused element, used before Enter-like key presses. */
async function inspectActiveTarget(tabId) {
  try {
    const inspected = await executeInTab(tabId, pageOperation, [{ op: "inspect", subject: "active" }]);
    if (inspected && inspected.ok === true) {
      return {
        name: String(inspected.name ?? ""),
        tag: String(inspected.tag ?? ""),
        role: String(inspected.role ?? ""),
        type: String(inspected.type ?? ""),
        _frameId: inspected._frameId,
      };
    }
  } catch (error) {
    if (error?.code !== "TARGET_NOT_FOUND") throw error;
    // Pressing a key with nothing inspectable is not an irreversible action.
  }
  return { name: "", tag: "", role: "", type: "" };
}

async function verifyConsentAndDrift({ action, tabId, payload, target, refusal }) {
  const approvalId = normalizeApprovalId(payload?.approvalId);
  if (!approvalId) {
    // Nothing is authorized without a user decision. A prepared action records intent only, so a
    // prepareId / challengeId / grantTicket arriving here is handled exactly like no credential:
    // the user is asked now and the caller gets `USER_APPROVAL_PENDING`.
    return await requestUserApproval({ action, tabId, payload, target, refusal });
  }

  const record = await getApprovalRecord(approvalId);
  const consumption = await consumeApprovalCredential({ approvalId, record, action });
  if (consumption.verdict) return consumption.verdict;

  if (String(record.tabId) !== String(tabId)) {
    return {
      ok: false,
      code: "STALE_ACTION_CHALLENGE",
      signal: "STALE_ACTION_CHALLENGE",
      effect: "failed",
      action,
      verified: false,
      message: `Consent challenge tab (${record.tabId}) does not match current tab (${tabId}).`,
    };
  }

  if (String(record.action) !== String(action)) {
    return {
      ok: false,
      code: "STALE_ACTION_CHALLENGE",
      signal: "STALE_ACTION_CHALLENGE",
      effect: "failed",
      action,
      verified: false,
      message: `Consent challenge action (${record.action}) does not match requested action (${action}).`,
    };
  }

  // Drift check: execute in-tab DOM capture to re-evaluate current DOM state
  const captureOptions = {
    rejectAsResult: true,
    _frameId: target?.kind === "ref" ? 0 : target?._frameId,
  };
  if (payload.active === true || target?.kind === "active" || (action === "press" && !payload.selector && !target?.selector)) {
    captureOptions.active = true;
  } else if (typeof target?.selector === "string" && target.selector.trim()) {
    captureOptions.selector = target.selector.trim();
  } else if (typeof payload.selector === "string" && payload.selector.trim()) {
    captureOptions.selector = payload.selector.trim();
  }

  let currentCapture;
  try {
    currentCapture = await executeInTab(tabId, captureBrowserConsentState, [captureOptions]);
  } catch (error) {
    return {
      ok: false,
      code: "DOM_MUTATED",
      signal: "DOM_MUTATED",
      effect: "failed",
      action,
      verified: false,
      message: `Failed to capture DOM state for consent verification: ${toMessage(error)}`,
    };
  }

  if (!currentCapture || currentCapture.ok === false) {
    return {
      ok: false,
      code: "DOM_MUTATED",
      signal: "DOM_MUTATED",
      effect: "failed",
      action,
      verified: false,
      message: currentCapture?.message || "DOM state verification failed.",
    };
  }

  // RefRegistry pageRevision check
  const registrySnapshot = refRegistry.snapshot(tabId);
  const currentPageRevision = String(registrySnapshot?.pageRevision || currentCapture.document?.pageRevision || "").trim();

  const actionArgs = buildPrepareArgs({
    action,
    targetMetadata: currentCapture.target,
    formSnapshot: currentCapture.form,
    payload,
  });

  const currentSnapshotInput = {
    document: {
      documentId: currentCapture.document?.documentId,
      url: currentCapture.document?.url,
      pageRevision: currentPageRevision,
    },
    tabId: String(tabId),
    target: {
      targetId: currentCapture.target?.targetId,
      tag: currentCapture.target?.tag,
      name: currentCapture.target?.name,
    },
    action: {
      action,
      args: actionArgs,
    },
    form: currentCapture.form?.fields || null,
    owner: record.owner,
    dialogId: record.dialogId,
  };

  let currentFingerprint;
  try {
    const fpRes = await createActionFingerprint(currentSnapshotInput);
    currentFingerprint = fpRes.fingerprint;
  } catch (error) {
    return {
      ok: false,
      code: "DOM_MUTATED",
      signal: "DOM_MUTATED",
      effect: "failed",
      action,
      verified: false,
      message: `Fingerprint re-computation failed: ${toMessage(error)}`,
    };
  }

  if (currentFingerprint !== record.fingerprint) {
    return {
      ok: false,
      code: "DOM_MUTATED",
      signal: "DOM_MUTATED",
      effect: "failed",
      action,
      verified: false,
      message: "DOM state has mutated since action preparation; challenge invalidated.",
    };
  }

  return null;
}

/**
 * Mark the select a set is about to target, before its value changes.
 *
 * The mark is a one-shot entry in the page world's registry, pointing at that very node, and it is
 * the only proof available later that the read-back is looking at the same control: an id or a
 * name can be handed to another element, a clone copies every attribute, and a value that merely
 * compares equal says nothing about which node was addressed.
 *
 * A failed mark is *not* a soft failure: the caller must not go on to set the value without it,
 * because a set without an identity proof writes to whichever control the selector names now.
 */
async function captureSelectToken(tabId, pageArgs) {
  let result = null;
  try {
    result = await executeInTab(tabId, pageOperation, [
      { ...pageArgs, op: "mark_select_token" },
    ]);
  } catch (error) {
    return {
      ok: false,
      token: null,
      code: "SELECT_TOKEN_FAILED",
      message: `The target select could not be marked, so it cannot be identified; the value was not set: ${toMessage(
        error,
      )}`,
    };
  }
  if (!result || result.ok !== true) {
    return {
      ok: false,
      token: null,
      code:
        typeof result?.code === "string" && result.code
          ? result.code
          : "SELECT_TOKEN_FAILED",
      message:
        typeof result?.message === "string" && result.message
          ? `${result.message} The value was not set.`
          : "The target select could not be marked, so it cannot be identified; the value was not set.",
    };
  }
  const token = result.token;
  if (!token || typeof token !== "string") {
    return {
      ok: false,
      token: null,
      code: "SELECT_TOKEN_FAILED",
      message:
        "The target select could not be marked, so it cannot be identified; the value was not set.",
    };
  }
  return { ok: true, token };
}

/** Take the marker off the page again — on every path, successful or not. */
async function clearSelectToken(tabId, token, frameId) {
  if (!token || typeof token !== "string") return;
  try {
    await executeInTab(tabId, pageOperation, [{ op: "clear_select_token", selectToken: token, _frameId: frameId }]);
  } catch (_) {
    // Best effort: when the page is gone, the marker is gone with it.
  }
}

/** How long the page gets to run its listeners and re-render before the select is read back. */
const SELECT_SETTLE_MS = 60;

/**
 * Second look at a select after its value was set. It deliberately ignores page revisions: a
 * dependent select re-rendering is a legitimate consequence of the choice, and the only question
 * here is what this select holds now. A select that vanished or is unreadable answers `null`, which
 * the verifier reports as uncertain rather than success.
 */
async function readSelectStateAfterSettle(tabId, target, pageArgs) {
  await new Promise((resolve) => setTimeout(resolve, SELECT_SETTLE_MS));
  const readBackArgs = { op: "read_select_state", _frameId: pageArgs._frameId };
  // The marker is the only address the read-back uses: it names the node, not a kind of control.
  // The selector/index are still carried along, but only to explain *why* the marked node is gone
  // if it disappeared — never to read a value from another control.
  if (pageArgs.selectToken) readBackArgs.selectToken = pageArgs.selectToken;
  if (target.kind === "selector") {
    readBackArgs.selector = target.selector;
  } else {
    if (pageArgs.region) readBackArgs.region = pageArgs.region;
    readBackArgs.index = pageArgs.index;
    readBackArgs.expectedTag = pageArgs.expectedTag;
    // Carried for context only: `read_select_state` resolves with `verifyName: false`, because the
    // label of a select is its selected option and this read happens after that option changed.
    readBackArgs.expectedName = pageArgs.expectedName;
  }
  let state = null;
  try {
    state = await executeInTab(tabId, pageOperation, [readBackArgs]);
  } catch (_) {
    state = null;
  }
  if (!state || state.ok !== true) {
    // Keep the page's own reason (SELECT_GONE / NOT_A_SELECT) so the verdict can say why the
    // read-back failed instead of a generic "unverified".
    const code = state && typeof state.code === "string" && state.code ? state.code : "";
    return { value: null, label: "", code };
  }
  return {
    value: state.value == null ? "" : String(state.value),
    label: typeof state.label === "string" ? state.label : "",
  };
}

async function runTargetedAction(action, payload) {  const tabId = String(payload.tabId);
  const target = resolveActionTarget(payload, refRegistry, { tabId, action });
  if (!target.ok) {
    return { ok: false, verified: false, effect: "failed", action, signal: target.code, message: target.message };
  }

  // Irreversible external actions never run on the agent's word alone: the gate stops the page
  // effect and the user is asked in their own window. Only an approved, single-use credential lets
  // the same action through on a later retry.
  let gateTarget;
  if (target.kind === "ref") {
    gateTarget = {
      // refRegistry observations are registered only for the top-level document.
      _frameId: 0,
      name: target.expect?.name ?? "",
      tag: target.expect?.tag ?? "",
      role: target.expect?.role ?? "",
      type: target.expect?.type ?? "",
    };
  } else {
    try {
      gateTarget = await inspectSelectorTarget(payload.tabId, target.selector);
    } catch (error) {
      return {
        ok: false,
        verified: false,
        effect: "failed",
        action,
        signal: error?.code || "ELEMENT_INSPECTION_FAILED",
        message: toMessage(error),
        selector: target.selector,
      };
    }
  }
  target._frameId = gateTarget._frameId;
  const refusal = decideIrreversibleAction({
    action,
    name: gateTarget.name,
    tag: gateTarget.tag,
    role: gateTarget.role,
    type: gateTarget.type,
  });
  if (refusal) {
    const consentVerdict = await verifyConsentAndDrift({
      action,
      tabId,
      payload,
      target,
      refusal,
    });
    if (consentVerdict) return consentVerdict;
  }

  const resolveExtra = target.kind === "ref" ? { ref: target.ref } : { selector: target.selector };
  const pageArgs = { op: action, _frameId: gateTarget._frameId };
  if (target.kind === "ref") {
    pageArgs.region = target.expect.region || "";
    pageArgs.expectedUrl = target.expect.url;
    pageArgs.expectedSignature = target.expect.signature;
    pageArgs.index = target.expect.index;
    pageArgs.expectedTag = target.expect.tag;
    pageArgs.expectedName = target.expect.name;
  } else {
    pageArgs.selector = target.selector;
    // The page re-verifies this before acting, so a swap between inspection and action fails closed.
    if (gateTarget.name) pageArgs.expectedName = gateTarget.name;
  }
  if (action === "type") {
    pageArgs.text = typeof payload.text === "string" ? payload.text : "";
    pageArgs.clearFirst = payload.clearFirst !== false;
  }
  if (action === "set_select_value") {
    if (typeof payload.value === "string") pageArgs.value = payload.value;
    if (typeof payload.label === "string") pageArgs.label = payload.label;
    // Mark the target before the value changes: the mark is the only proof that the read-back is
    // looking at the very same node, even when the page re-renders around it while settling.
    // A mark that did not succeed stops the set right here — without it the set would write to
    // whichever control the selector names now, and the read-back could prove nothing.
    const mark = await captureSelectToken(payload.tabId, pageArgs);
    if (!mark.ok) {
      return verdictEnvelope(
        "set_select_value",
        { status: "failed", signal: mark.code, message: mark.message },
        resolveExtra,
        { okRequiresVerified: true },
      );
    }
    pageArgs.selectToken = mark.token;
  }

  try {
    let result;
    try {
      result = await executeInTab(payload.tabId, pageOperation, [pageArgs]);
    } catch (error) {
      if (error?.code === PROTECTED_PAGE_CODE) {
        return {
          ok: false,
          verified: false,
          effect: "failed",
          action,
          signal: PROTECTED_PAGE_CODE,
          message: toMessage(error),
          ...resolveExtra,
        };
      }
      refRegistry.invalidate(tabId);
      return verdictEnvelope(
        action,
        {
          status: "uncertain",
          signal: "page_context_destroyed",
          message: `The page navigated or its frame was replaced while the action ran (${toMessage(
            error,
          )}). Re-read the page before acting again.`,
        },
        resolveExtra,
        { okRequiresVerified: action === "set_select_value" },
      );
    }

    let pageResult = result;
    if (action === "set_select_value" && result && result.ok === true) {
      pageResult = { ...result, after: await readSelectStateAfterSettle(payload.tabId, target, pageArgs) };
    }

    const verification =
      action === "set_select_value"
        ? verifySelectValueEffect({ result: pageResult })
        : verifyActionEffect({
            action,
            target: target.kind === "ref" ? { name: target.expect.name } : undefined,
            expected: action === "type" ? { text: pageArgs.text, clearFirst: pageArgs.clearFirst } : undefined,
            result,
          });

    if (result && typeof result.signature === "string" && result.signature) {
      refRegistry.notePageChanged({ tabId, signature: result.signature, url: result.url });
    }

    return verdictEnvelope(action, verification, {
      ...resolveExtra,
      ...(action === "set_select_value" && pageResult
        ? {
            // Report what the select holds after the page settled, not what was requested.
            value: pageResult.after && pageResult.after.value != null ? String(pageResult.after.value) : "",
            label: pageResult.after && typeof pageResult.after.label === "string" ? pageResult.after.label : "",
          }
        : {}),
      ...(result?.hitElement ? { hitElement: result.hitElement } : {}),
      ...(result && typeof result.signature === "string" && result.signature
        ? { pageRevision: buildPageRevision(result.signature) }
        : {}),
    }, { okRequiresVerified: action === "set_select_value" });
  } finally {
    // The marker must never outlive the operation: on every path it comes off the page again.
    if (action === "set_select_value") {
      await clearSelectToken(payload.tabId, pageArgs.selectToken, pageArgs._frameId);
    }
  }
}

async function handleSetFiles(payload = {}) {
  const tabId = String(payload.tabId ?? "");
  if (!tabId) {
    return verdictEnvelope("set_files", {
      status: "failed",
      signal: "TAB_ID_REQUIRED",
      message: "Provide the tabId before calling set_files.",
    });
  }

  const files = Array.isArray(payload.files) ? payload.files : [];
  if (files.length === 0) {
    return verdictEnvelope("set_files", {
      status: "failed",
      signal: "NO_FILES",
      message: "Provide at least one file to upload.",
    });
  }

  const target = resolveActionTarget(payload, refRegistry, { tabId, action: "set_files" });
  if (!target.ok) {
    return verdictEnvelope("set_files", {
      status: "failed",
      signal: target.code,
      message: target.message,
    });
  }

  const resolveExtra = target.kind === "ref" ? { ref: target.ref } : { selector: target.selector };

  const pageArgs = { op: "prepare_set_files" };
  if (target.kind === "ref") {
    pageArgs.region = target.expect.region || "";
    pageArgs.expectedUrl = target.expect.url;
    pageArgs.expectedSignature = target.expect.signature;
    pageArgs.index = target.expect.index;
    pageArgs.expectedTag = target.expect.tag;
    pageArgs.expectedName = target.expect.name;
  } else {
    pageArgs.selector = target.selector;
  }

  let prep;
  try {
    prep = await executeInTab(tabId, pageOperation, [pageArgs]);
  } catch (error) {
    if (error?.code === PROTECTED_PAGE_CODE) {
      return verdictEnvelope(
        "set_files",
        {
          status: "failed",
          signal: PROTECTED_PAGE_CODE,
          message: toMessage(error),
        },
        resolveExtra,
      );
    }
    refRegistry.invalidate(tabId);
    return verdictEnvelope(
      "set_files",
      {
        status: "uncertain",
        signal: "page_context_destroyed",
        message: `The page navigated or its frame was replaced while set_files ran (${toMessage(
          error,
        )}). Re-read the page before acting again.`,
      },
      resolveExtra,
    );
  }

  if (!prep || prep.ok !== true) {
    return verdictEnvelope(
      "set_files",
      {
        status: "failed",
        signal: prep?.code || "TARGET_RESOLUTION_FAILED",
        message: prep?.message || "The target element could not be prepared for file upload.",
      },
      resolveExtra,
    );
  }

  const cdpSelector = prep.selector;
  const marker = prep.marker;
  const targetObj = tabTarget(tabId);

  try {
    await ensureDebugger(tabId);
    const doc = await chrome.debugger.sendCommand(targetObj, "DOM.getDocument");
    const rootNodeId = doc?.root?.nodeId;
    if (!rootNodeId) {
      return verdictEnvelope(
        "set_files",
        {
          status: "failed",
          signal: "CDP_DOC_FAILED",
          message: "Failed to get document root from Chrome debugger.",
        },
        resolveExtra,
      );
    }

    const queryResult = await chrome.debugger.sendCommand(targetObj, "DOM.querySelector", {
      nodeId: rootNodeId,
      selector: cdpSelector,
    });
    const nodeId = queryResult?.nodeId;
    if (!nodeId || nodeId === 0) {
      return verdictEnvelope(
        "set_files",
        {
          status: "failed",
          signal: "ELEMENT_NOT_FOUND",
          message: `DOM.querySelector found no node for target: ${
            target.kind === "ref" ? target.ref : target.selector
          }.`,
        },
        resolveExtra,
      );
    }

    await chrome.debugger.sendCommand(targetObj, "DOM.setFileInputFiles", {
      nodeId,
      files,
    });

    if (prep.signature) {
      refRegistry.notePageChanged({ tabId, signature: prep.signature, url: prep.url });
    }

    return verdictEnvelope(
      "set_files",
      {
        status: "verified",
        signal: "files_set",
      },
      {
        files,
        count: files.length,
        ...resolveExtra,
        ...(prep.signature ? { pageRevision: buildPageRevision(prep.signature) } : {}),
      },
    );
  } catch (error) {
    const msg = toMessage(error);
    const isNotFileInput = msg.includes("Node is not a file input element");
    return verdictEnvelope(
      "set_files",
      {
        status: "failed",
        signal: isNotFileInput ? "NOT_FILE_INPUT" : "SET_FILES_FAILED",
        message: isNotFileInput
          ? `Target element is not an <input type="file">: ${msg}`
          : `DOM.setFileInputFiles failed: ${msg}`,
      },
      resolveExtra,
    );
  } finally {
    scheduleDetach(tabId);
    if (marker) {
      void executeInTab(tabId, pageOperation, [{ op: "cleanup_marker", marker }]).catch(() => {});
    }
  }
}

async function handleAction(action, payload = {}) {
  switch (action) {
    case "connector_info": {
      return {
        extensionId: chrome.runtime.id,
        version: chrome.runtime.getManifest().version,
        hostName: HOST_NAME,
        protocolVersion: CONNECTOR_PROTOCOL_VERSION,
        // Advertise only what this browser can actually run: without chrome.debugger the
        // debugger-backed features are filtered out so the desktop client refuses those tools
        // up front instead of discovering the gap mid-task. `file_upload` is CDP-backed
        // (DOM.setFileInputFiles) — the set_files handler is gated on HAS_DEBUGGER, so the
        // advertised features must drop it too or the desktop would believe uploads work.
        features: CONNECTOR_FEATURES.filter(
          (feature) =>
            HAS_DEBUGGER || (feature !== "browser_debug" && feature !== "file_upload"),
        ),
      };
    }
    case "list_tabs": {
      await loadOpenedTabs();
      const tabs = await chrome.tabs.query({});
      // The connector's own pages (the approval popup above all) are never listed: their URL carries
      // the approvalId + nonce and `serializeTab` would also hand out the windowId, which is exactly
      // what an approval decision is bound to. Not a page the agent has any business in.
      // `getURL("")` is the browser's own origin for extension pages — `chrome-extension://<id>/`
      // on Chrome, `moz-extension://<uuid>/` on Firefox — so the same filter works on both.
      const ownOrigin = typeof chrome?.runtime?.getURL === "function" ? chrome.runtime.getURL("") : "";
      return {
        tabs: tabs
          .filter((tab) => !isOwnExtensionPage(String(tab?.url || ""), ownOrigin))
          .map((tab) => ({
            ...serializeTab(tab),
            openedByConnector: openedTabs.has(tab.id),
          })),
      };
    }
    case "open_tab": {
      const tab = await chrome.tabs.create({
        url: String(payload.url || "about:blank"),
        active: payload.active !== false,
      });
      await loadOpenedTabs();
      openedTabs.add(tab.id);
      await persistOpenedTabs();
      return { tab: { ...serializeTab(tab), openedByConnector: true } };
    }
    case "read_page": {
      const region = String(payload.region || payload.selector || "");
      const raw = await executeInTab(payload.tabId, pageOperation, [
        {
          op: "read",
          region,
          includeHtml: payload.detail === "full",
          viewportOnly: payload.viewportOnly === true,
        },
      ]);
      const observation = buildCompactObservation(raw, {
        region,
        detail: payload.detail,
        maxChars: payload.maxChars,
        maxElements: payload.maxElements,
        offset: payload.offset,
      });
      if (!observation.ok) return observation;
      refRegistry.remember({
        tabId: String(payload.tabId),
        pageRevision: observation.pageRevision,
        signature: typeof raw?.signature === "string" ? raw.signature : "",
        region,
        url: observation.url,
        textLength: typeof raw?.text === "string" ? raw.text.length : 0,
        elementCount: observation.elementCount,
        elements: Array.isArray(raw?.elements) ? raw.elements : [],
      });
      return observation;
    }
    case "prepare_browser_action":
      return await handlePrepareBrowserAction(payload, {
        refRegistry,
        executeInTab,
        captureBrowserConsentState,
        createActionFingerprint,
        store: preparedActionStore,
        createError: connectorError,
      });
    case "click":
      return await runTargetedAction("click", payload);
    case "type":
      return await runTargetedAction("type", payload);
    case "set_select_value": {
      const hasValue = typeof payload.value === "string";
      const hasLabel = typeof payload.label === "string";
      if (hasValue === hasLabel) {
        return verdictEnvelope("set_select_value", {
          status: "failed",
          signal: "OPTION_TARGET_REQUIRED",
          message: "Provide exactly one of value or label for the option to select.",
        }, {}, { okRequiresVerified: true });
      }
      if (!String(payload.tabId ?? "").trim()) {
        return verdictEnvelope("set_select_value", {
          status: "failed",
          signal: "TAB_ID_REQUIRED",
          message: "Provide the tabId before calling set_select_value.",
        }, {}, { okRequiresVerified: true });
      }
      // Goes through runTargetedAction so ref freshness, the irreversible-action gate and the
      // page-revision bookkeeping are the very same code path as click/type.
      return await runTargetedAction("set_select_value", payload);
    }
    case "set_files": {
      if (!HAS_DEBUGGER) {
        return verdictEnvelope("set_files", {
          status: "failed",
          signal: DEBUGGER_UNSUPPORTED_SIGNAL,
          message: DEBUGGER_UNSUPPORTED_MESSAGE,
        });
      }
      return await handleSetFiles(payload);
    }
    case "press": {
      const pressedKey = String(payload.key || "");
      let expectedActiveName = "";
      const active = await inspectActiveTarget(payload.tabId);
      if (isActivationKey(pressedKey)) {
        const refusal = decideIrreversibleAction({
          action: "press",
          key: pressedKey,
          name: active.name,
          tag: active.tag,
          role: active.role,
          type: active.type,
        });
        if (refusal) {
          const consentVerdict = await verifyConsentAndDrift({
            action: "press",
            tabId: String(payload.tabId),
            payload,
            target: { kind: "active", _frameId: active._frameId },
            refusal,
          });
          if (consentVerdict) return consentVerdict;
        }
        expectedActiveName = active.name;
      }
      const result = await executeInTab(payload.tabId, pageOperation, [
        { op: "press", key: pressedKey, _frameId: active._frameId, ...(expectedActiveName ? { expectedActiveName } : {}) },
      ]);
      return verdictEnvelope("press", verifyActionEffect({ action: "press", result }), {
        pressed: String(payload.key || ""),
      });
    }
    case "scroll": {
      let result;
      try {
        result = await executeInTab(payload.tabId, pageOperation, [
          {
            op: "scroll",
            deltaX: payload.deltaX || 0,
            deltaY: payload.deltaY || 0,
            ...(typeof payload.selector === "string" ? { selector: payload.selector } : {}),
          },
        ]);
      } catch (error) {
        return verdictEnvelope("scroll", {
          status: "failed",
          signal: error?.code || "SCROLL_FAILED",
          message: toMessage(error),
        });
      }
      if (!result?.ok) {
        return verdictEnvelope("scroll", {
          status: "failed",
          signal: result?.code || "SCROLL_FAILED",
          message: result?.message || "The scroll target could not be resolved.",
        });
      }
      return verdictEnvelope("scroll", verifyActionEffect({ action: "scroll", result }), {
        scrollX: Number(result.scrollX || 0),
        scrollY: Number(result.scrollY || 0),
        ...(result.targetBefore ? {
          targetBefore: result.targetBefore,
          targetAfter: result.targetAfter,
          target: result.target,
        } : {}),
        ...(result.after?.containers ? { containers: result.after.containers } : {}),
      });
    }
    case "mouse_move": {
      if (!HAS_DEBUGGER) {
        return verdictEnvelope("mouse_move", {
          status: "failed",
          signal: DEBUGGER_UNSUPPORTED_SIGNAL,
          message: DEBUGGER_UNSUPPORTED_MESSAGE,
        });
      }
      const mTarget = tabTarget(payload.tabId);
      await ensureDebugger(payload.tabId);
      const mx = Math.round(Number(payload.x || 0));
      const my = Math.round(Number(payload.y || 0));
      await chrome.debugger.sendCommand(mTarget, "Input.dispatchMouseEvent", { type: "mouseMoved", x: mx, y: my });
      scheduleDetach(payload.tabId);
      return { ok: true, mouseMoved: { x: mx, y: my } };
    }
    case "hit_test": {
      await assertDebuggableTab(payload.tabId);
      const ht = await executeInTab(payload.tabId, pageOperation, [
        { op: "hit_test", x: payload.x, y: payload.y },
      ]);
      return ht;
    }
    case "mouse_click": {
      if (!HAS_DEBUGGER) {
        return verdictEnvelope("mouse_click", {
          status: "failed",
          signal: DEBUGGER_UNSUPPORTED_SIGNAL,
          message: DEBUGGER_UNSUPPORTED_MESSAGE,
        });
      }
      const target = tabTarget(payload.tabId);
      await ensureDebugger(payload.tabId);
      const x = Math.round(Number(payload.x || 0));
      const y = Math.round(Number(payload.y || 0));
      await chrome.debugger.sendCommand(target, "Input.dispatchMouseEvent", { type: "mouseMoved", x, y, buttons: 0 });
      await new Promise((r) => setTimeout(r, 100));
      await chrome.debugger.sendCommand(target, "Input.dispatchMouseEvent", {
        type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1,
      });
      await new Promise((r) => setTimeout(r, 60));
      await chrome.debugger.sendCommand(target, "Input.dispatchMouseEvent", {
        type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1,
      });
      scheduleDetach(payload.tabId);
      return { ok: true, mouseClicked: { x, y } };
    }
    case "douyin_delete_one": {
      if (!HAS_DEBUGGER) {
        return verdictEnvelope("douyin_delete_one", {
          status: "failed",
          signal: DEBUGGER_UNSUPPORTED_SIGNAL,
          message: DEBUGGER_UNSUPPORTED_MESSAGE,
        });
      }
      const dTabId = String(payload.tabId);
      const keyword = String(payload.keyword || "猫");
      const target = tabTarget(dTabId);
      await ensureDebugger(dTabId);
      const trustedClick = async (x, y) => {
        await chrome.debugger.sendCommand(target, "Input.dispatchMouseEvent", { type: "mouseMoved", x, y, buttons: 0 });
        await new Promise((r) => setTimeout(r, 140));
        await chrome.debugger.sendCommand(target, "Input.dispatchMouseEvent", {
          type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1,
        });
        await new Promise((r) => setTimeout(r, 70));
        await chrome.debugger.sendCommand(target, "Input.dispatchMouseEvent", {
          type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1,
        });
      };
      const rect1 = await executeInTab(dTabId, pageOperation, [{ op: "rect_row_delete", keyword }]);
      if (!rect1 || rect1.ok !== true) {
        scheduleDetach(dTabId);
        return { ok: false, step: "find-row", detail: rect1 };
      }
      // 先把鼠标移到该行，触发真实 :hover 状态（悬停菜单/按钮只有在 hover 后才可点）
      await chrome.debugger.sendCommand(target, "Input.dispatchMouseEvent", { type: "mouseMoved", x: rect1.rowX, y: rect1.rowY, buttons: 0 });
      await new Promise((r) => setTimeout(r, 350));
      const rect2 = await executeInTab(dTabId, pageOperation, [{ op: "rect_row_delete", keyword }]);
      const btn = rect2 && rect2.ok === true ? rect2 : rect1;
      await trustedClick(btn.x, btn.y);
      let confirm = null;
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 350));
        const c = await executeInTab(dTabId, pageOperation, [{ op: "rect_confirm_button", text: "确定" }]);
        if (c && c.ok === true) {
          confirm = c;
          break;
        }
      }
      if (!confirm) {
        scheduleDetach(dTabId);
        return { ok: false, step: "no-confirm", clicked: { x: btn.x, y: btn.y, title: btn.title } };
      }
      await trustedClick(confirm.x, confirm.y);
      await new Promise((r) => setTimeout(r, 1800));
      scheduleDetach(dTabId);
      return {
        ok: true,
        deletedTitle: btn.title,
        btnAt: [btn.x, btn.y],
        confirmAt: [confirm.x, confirm.y],
        confirmTag: confirm.tag,
      };
    }
    case "douyin_delete_one_v2": {
      if (!HAS_DEBUGGER) {
        return verdictEnvelope("douyin_delete_one_v2", {
          status: "failed",
          signal: DEBUGGER_UNSUPPORTED_SIGNAL,
          message: DEBUGGER_UNSUPPORTED_MESSAGE,
        });
      }
      const vTabId = String(payload.tabId);
      const keyword = String(payload.keyword || "猫");
      // 若已有遗留弹窗，先清理
      const stale = await executeInTab(vTabId, pageOperation, [{ op: "rect_confirm_button", text: "确定" }]);
      if (stale && stale.ok === true) {
        await executeInTab(vTabId, pageOperation, [{ op: "click_confirm", text: "确定" }]);
        await new Promise((r) => setTimeout(r, 1200));
      }
      const step1 = await executeInTab(vTabId, pageOperation, [{ op: "click_row_delete", keyword }]);
      if (!step1 || step1.ok !== true) {
        return { ok: false, step: "click-delete", detail: step1 };
      }
      let launched = false;
      for (let i = 0; i < 12; i++) {
        await new Promise((r) => setTimeout(r, 350));
        const c = await executeInTab(vTabId, pageOperation, [{ op: "rect_confirm_button", text: "确定" }]);
        if (c && c.ok === true) {
          launched = true;
          break;
        }
      }
      if (!launched) {
        return { ok: false, step: "no-modal", detail: step1 };
      }
      const step2 = await executeInTab(vTabId, pageOperation, [{ op: "click_confirm", text: "确定" }]);
      await new Promise((r) => setTimeout(r, 1600));
      return { ok: true, title: step1.title, confirm: step2 };
    }
    case "douyin_rect_row": {
      if (!HAS_DEBUGGER) {
        return verdictEnvelope("douyin_rect_row", {
          status: "failed",
          signal: DEBUGGER_UNSUPPORTED_SIGNAL,
          message: DEBUGGER_UNSUPPORTED_MESSAGE,
        });
      }
      const rr = await executeInTab(payload.tabId, pageOperation, [
        { op: "rect_row_delete", keyword: payload.keyword || "猫" },
      ]);
      return rr;
    }
    case "douyin_rect_confirm": {
      if (!HAS_DEBUGGER) {
        return verdictEnvelope("douyin_rect_confirm", {
          status: "failed",
          signal: DEBUGGER_UNSUPPORTED_SIGNAL,
          message: DEBUGGER_UNSUPPORTED_MESSAGE,
        });
      }
      const rc = await executeInTab(payload.tabId, pageOperation, [
        { op: "rect_confirm_button", text: payload.text || "确定" },
      ]);
      return rc;
    }
    case "screenshot": {
      if (HAS_DEBUGGER) {
        const target = tabTarget(payload.tabId);
        await ensureDebugger(payload.tabId);
        const result = await chrome.debugger.sendCommand(target, "Page.captureScreenshot", {
          captureBeyondViewport: Boolean(payload.fullPage),
          format: "png",
        });
        scheduleDetach(payload.tabId);
        return { dataUrl: `data:image/png;base64,${result.data}` };
      }
      /**
       * Firefox fallback: tabs.captureVisibleTab covers the *viewport* only, so a requested
       * full-page capture is reported honestly rather than silently truncated. It returns a
       * data URL directly; PNG output stays in the same `dataUrl` field.
       */
      const tab = await chrome.tabs.get(Number(payload.tabId));
      if (!tab || tab.active !== true) {
        return verdictEnvelope("screenshot", {
          status: "failed",
          signal: "TAB_NOT_VISIBLE",
          message:
            "Firefox can only capture the visible tab (tabs.captureVisibleTab). " +
            "Activate the tab, or run the screenshot on Chrome for off-screen captures.",
        });
      }
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
      return {
        dataUrl,
        signal: payload.fullPage ? "screenshot_viewport_only" : "screenshot",
        capture: "visible_tab",
      };
    }
    case "read_console": {
      if (!HAS_DEBUGGER) {
        /**
         * Low-fidelity fallback: the CDP Runtime domain has no Firefox equivalent, and MAIN-world
         * console hooks are not reliably supported, so instead of inventing a half-capture the
         * connector returns whatever was buffered (nothing in practice) plus an explicit signal.
         */
        return {
          ...summarizeConsoleEntries([], { limit: payload.limit }),
          signal: DEBUGGER_UNSUPPORTED_SIGNAL,
          message:
            "read_console relies on chrome.debugger (Runtime.* events), which Firefox does not implement.",
        };
      }
      await ensureDebugger(payload.tabId);
      const entries = consoleByTab.get(String(payload.tabId)) || [];
      scheduleDetach(payload.tabId);
      return summarizeConsoleEntries(entries, { limit: payload.limit });
    }
    case "read_network": {
      if (!HAS_DEBUGGER) {
        return {
          ...summarizeNetworkEntries([], {
            limit: payload.limit,
            includeLowValue: payload.includeAssets === true,
          }),
          signal: DEBUGGER_UNSUPPORTED_SIGNAL,
          message:
            "read_network relies on chrome.debugger (Network.* events), which Firefox does not implement.",
        };
      }
      await ensureDebugger(payload.tabId);
      const entries = networkByTab.get(String(payload.tabId)) || [];
      scheduleDetach(payload.tabId);
      return summarizeNetworkEntries(entries, {
        limit: payload.limit,
        includeLowValue: payload.includeAssets === true,
      });
    }
    case "close_tab": {
      await loadOpenedTabs();
      const requested = normalizeTabId(payload.tabId);
      let tab = null;
      try {
        tab = await chrome.tabs.get(Number(requested));
      } catch {
        tab = null;
      }
      const openedByConnector = openedTabs.has(requested);
      const decision = decideCloseTab({
        exists: Boolean(tab),
        pinned: Boolean(tab?.pinned),
        openedByConnector,
      });
      if (!decision.ok) throw connectorError(decision.code, decision.message);

      // Release the debugging banner before the tab disappears, then drop every trace of it.
      await detachTab(requested);
      const closed = {
        id: normalizeTabId(tab.id),
        url: tab.url || "",
        title: tab.title || "",
      };
      await chrome.tabs.remove(tab.id);
      dropTabState(requested);
      openedTabs.remove(requested);
      await persistOpenedTabs();
      return { ok: true, closed, openedByConnector };
    }
    case "reload_extension": {
      /**
       * Host-only action (never a model-visible tool). On an unpacked install Chrome only re-reads the
       * extension's files when the service worker restarts, so the desktop app would otherwise have to
       * ask the user to click Reload in chrome://extensions. Answer first, then reload on the next tick.
       */
      setTimeout(() => {
        try {
          chrome.runtime.reload();
        } catch (error) {
          console.warn(`[nolo chrome connector] self reload skipped: ${toMessage(error)}`);
        }
      }, 400);
      return { ok: true, reloading: true };
    }
    case "detach": {
      // Internal action: not model-visible, and never fatal when nothing is attached.
      const detached = await detachTab(payload.tabId);
      return {
        ok: true,
        detached,
        tabId: normalizeTabId(payload.tabId),
        ...(HAS_DEBUGGER ? {} : { signal: DEBUGGER_UNSUPPORTED_SIGNAL }),
      };
    }
    default:
      throw new Error(`Unknown Chrome connector action: ${action}`);
  }
}

/**
 * Two user-facing message types: the toolbar popup asks whether the desktop app is connected, and
 * the approve page reports the user's decision. Both read no page data.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === APPROVAL_DECISION_MESSAGE_TYPE) {
    // Verified inside handleApprovalDecision (sender id + approve-page URL + nonce + window id).
    void handleApprovalDecision(message, sender || {}).then((decision) => {
      try {
        sendResponse(decision);
      } catch {
        // The approve page may already be closing; the recorded state is what matters.
      }
    });
    return true;
  }
  if (!message || message.type !== "connector_status") return false;
  sendResponse({
    extensionId: chrome.runtime.id,
    version: chrome.runtime.getManifest().version,
    hostName: HOST_NAME,
    protocolVersion: CONNECTOR_PROTOCOL_VERSION,
    connected: Boolean(nativePort),
  });
  return false;
});

function connectNativeHost() {
  nativePort = chrome.runtime.connectNative(HOST_NAME);
  nativePort.onMessage.addListener(async (message) => {
    if (!message || typeof message.id !== "string") return;
    try {
      const result = await handleAction(message.action, message.payload || {});
      nativePort.postMessage({ id: message.id, ok: true, result });
    } catch (error) {
      nativePort.postMessage({
        id: message.id,
        ok: false,
        error: {
          code: error?.code || "CHROME_EXTENSION_ACTION_FAILED",
          message: toMessage(error),
        },
      });
    }
  });
  nativePort.onDisconnect.addListener(() => {
    const error = chrome.runtime.lastError;
    if (error) {
      console.warn(`[nolo chrome connector] native host disconnected: ${error.message}`);
    }
    nativePort = null;
    setTimeout(connectNativeHost, 1000);
  });
}

void reconcileDebuggerAttachments();
connectNativeHost();

export { handleAction, pageOperation, preparedActionStore, refRegistry, probeTargetFrame, executeInTab };

