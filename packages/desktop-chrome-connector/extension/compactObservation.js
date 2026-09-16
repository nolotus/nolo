/**
 * Deterministic helpers for the Nolo Chrome connector compact observation protocol.
 *
 * This module is loaded by the extension service worker (extension/background.js, a MV3 module
 * worker) and by bun tests, so it must stay free of `chrome.*` and DOM globals. Everything here is
 * a pure function of its inputs: budgets, page revisions, element refs, action verification and
 * console/network shaping.
 */

export const CONNECTOR_PROTOCOL_VERSION = "2";

/** Chrome refuses script injection into its own UI and the Web Store; say so instead of failing oddly. */
export const PROTECTED_PAGE_CODE = "PROTECTED_PAGE";

const PROTECTED_URL_PREFIXES = Object.freeze([
  "chrome://",
  "chrome-untrusted://",
  "chrome-search://",
  "chrome-extension://",
  "devtools://",
  "edge://",
  "about:",
  "view-source:",
  "https://chrome.google.com/webstore",
  "https://chromewebstore.google.com",
]);

/**
 * Chrome refuses script injection into its own UI, the Web Store and other browser-owned origins.
 *
 * `file://` and `data:` are deliberately absent: a file page fails because the extension has no file
 * access (and enabling it is the user's choice), and `data:` URLs are not navigable tabs here. Both
 * report their own, more specific error, so calling them "protected" would be misleading.
 */

export function isProtectedPageUrl(url) {
  const value = typeof url === "string" ? url.trim().toLowerCase() : "";
  if (!value) return false;
  return PROTECTED_URL_PREFIXES.some((prefix) => value.startsWith(prefix));
}

/**
 * Feature names are part of the wire contract between the extension and the desktop app: a published
 * name is never reused or redefined, and unknown names are ignored by the reader. Additive evolution
 * goes here; only breaking changes bump {@link CONNECTOR_PROTOCOL_VERSION}.
 */
export const CONNECTOR_FEATURES = Object.freeze([
  "tabs",
  "compact_observation_v2",
  "action_gate",
  "browser_debug",
]);

const FEATURE_BY_ACTION = Object.freeze({
  list_tabs: ["tabs"],
  open_tab: ["tabs"],
  close_tab: ["tabs"],
  read_page: ["compact_observation_v2"],
  click: ["compact_observation_v2"],
  type: ["compact_observation_v2"],
  press: ["compact_observation_v2"],
  scroll: ["compact_observation_v2"],
  screenshot: ["browser_debug"],
  read_console: ["browser_debug"],
  read_network: ["browser_debug"],
  detach: ["browser_debug"],
});

/**
 * The capabilities an action depends on. The runtime may require more than the extension declares
 * here (it adds `action_gate` to the clicking actions); the drift test asserts the extension's list is
 * always a subset of the runtime's.
 */
export function requiredFeatureForAction(action) {
  const key = typeof action === "string" ? action : "";
  return FEATURE_BY_ACTION[key] ?? null;
}

export const COMPACT_BUDGET = Object.freeze({
  detail: Object.freeze({
    compact: Object.freeze({ maxChars: 6000, maxElements: 35, maxNameChars: 120, maxHtmlChars: 0 }),
    full: Object.freeze({ maxChars: 6000, maxElements: 35, maxNameChars: 200, maxHtmlChars: 6000 }),
  }),
  defaultDetail: "compact",
  hardMaxChars: 6000,
  hardMaxElements: 35,
  payloadMaxChars: 10000,
  urlMaxChars: 1000,
  regionMaxChars: 500,
  titleMaxChars: 300,
  valueMaxChars: 80,
  textEllipsis: "\u2026[truncated]",
  refs: Object.freeze({ ttlMs: 120000, maxTabs: 8 }),
  console: Object.freeze({ limitDefault: 20, limitMax: 60, textMaxChars: 300, rawTextMaxChars: 2000, rawCap: 200 }),
  network: Object.freeze({ limitDefault: 20, limitMax: 60, urlMaxChars: 300, rawCap: 300 }),
});

const SENSITIVE_NAME_PATTERN =
  /(submit|send|delete|remove|unsubscribe|pay|purchase|buy|checkout|confirm|authorize|allow|grant|deny|revoke|sign ?in|log ?in|提交|发送|删除|移除|支付|付款|购买|确认|授权|登录|同意)/i;

function clampInteger(value, min, max, fallback) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  const rounded = Math.trunc(numeric);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
}

function truncatePlain(value, maxChars, ellipsis = "\u2026") {
  const text = typeof value === "string" ? value : "";
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - ellipsis.length))}${ellipsis}`;
}

/** FNV-1a 32 bit, rendered as 8 hex chars. Stable across runtimes and cheap on any page. */
export function hashSignature(value) {
  const text = typeof value === "string" ? value : String(value ?? "");
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function buildPageRevision(signature) {
  return hashSignature(signature);
}

/**
 * Refs are revision-scoped by construction: the same element index in a new revision must never
 * reuse the ref string of the previous revision, otherwise a stale call could silently hit the
 * new element. Both the observation payload and the ref registry build refs through this helper.
 */
export function buildElementRef(pageRevision, index) {
  const position = Number.isFinite(index) ? index : 0;
  return `${pageRevision}-e${position + 1}`;
}

export function parseElementRef(ref) {
  if (typeof ref !== "string") return null;
  const match = /^([0-9a-f]{8})-e([0-9]+)$/.exec(ref.trim());
  if (!match) return null;
  return { pageRevision: match[1], index: Number(match[2]) - 1 };
}

export function truncateText(value, maxChars, ellipsis = COMPACT_BUDGET.textEllipsis) {
  const text = typeof value === "string" ? value : "";
  const budget = clampInteger(maxChars, 0, COMPACT_BUDGET.hardMaxChars, COMPACT_BUDGET.detail.compact.maxChars);
  if (budget <= 0) return { text: "", truncated: text.length > 0, omittedChars: text.length };
  if (text.length <= budget) return { text, truncated: false, omittedChars: 0 };
  const available = Math.max(1, budget - ellipsis.length);
  let head = text.slice(0, available);
  const boundary = Math.max(head.lastIndexOf("\n"), head.lastIndexOf(" "));
  if (boundary > available * 0.6) head = head.slice(0, boundary);
  return { text: `${head}${ellipsis}`, truncated: true, omittedChars: text.length - head.length };
}

export function normalizeBudget(input = {}) {
  const requested = input && typeof input === "object" ? input : {};
  const detail = requested.detail === "full" ? "full" : COMPACT_BUDGET.defaultDetail;
  const preset = COMPACT_BUDGET.detail[detail];
  return {
    detail,
    maxChars: clampInteger(requested.maxChars, 200, COMPACT_BUDGET.hardMaxChars, preset.maxChars),
    maxElements: clampInteger(requested.maxElements, 1, COMPACT_BUDGET.hardMaxElements, preset.maxElements),
    maxNameChars: preset.maxNameChars,
    maxHtmlChars: preset.maxHtmlChars,
  };
}

/**
 * Turns a raw page-side snapshot into the bounded payload the model sees. Never returns unbounded
 * page text: `text` is always capped by the resolved budget (compact budget by default).
 */
export function buildCompactObservation(raw, options = {}) {
  if (!raw || typeof raw !== "object") {
    return { ok: false, code: "READ_FAILED", message: "The page observation returned no data." };
  }
  if (raw.ok === false) {
    return {
      ok: false,
      code: typeof raw.code === "string" && raw.code ? raw.code : "READ_FAILED",
      message: typeof raw.message === "string" && raw.message ? raw.message : "Page read failed.",
      ...(typeof raw.region === "string" && raw.region ? { region: raw.region } : {}),
    };
  }

  const budget = normalizeBudget(options);
  const requestedRegion = typeof options.region === "string" && options.region ? options.region : "";
  const region = requestedRegion || (typeof raw.region === "string" ? raw.region : "");
  const rawElements = Array.isArray(raw.elements) ? raw.elements : [];
  const elementCount = Number.isFinite(raw.elementCount) ? raw.elementCount : rawElements.length;

  const pageRevision = buildPageRevision(raw.signature);

  function assemble(elementLimit, textLimit, htmlLimit) {
    const text = truncateText(raw.text, textLimit);
    const elements = rawElements.slice(0, elementLimit).map((element, position) => {
      const ref = buildElementRef(pageRevision, Number.isFinite(element?.index) ? element.index : position);
      const shaped = {
        ref,
        tag: String(element?.tag ?? ""),
        name: truncateText(element?.name, budget.maxNameChars).text,
      };
      if (element?.type) shaped.type = String(element.type);
      if (typeof element?.value === "string" && element.value) {
        shaped.value = truncateText(element.value, COMPACT_BUDGET.valueMaxChars).text;
      }
      if (element?.disabled) shaped.disabled = true;
      if (element?.readonly) shaped.readonly = true;
      // Marked so the model can plan around the gate instead of discovering it by being refused.
      if (isIrreversibleActionName(shaped.name)) shaped.sensitive = true;
      return shaped;
    });
    const payload = {
      ok: true,
      url: truncatePlain(raw.url, COMPACT_BUDGET.urlMaxChars),
      title: truncateText(raw.title, COMPACT_BUDGET.titleMaxChars).text,
      pageRevision,
      region: region ? truncatePlain(region, COMPACT_BUDGET.regionMaxChars) : null,
      text: text.text,
      truncated: text.truncated,
      omittedTextChars: text.omittedChars,
      elementCount,
      elements,
      omittedElements: Math.max(0, elementCount - elements.length),
      budget: {
        detail: budget.detail,
        maxChars: budget.maxChars,
        usedChars: text.text.length,
        maxElements: budget.maxElements,
        maxPayloadChars: COMPACT_BUDGET.payloadMaxChars,
        usedPayloadChars: 0,
      },
    };
    if (budget.detail === "full" && htmlLimit > 0 && typeof raw.html === "string" && raw.html) {
      const html = truncateText(raw.html, htmlLimit);
      payload.html = html.text;
      payload.htmlTruncated = html.truncated;
    }
    return payload;
  }

  let elementLimit = budget.maxElements;
  let textLimit = budget.maxChars;
  let htmlLimit = budget.maxHtmlChars;
  let payload = assemble(elementLimit, textLimit, htmlLimit);
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const measured = JSON.stringify(payload).length;
    if (measured <= COMPACT_BUDGET.payloadMaxChars - 16) break;
    const overflow = measured - COMPACT_BUDGET.payloadMaxChars + 32;
    if (elementLimit > 1) {
      elementLimit = Math.floor(elementLimit / 2);
    } else if (htmlLimit > 0) {
      htmlLimit = Math.max(0, htmlLimit - Math.max(512, overflow));
    } else if (textLimit > 200) {
      textLimit = Math.max(200, textLimit - Math.max(512, overflow));
    } else if (elementLimit > 0) {
      elementLimit = 0;
    } else {
      break;
    }
    payload = assemble(elementLimit, textLimit, htmlLimit);
  }
  if (JSON.stringify(payload).length > COMPACT_BUDGET.payloadMaxChars) {
    // Last-resort guarantee: the minimum allowed shape always fits the hard payload budget.
    payload = assemble(0, 200, 0);
  }
  payload.budget.usedPayloadChars = JSON.stringify(payload).length;
  return payload;
}

/**
 * Short-lived, revision-scoped element refs. There is no persistent selector database: refs only
 * resolve while the tab still holds the same page observation.
 */
export function createElementRefRegistry(options = {}) {
  const ttlMs = clampInteger(options.ttlMs, 1000, 3600000, COMPACT_BUDGET.refs.ttlMs);
  const maxTabs = clampInteger(options.maxTabs, 1, 64, COMPACT_BUDGET.refs.maxTabs);
  const now = typeof options.now === "function" ? options.now : () => Date.now();
  const snapshots = new Map();

  function remember(input = {}) {
    const tabId = String(input.tabId ?? "");
    if (!tabId) return null;
    const signature = typeof input.signature === "string" ? input.signature : "";
    const pageRevision =
      typeof input.pageRevision === "string" && input.pageRevision
        ? input.pageRevision
        : buildPageRevision(signature);
    const refs = new Map();
    // A snapshot exposes only its own revision's refs: an older ref is detected by its prefix,
    // never merged into the current revision as if it were still valid.
    const elements = Array.isArray(input.elements) ? input.elements : [];
    elements.forEach((element, position) => {
      const index = Number.isFinite(element?.index) ? element.index : position;
      const ref = buildElementRef(pageRevision, index);
      refs.set(ref, {
        ref,
        index,
        tag: String(element?.tag ?? ""),
        name: typeof element?.name === "string" ? element.name : "",
        disabled: element?.disabled === true,
        readonly: element?.readonly === true,
        pageRevision,
      });
    });
    const snapshot = {
      tabId,
      pageRevision,
      signature,
      region: typeof input.region === "string" ? input.region : "",
      url: typeof input.url === "string" ? input.url : "",
      textLength: Number.isFinite(input.textLength) ? input.textLength : 0,
      elementCount: Number.isFinite(input.elementCount) ? input.elementCount : refs.size,
      observedAt: Number.isFinite(input.observedAt) ? input.observedAt : now(),
      refs,
    };
    snapshots.delete(tabId);
    snapshots.set(tabId, snapshot);
    while (snapshots.size > maxTabs) snapshots.delete(snapshots.keys().next().value);
    return snapshot;
  }

  function snapshot(tabId) {
    return snapshots.get(String(tabId ?? "")) ?? null;
  }

  /** Called after an action returns a fresh page signature: keeps refs but marks them stale. */
  function notePageChanged(input = {}) {
    const tabId = String(input.tabId ?? "");
    const current = snapshots.get(tabId);
    if (!current) return null;
    const signature = typeof input.signature === "string" ? input.signature : "";
    if (!signature || signature === current.signature) return current;
    current.signature = signature;
    current.pageRevision = buildPageRevision(signature);
    current.observedAt = Number.isFinite(input.observedAt) ? input.observedAt : now();
    if (typeof input.url === "string" && input.url) current.url = input.url;
    return current;
  }

  function invalidate(tabId) {
    return snapshots.delete(String(tabId ?? ""));
  }

  function size() {
    return snapshots.size;
  }

  return { ttlMs, maxTabs, now, remember, snapshot, notePageChanged, invalidate, size };
}

/** Disabled (and read-only for typing) targets are rejected before any page-side effect. */
export function getBlockedTargetCode(action, element) {
  if (!element) return null;
  if (element.disabled === true) return "ELEMENT_DISABLED";
  if (action === "type" && element.readonly === true) return "ELEMENT_READONLY";
  return null;
}

/**
 * Single entry point for both action styles: `elementRef` from chrome_read_page, or the legacy CSS
 * `selector`. Ref resolution fails closed with a structured code instead of retrying anything.
 */
export function resolveActionTarget(payload = {}, registry, context = {}) {
  const elementRef = typeof payload?.elementRef === "string" ? payload.elementRef.trim() : "";
  const selector = typeof payload?.selector === "string" ? payload.selector.trim() : "";

  if (elementRef) {
    const current = registry && typeof registry.snapshot === "function" ? registry.snapshot(context.tabId) : null;
    if (!current) {
      return {
        ok: false,
        code: "ELEMENT_REF_UNKNOWN",
        message: "No cached page observation for this tab; call chrome_read_page and use its elementRefs.",
      };
    }
    const at = Number.isFinite(context.now)
      ? context.now
      : typeof registry?.now === "function"
        ? registry.now()
        : Date.now();
    const ttlMs = Number.isFinite(registry.ttlMs) ? registry.ttlMs : COMPACT_BUDGET.refs.ttlMs;
    if (at - current.observedAt > ttlMs) {
      return {
        ok: false,
        code: "ELEMENT_REF_STALE",
        message: "The cached page observation expired; call chrome_read_page again.",
      };
    }
    const entry = current.refs.get(elementRef);
    if (!entry) {
      const parsed = parseElementRef(elementRef);
      if (parsed && parsed.pageRevision !== current.pageRevision) {
        return {
          ok: false,
          code: "STALE_PAGE_REVISION",
          message: `That elementRef belongs to an older page revision (${parsed.pageRevision}); this tab is at ${current.pageRevision}. Call chrome_read_page again.`,
        };
      }
      return {
        ok: false,
        code: "ELEMENT_REF_UNKNOWN",
        message: `Unknown element ref: ${elementRef}. Call chrome_read_page again.`,
      };
    }
    if (entry.pageRevision !== current.pageRevision) {
      return {
        ok: false,
        code: "STALE_PAGE_REVISION",
        message: "That elementRef belongs to an older page revision; call chrome_read_page again.",
      };
    }
    if (typeof context.url === "string" && context.url && current.url && context.url !== current.url) {
      return {
        ok: false,
        code: "STALE_PAGE_REVISION",
        message: "The tab navigated to a different document; call chrome_read_page again.",
      };
    }
    const blocked = getBlockedTargetCode(context.action, entry);
    if (blocked) {
      return {
        ok: false,
        code: blocked,
        message: blocked === "ELEMENT_DISABLED"
          ? `${elementRef} is disabled; the action was not attempted.`
          : `${elementRef} is read-only; the text was not typed.`,
      };
    }
    return {
      ok: true,
      kind: "ref",
      ref: entry.ref,
      expect: {
        signature: current.signature,
        region: current.region,
        url: current.url,
        index: entry.index,
        tag: entry.tag,
        name: entry.name,
      },
    };
  }

  if (selector) return { ok: true, kind: "selector", selector };

  return {
    ok: false,
    code: "ELEMENT_TARGET_REQUIRED",
    message: "Provide elementRef from chrome_read_page or a CSS selector.",
  };
}

export function isSensitiveActionName(name) {
  return typeof name === "string" && SENSITIVE_NAME_PATTERN.test(name);
}

/**
 * The irreversible-action gate. Deliberately narrower than SENSITIVE_NAME_PATTERN: the broad pattern
 * drives post-hoc verification, while this one stops the connector from performing an action whose
 * external consequence the agent cannot undo afterwards.
 *
 * Erring towards blocking is intentional. Over-blocking costs the user one manual click; under-blocking
 * can pay, delete or publish something.
 */
const IRREVERSIBLE_ACTION_PATTERN = new RegExp(
  [
    // money
    "\\bpay\\b",
    "pay ?now",
    "\\bpayment\\b",
    "\\bpurchase\\b",
    "\\bbuy\\b",
    "check ?out",
    "place.*order",
    "order ?now",
    "submit.*order",
    "complete ?(purchase|order|payment)",
    "confirm ?(payment|order|purchase)",
    "\\btransfer\\b",
    "\\bdonate\\b",
    // destructive
    "\\bdelete\\b",
    "\\bremove\\b",
    "\\bunsubscribe\\b",
    // publish / send
    "\\bpublish\\b",
    "\\bsend\\b",
    // permissions and security
    "\\brevoke\\b",
    "\\bgrant\\b",
    "\\bauthorize\\b",
    "\\bpermission\\b",
    // Chinese equivalents. 清空 is included (clearing a recycle bin is irreversible) but its plain
    // English counterparts are not: "Clear search" and "Reset zoom" are ordinary local actions, and
    // the Latin side has no equivalent that separates the destructive case.
    "付款",
    "支付",
    "购买",
    "下单",
    "提交订单",
    "结算",
    "结账",
    "转账",
    "汇款",
    "捐赠",
    "提现",
    "退款",
    "预约",
    "删除",
    "移除",
    "退订",
    "取消订阅",
    "清空",
    "发布",
    "公布",
    "发送",
    "授权",
    "撤销授权",
    "权限变更",
    "同意授权",
    "确认支付",
    "确认下单",
    "完成支付",
  ].join("|"),
  "i",
);

export const CONFIRMATION_REQUIRED_CODE = "SENSITIVE_ACTION_REQUIRES_CONFIRMATION";

export function isIrreversibleActionName(name) {
  return typeof name === "string" && IRREVERSIBLE_ACTION_PATTERN.test(name);
}

/**
 * Keys that activate a focused control. Single source of truth: both the decision function below and
 * the connector's press handler use it, because two copies of this list already drifted once (the
 * handler kept its own Enter-only list, which made the Space branch unreachable).
 */
export function isActivationKey(key) {
  const value = typeof key === "string" ? key : "";
  return (
    value === "Enter" ||
    value === "NumpadEnter" ||
    value === "Return" ||
    value === " " ||
    value === "Space" ||
    value === "Spacebar"
  );
}

const CONFIRMATION_REQUIRED_MESSAGE =
  "This control is an irreversible external action (payment, send, delete, publish or permission change), and this " +
  "desktop runtime has no interactive approval channel to ask the user with. Nolo does not perform such an action on " +
  "the user's behalf: name the control, ask the user to activate it themselves, and stop here.";

/**
 * One decision point for the gate, so every action that can trigger an irreversible effect is refused
 * in exactly the same shape. `null` means the action may proceed.
 */
export function decideIrreversibleAction(input = {}) {
  const action = String(input.action ?? "");
  const name = typeof input.name === "string" ? input.name : "";
  if (!name) return null;
  if (action === "click" || action === "type") {
    if (!isIrreversibleActionName(name)) return null;
  } else if (action === "press") {
    const key = String(input.key ?? "");
    // Space activates a focused button just like Enter, so both are gated through the shared
    // predicate; a keyboard-only path (Tab to focus, then activate) must not bypass the click gate.
    if (!isActivationKey(key) || !isIrreversibleActionName(name)) return null;
  } else {
    return null;
  }
  return {
    ok: false,
    code: CONFIRMATION_REQUIRED_CODE,
    effect: "confirmation_required",
    action,
    signal: CONFIRMATION_REQUIRED_CODE,
    target: {
      name: name.slice(0, 200),
      ...(input.tag ? { tag: String(input.tag) } : {}),
    },
    message: CONFIRMATION_REQUIRED_MESSAGE,
  };
}

/**
 * Deterministic, risk-balanced verification. Cheap local signals can prove ordinary effects;
 * anything else is reported as `uncertain` so the model re-reads instead of blindly retrying.
 */
export function verifyActionEffect(input = {}) {
  const action = String(input.action ?? "");
  const result = input.result;
  if (!result || typeof result !== "object") {
    return {
      status: "uncertain",
      signal: "no_result",
      message: "The connector returned no observation for this action.",
    };
  }
  if (result.ok === false) {
    return {
      status: "failed",
      signal: typeof result.code === "string" && result.code ? result.code : "ACTION_FAILED",
      message: typeof result.message === "string" && result.message
        ? result.message
        : "The connector reported a failed action.",
    };
  }

  const before = result.before && typeof result.before === "object" ? result.before : {};
  const after = result.after && typeof result.after === "object" ? result.after : {};
  const element = result.element && typeof result.element === "object" ? result.element : {};
  const sensitive = input.sensitive === true || isSensitiveActionName(input.target?.name);

  if (action === "type") {
    if (element.exists === false) {
      return { status: "failed", signal: "ELEMENT_REMOVED", message: "The target element disappeared while typing." };
    }
    if (element.disabled === true) {
      return { status: "failed", signal: "ELEMENT_DISABLED", message: "The target element is disabled; the text was not applied." };
    }
    if (element.readonly === true) {
      return { status: "failed", signal: "ELEMENT_READONLY", message: "The target element is read-only; the text was not applied." };
    }
    if (element.value === null || element.value === undefined) {
      return {
        status: "uncertain",
        signal: "value_not_readable",
        message: "The element value cannot be read back (for example a password field).",
      };
    }
    const expectedText = typeof input.expected?.text === "string" ? input.expected.text : "";
    const applied = String(element.value);
    const expectedFinal = input.expected?.clearFirst === false
      ? `${typeof before.value === "string" ? before.value : ""}${expectedText}`
      : expectedText;
    if (applied === expectedFinal) return { status: "verified", signal: "value_matches" };
    if (expectedText && applied.includes(expectedText)) {
      return {
        status: "uncertain",
        signal: "value_partial_match",
        message: `Element value is ${JSON.stringify(applied)}; only part of the typed text was applied.`,
      };
    }
    return {
      status: "uncertain",
      signal: "value_mismatch",
      message: `Element value is ${JSON.stringify(applied)} instead of the typed text.`,
    };
  }

  if (action === "scroll") {
    const moved = before.scrollX !== after.scrollX || before.scrollY !== after.scrollY;
    return moved
      ? { status: "verified", signal: "scroll_changed" }
      : { status: "uncertain", signal: "no_observable_effect", message: "The viewport position did not change." };
  }

  if (before.url && after.url && before.url !== after.url) return { status: "verified", signal: "navigation" };
  if (
    typeof before.textLength === "number" &&
    typeof after.textLength === "number" &&
    before.textLength !== after.textLength
  ) {
    return { status: "verified", signal: "dom_text_changed" };
  }
  if (before.exists === true && after.exists === false) return { status: "verified", signal: "element_removed" };
  if (sensitive) {
    return {
      status: "uncertain",
      signal: "sensitive_action_not_locally_verifiable",
      message: "A cheap local check cannot prove a sensitive action took effect; confirm the result before continuing.",
    };
  }
  return {
    status: "uncertain",
    signal: "no_observable_effect",
    message: "The action ran but no local effect was observed; re-read the page instead of retrying.",
  };
}

const LOW_VALUE_NETWORK_TYPES = new Set(["image", "media", "font", "stylesheet", "manifest"]);
const LOW_VALUE_NETWORK_URL = /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp|css|woff2?|ttf|otf|eot|map)([?#]|$)/i;

/** Static assets and inline blobs are low signal for debugging; they are filtered by default. */
export function isLowValueNetworkEntry(entry) {
  if (!entry || typeof entry !== "object") return false;
  const type = typeof entry.type === "string" ? entry.type.toLowerCase() : "";
  if (LOW_VALUE_NETWORK_TYPES.has(type)) return true;
  const url = typeof entry.url === "string" ? entry.url : "";
  if (!url) return false;
  if (url.startsWith("data:") || url.startsWith("blob:")) return true;
  return LOW_VALUE_NETWORK_URL.test(url);
}

export function summarizeConsoleEntries(entries = [], options = {}) {
  const list = Array.isArray(entries) ? entries : [];
  const limit = clampInteger(options.limit, 1, COMPACT_BUDGET.console.limitMax, COMPACT_BUDGET.console.limitDefault);
  const textMaxChars = clampInteger(
    options.textMaxChars,
    40,
    COMPACT_BUDGET.console.textMaxChars,
    COMPACT_BUDGET.console.textMaxChars,
  );
  const merged = new Map();
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const text = truncatePlain(entry.text, textMaxChars);
    const type = typeof entry.type === "string" && entry.type ? entry.type : "log";
    const key = `${type}\u0000${text}`;
    const existing = merged.get(key);
    if (existing) {
      existing.count += 1;
      if (!Number.isFinite(existing.timestamp) && Number.isFinite(entry.timestamp)) existing.timestamp = entry.timestamp;
    } else {
      merged.set(key, {
        type,
        text,
        timestamp: Number.isFinite(entry.timestamp) ? entry.timestamp : null,
        count: 1,
      });
    }
  }
  const unique = Array.from(merged.values());
  const shaped = unique.slice(-limit).map((entry) =>
    entry.count > 1
      ? { type: entry.type, text: entry.text, count: entry.count, timestamp: entry.timestamp }
      : { type: entry.type, text: entry.text, timestamp: entry.timestamp }
  );
  return {
    entries: shaped,
    total: list.length,
    returned: shaped.length,
    deduped: list.length - unique.length,
    dropped: Math.max(0, unique.length - shaped.length),
  };
}

export function summarizeNetworkEntries(entries = [], options = {}) {
  const all = Array.isArray(entries) ? entries : [];
  const list = options.includeLowValue === true ? all : all.filter((entry) => !isLowValueNetworkEntry(entry));
  const limit = clampInteger(options.limit, 1, COMPACT_BUDGET.network.limitMax, COMPACT_BUDGET.network.limitDefault);
  const urlMaxChars = clampInteger(
    options.urlMaxChars,
    40,
    COMPACT_BUDGET.network.urlMaxChars,
    COMPACT_BUDGET.network.urlMaxChars,
  );
  const merged = new Map();
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const url = truncatePlain(entry.url, urlMaxChars);
    const method = typeof entry.method === "string" && entry.method ? entry.method.toUpperCase() : "GET";
    const key = `${method} ${url}`;
    const existing = merged.get(key);
    if (existing) {
      existing.count += 1;
      if (!Number.isFinite(existing.timestamp) && Number.isFinite(entry.timestamp)) existing.timestamp = entry.timestamp;
    } else {
      merged.set(key, {
        method,
        url,
        type: typeof entry.type === "string" && entry.type ? entry.type : null,
        timestamp: Number.isFinite(entry.timestamp) ? entry.timestamp : null,
        count: 1,
      });
    }
  }
  const unique = Array.from(merged.values());
  const shaped = unique.slice(-limit).map((entry) => {
    const shapedEntry = { method: entry.method, url: entry.url, timestamp: entry.timestamp };
    if (entry.type) shapedEntry.type = entry.type;
    if (entry.count > 1) shapedEntry.count = entry.count;
    return shapedEntry;
  });
  return {
    entries: shaped,
    total: all.length,
    returned: shaped.length,
    deduped: list.length - unique.length,
    dropped: Math.max(0, unique.length - shaped.length),
    filtered: all.length - list.length,
  };
}

/**
 * Tab lifecycle: connector-opened tab ownership plus the single close guard. These helpers stay
 * pure (no chrome.*, no DOM) so the bookkeeping and the refusal rules are unit-testable.
 */

/** Session storage key holding the ids of the tabs this connector opened itself. */
export const OPENED_TABS_STORAGE_KEY = "noloConnectorOpenedTabs";

/** Hard cap for tracked ownership entries; a long browser session must not grow unbounded. */
export const OPENED_TABS_MAX = 200;

/** Idle window after the last debugger-backed action before the attachment is released. */
export const DETACH_IDLE_MS = 30000;

/** Frozen close_tab failure codes: neither is a retry hint, and each needs different handling. */
export const CLOSE_TAB_CODES = Object.freeze({
  NOT_FOUND: "TAB_NOT_FOUND",
  PINNED: "TAB_PINNED",
});

/** Chrome tab ids arrive as numbers from chrome.tabs and as strings from the native host. */
export function normalizeTabId(tabId) {
  if (typeof tabId === "number") return Number.isFinite(tabId) ? String(tabId) : "";
  if (typeof tabId === "string") return tabId.trim();
  return "";
}

/**
 * Ownership bookkeeping for tabs opened through open_tab. It stays an explicit set instead of a flag
 * on the tab because ownership has to survive service-worker suspension.
 */
export function createOpenedTabSet(initial = []) {
  const ids = new Set();
  const api = {
    add(tabId) {
      const id = normalizeTabId(tabId);
      if (id) ids.add(id);
      return api;
    },
    remove(tabId) {
      ids.delete(normalizeTabId(tabId));
      return api;
    },
    has(tabId) {
      return ids.has(normalizeTabId(tabId));
    },
    get size() {
      return ids.size;
    },
    toArray() {
      return Array.from(ids).slice(-OPENED_TABS_MAX);
    },
    replace(list) {
      ids.clear();
      for (const entry of Array.isArray(list) ? list : []) api.add(entry);
      return api;
    },
  };
  return api.replace(initial);
}

/** Storage-safe projection: deduplicated, non-empty ids, newest entries kept. */
export function serializeOpenedTabs(source) {
  const list = Array.isArray(source)
    ? source
    : typeof source?.toArray === "function"
      ? source.toArray()
      : [];
  const ids = new Set();
  for (const entry of list) {
    const id = normalizeTabId(entry);
    if (id) ids.add(id);
  }
  return Array.from(ids).slice(-OPENED_TABS_MAX);
}

/** Malformed session state is non-fatal: a lost set only means list_tabs marks nothing. */
export function deserializeOpenedTabs(raw) {
  return serializeOpenedTabs(Array.isArray(raw) ? raw : []);
}

/**
 * Single close guard for close_tab: a missing tab can never be closed, and a pinned tab belongs to
 * the user's own layout, so both are refused before any chrome.tabs.remove call.
 */
export function decideCloseTab(input = {}) {
  if (!input.exists) {
    return {
      ok: false,
      code: CLOSE_TAB_CODES.NOT_FOUND,
      message: "No Chrome tab with this id; it may already be closed.",
    };
  }
  if (input.pinned) {
    return {
      ok: false,
      code: CLOSE_TAB_CODES.PINNED,
      message: "This Chrome tab is pinned; ask the user to close or unpin it.",
    };
  }
  return { ok: true };
}
