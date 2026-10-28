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

/**
 * Extension-owned pages live under a browser-specific URL scheme: Chrome serves them from
 * `chrome-extension://<id>/`, Firefox from `moz-extension://<uuid>/`. Every judgement that has to
 * recognise "a page this extension owns" must cover both, or Firefox silently loses the guard
 * Chrome has (the approval page in particular).
 *
 * These are full URL schemes, matched with `startsWith` — never a bare `-extension://` substring,
 * which would also swallow unrelated URLs.
 */
export const EXTENSION_URL_PREFIXES = Object.freeze(["chrome-extension://", "moz-extension://"]);

const PROTECTED_URL_PREFIXES = Object.freeze([
  "chrome://",
  "chrome-untrusted://",
  "chrome-search://",
  ...EXTENSION_URL_PREFIXES,
  "devtools://",
  "edge://",
  "about:",
  "view-source:",
  "https://chrome.google.com/webstore",
  "https://chromewebstore.google.com",
]);

/** True for any extension-scheme page (Chrome's or Firefox's), whatever extension owns it. */
export function isExtensionPageUrl(url) {
  const value = typeof url === "string" ? url.trim().toLowerCase() : "";
  if (!value) return false;
  return EXTENSION_URL_PREFIXES.some((prefix) => value.startsWith(prefix));
}

/**
 * True for a page served by *this* extension.
 *
 * `ownOrigin` is `chrome.runtime.getURL("")`, which is `chrome-extension://<id>/` on Chrome and
 * `moz-extension://<uuid>/` on Firefox — the browser already knows its own shape, so we ask it
 * instead of guessing. When the runtime does not expose `getURL` (a stripped-down host), fall
 * back to the extension scheme so the extension's own pages still stay out of the way.
 */
export function isOwnExtensionPage(url, ownOrigin = "") {
  const value = typeof url === "string" ? url.trim() : "";
  if (!value) return false;
  if (typeof ownOrigin === "string" && ownOrigin) return value.startsWith(ownOrigin);
  return isExtensionPageUrl(value);
}

/**
 * Chrome refuses script injection into its own UI, the Web Store and other browser-owned origins;
 * Firefox refuses the same for its own `moz-extension://` pages.
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
  "screenshot",
  "file_upload",
  "prepare_browser_action",
  // Arbitrary script execution in a tab. Its own name because it is its own capability: Chrome
  // runs it through chrome.debugger (Runtime.evaluate) and every call needs a fresh approval.
  "eval",
  // The two halves of the host-side approval channel (list what is waiting, answer it from the
  // host's own card). Not debugger-backed: it only reads and moves the worker's approval records.
  "approval_inbox",
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
  // screenshot is its own feature because Firefox can capture the visible tab via
  // tabs.captureVisibleTab even though it has no chrome.debugger. Requiring browser_debug
  // here would make the desktop refuse screenshot on Firefox before the call is even tried.
  screenshot: ["screenshot"],
  read_console: ["browser_debug"],
  read_network: ["browser_debug"],
  detach: ["browser_debug"],
  set_files: ["compact_observation_v2", "file_upload"],
  // A native <select> can carry an irreversible choice (a country the account cannot change, a
  // plan, a shipping method), so choosing its option goes through the same name gate as click/type.
  set_select_value: ["compact_observation_v2", "action_gate"],
  prepare_browser_action: ["prepare_browser_action"],
  // debugger-backed like read_console, and gated like click: the two together mean `eval` already
  // says "this cannot run on Firefox without a debugger".
  eval_script: ["eval"],
  // Listing is read-only and deciding only moves a record the user was already asked about; neither
  // needs a page or a debugger, so both sit behind one feature name.
  list_pending_approvals: ["approval_inbox"],
  submit_approval_decision: ["approval_inbox"],
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
  // Invalid or missing offsets read from the start; offsets past the end clamp to the end.
  const offset = Math.min(clampInteger(options.offset, 0, Number.MAX_SAFE_INTEGER, 0), rawElements.length);

  const pageRevision = buildPageRevision(raw.signature);

  function assemble(elementLimit, textLimit, htmlLimit) {
    const text = truncateText(raw.text, textLimit);
    const elements = rawElements.slice(offset, offset + elementLimit).map((element, position) => {
      const ref = buildElementRef(pageRevision, Number.isFinite(element?.index) ? element.index : offset + position);
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
    const pageEnd = offset + elements.length;
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
      offset,
      nextOffset: pageEnd < elementCount ? pageEnd : null,
      elements,
      omittedElements: Math.max(0, elementCount - pageEnd),
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
  const rawRef =
    typeof payload?.elementRef === "string"
      ? payload.elementRef
      : typeof payload?.ref === "string"
        ? payload.ref
        : "";
  const elementRef = rawRef.trim();
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
        role: entry.role ?? "",
        type: entry.type ?? "",
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

/**
 * Page-provided labels can carry characters that render as nothing but break a literal keyword
 * match: a zero-width space inside 删除 ("删\u200b除"), a variation selector or combining mark inside
 * a Latin word ("S\u180Fend", "S\uFE0Fend"), a braille blank ("S\u2800end"), full-width letters
 * ("Ｓｅｎｄ"), or plain spacing inside a word ("删 除", "S e n d").
 *
 * Enumerating the invisible ones is a losing game — U+180F is a variation selector outside `\p{Cf}`,
 * U+2800 is a blank with a visible-looking category — so the compact view keeps only letters and
 * digits and drops everything else. NFKC folds full-width and compatibility forms first. Normalising
 * applies to the text being matched only: the label echoed back in error payloads and in the approval
 * window stays what the page actually said.
 */
const INVISIBLE_CHARS = /\p{Cf}/gu;
const COMBINING_MARKS = /\p{Mn}/gu;
// Look like blanks but carry the Letter category, so \p{L} would keep them: Hangul fillers.
const FILLER_CHARS = /[\u115F\u1160\u3164\uFFA0]/gu;
const NON_ALPHANUMERIC = /[^\p{L}\p{N}]/gu;

/**
 * Homoglyphs: Cyrillic and Greek letters that render like Latin ones. A label can spell "Delete" with
 * a Cyrillic е and stay invisible to any Latin keyword. Folding applies to the text being matched
 * only, so a genuine Russian or Greek label keeps its own text in every payload the user sees, and
 * folding cannot invent a false positive: the folded word still has to be a verb in the list.
 */
const HOMOGLYPHS = new Map([
  // Lowercase Cyrillic/Greek → lowercase Latin.
  ["а", "a"], ["в", "b"], ["е", "e"], ["к", "k"], ["м", "m"], ["н", "h"], ["о", "o"],
  ["р", "p"], ["с", "c"], ["т", "t"], ["у", "y"], ["х", "x"], ["ѕ", "s"], ["і", "i"],
  ["ј", "j"], ["ԁ", "d"], ["һ", "h"], ["ӏ", "l"], ["ԛ", "q"], ["ԝ", "w"],
  ["α", "a"], ["β", "b"], ["ε", "e"], ["ι", "i"], ["κ", "k"], ["ν", "v"], ["ο", "o"],
  ["ρ", "p"], ["τ", "t"], ["υ", "u"], ["χ", "x"], ["γ", "y"], ["ϲ", "c"],
  // Uppercase → uppercase Latin. Folding to lowercase instead would erase the CamelCase boundary
  // ("DeleteΑccount") and would map Ν to ν→v even though it renders as N.
  ["А", "A"], ["В", "B"], ["Е", "E"], ["К", "K"], ["М", "M"], ["Н", "H"], ["О", "O"],
  ["Р", "P"], ["С", "C"], ["Т", "T"], ["У", "Y"], ["Х", "X"], ["Ѕ", "S"], ["І", "I"],
  ["Ј", "J"], ["Ԁ", "D"], ["Һ", "H"], ["Ӏ", "L"], ["Ԛ", "Q"], ["Ԝ", "W"],
  ["Α", "A"], ["Β", "B"], ["Ε", "E"], ["Ζ", "Z"], ["Η", "H"], ["Ι", "I"], ["Κ", "K"],
  ["Μ", "M"], ["Ν", "N"], ["Ο", "O"], ["Ρ", "P"], ["Τ", "T"], ["Υ", "Y"], ["Χ", "X"],
  ["Ϲ", "C"],
]);

// Cyrillic (including the U+0500 block, where ԁ lives) and Greek.
const HOMOGLYPH_RANGE = /[\u0370-\u03FF\u0400-\u04FF\u0500-\u052F]/g;

function foldHomoglyphs(text) {
  // Exact character first, then its lowercase: the table carries both cases, so an uppercase lookalike
  // folds to an uppercase Latin letter and keeps the CamelCase boundary intact.
  return text.replace(
    HOMOGLYPH_RANGE,
    (char) => HOMOGLYPHS.get(char) ?? HOMOGLYPHS.get(char.toLowerCase()) ?? char,
  );
}

function stripInvisible(name) {
  return (
    // Folding runs on both sides of NFKC: before it, because NFKC rewrites some lookalikes into a
    // different character the table does not know (lunate sigma Ϲ becomes Σ); after it, because
    // decomposition can produce a lookalike the table does know (ё becomes Cyrillic е plus a mark).
    foldHomoglyphs(
      foldHomoglyphs(name)
        .normalize("NFKC")
        .replace(INVISIBLE_CHARS, "")
        // Decompose, drop the marks, recompose. NFKC alone fuses "Se\u0301nd" into "Sénd", where the
        // accent is part of a different letter and the verb is no longer visible to a keyword match.
        .normalize("NFD")
        .replace(COMBINING_MARKS, "")
        .normalize("NFC"),
    )
  );
}

/**
 * Invisible characters, spacing, punctuation, marks and Hangul fillers all removed, leaving only
 * letters and digits. This is the view CJK verbs are matched against (they carry no word boundary)
 * and the view Latin verbs are matched against without a boundary, which is what makes "删 除",
 * "删\u180F除" and "S e n d email" all read as the verb they are.
 */
function compactLabel(name) {
  return stripInvisible(name).replace(FILLER_CHARS, "").replace(NON_ALPHANUMERIC, "");
}

export function isSensitiveActionName(name) {
  if (typeof name !== "string") return false;
  // The same two views as the gate: the broad pattern over the compact text, plus the Latin token
  // check, so a split or transposed verb is not reported as an ordinary click after the fact either.
  return SENSITIVE_NAME_PATTERN.test(compactLabel(name)) || gateLatinLabel(stripInvisible(name));
}

export const CN_IRREVERSIBLE_VERBS = Object.freeze([
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
  "重发",
  "授权",
  "撤销授权",
  "权限变更",
  "同意授权",
  "确认支付",
  "确认下单",
  "完成支付",
]);

/**
 * A completed-state prefix ("已发送", "已删除") names a place rather than a command. It is only ever
 * stripped before the tail is judged — see `isIrreversibleActionName`. A match here is never a
 * release by itself; the tail decides.
 */
export const COMPLETED_STATE_LABEL_PATTERN = new RegExp(
  `^已\\s*(?:${CN_IRREVERSIBLE_VERBS.join("|")})`,
  "u",
);

/**
 * What may follow a completed-state prefix and still leave the label a place rather than an action:
 * nothing, one or more container nouns ("已发送邮件列表"), and optionally an unread count
 * ("已发送(3)", "已发送 3", "已发送(3)条").
 *
 * Whitelisting the tail, rather than re-testing it for known verbs, is deliberate. Re-testing only
 * catches the verbs already in the list, so "已发送 Forward", "已发送 Crosspost" and "已发送 转发"
 * would slip through while every verb was chased one at a time. Anything outside this tail keeps the
 * gate closed, so a folder may be labelled with these container nouns but an action cannot ride along
 * behind 已发送.
 */
const COMPLETED_STATE_TAIL_PATTERN = new RegExp(
  [
    "^\\s*(?:的)?\\s*",
    "(?:邮件|消息|会话|对话|群聊|聊天|记录|列表|文件夹|邮件夹|邮件箱|信箱|邮箱|草稿|文件|项目",
    "|订单|账单|通知|申请|申请单|信息|内容|任务|日志|历史|详情|明细|回复|评论|工单|报告|文章",
    "|帖子|动态|视频|图片|照片)*",
    "\\s*(?:(?:\\d+|[(（]\\s*\\d+\\s*[)）])\\s*(?:条|封|个|项)?)?\\s*$",
  ].join(""),
  "u",
);

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
    // publish / send. resend/republish carry their own word boundary because `\bsend\b` cannot see
    // the verb inside them; this covers the bare labels. On the completed-state path the base pattern
    // is never reached — the tail whitelist is what keeps "已发送 Resend" closed.
    "\\bpublish\\b",
    "\\bsend\\b",
    "\\bresend\\b",
    "\\brepublish\\b",
    // permissions and security
    "\\brevoke\\b",
    "\\bgrant\\b",
    "\\bauthorize\\b",
    "\\bpermission\\b",
    // Chinese equivalents. 清空 is included (clearing a recycle bin is irreversible) but its plain
    // English counterparts are not: "Clear search" and "Reset zoom" are ordinary local actions, and
    // the Latin side has no equivalent that separates the destructive case.
    ...CN_IRREVERSIBLE_VERBS,
  ].join("|"),
  "i",
);

export const CONFIRMATION_REQUIRED_CODE = "SENSITIVE_ACTION_REQUIRES_CONFIRMATION";

/**
 * Latin verbs, matched as whole tokens rather than substrings. A label can hide a verb in two ways
 * that a substring match cannot separate from an ordinary noun: split it ("S e n d", "De lete"), or
 * transpose two letters ("Sned"). Tokens cover both without the false positives of a boundary-free
 * substring match — "Sender settings" and "Deleted items" are single tokens that simply are not the
 * verb, so they stay ordinary navigation. The accepted losses are CamelCase names whose first word is
 * a verb — "PayPal" ("Pay Pal"), "SendGrid" ("Send Grid"), "SendBird" — which is the price of catching
 * "SendEmail" and "DeleteAccount".
 *
 * Split CJK characters ("刂余" for 删) are out of scope: recognising a glyph assembled from separate
 * characters would need a decomposition table, and its false-positive surface has not been assessed.
 * That is a known limit, not a claim that no agent could read such a label as the verb.
 */
const EN_IRREVERSIBLE_VERBS = Object.freeze([
  "pay",
  "payment",
  "purchase",
  "buy",
  "delete",
  "remove",
  "unsubscribe",
  "publish",
  "send",
  "resend",
  "republish",
  "revoke",
  "grant",
  "authorize",
  "permission",
  "transfer",
  "donate",
]);

const EN_IRREVERSIBLE_VERB_SET = new Set(EN_IRREVERSIBLE_VERBS);

// CamelCase is a word boundary: "DeleteAccount" and "DELETEAccount" are a verb plus its object, while
// "Sender" and "Deleted" are single words. The cost is "PayPal" (split into "Pay Pal"), accepted
// because the alternative is letting "SendEmail" through.
const CAMEL_LOWER_UPPER = /([a-z0-9])([A-Z])/g;
const CAMEL_UPPER_WORD = /([A-Z]+)([A-Z][a-z])/g;
const LATIN_TOKENS = /[A-Za-z]+/g;
// The longest verb is "unsubscribe" (11).
const MAX_VERB_LENGTH = 11;
// Transposition needs four letters to be meaningful; three-letter abbreviations such as "APY" or
// "BYU" would otherwise collide with "pay" and "buy".
const MIN_TRANSPOSITION_LENGTH = 4;
const MAX_LATIN_TOKEN_LENGTH = 24;
// A split verb leaves a token that is a prefix of one ("Dele", "Unsub", "s"), or one swap away from
// being a prefix ("dle" -> "del"). Only such a token anchors the stream search, so a label like
// "A Sender" — where "a" happens to prefix "authorize" — cannot drag an unrelated "Sender" into it.
// The anchor decides where to look; it never widens what may match there.
// Common short English words are not evidence of a split verb, even when they happen to prefix one:
// "Re Sender" would otherwise join to "resend" and gate an ordinary label. Single letters other than
// these stay eligible, which is what keeps "S e n d" detectable.
const LATIN_STOP_WORDS = new Set([
  "a", "an", "re", "id", "in", "to", "do", "go", "up", "on", "of", "or", "be", "is", "it", "at",
  "as", "by", "we", "he", "me", "my", "no", "so", "us", "am", "if", "ok",
]);

function isVerbFragment(token) {
  if (!token) return false;
  const prefixesOf = (value) =>
    EN_IRREVERSIBLE_VERBS.some((verb) => verb.length > value.length && verb.startsWith(value));
  if (prefixesOf(token)) return true;
  for (let index = 0; index + 1 < token.length; index += 1) {
    const swapped =
      token.slice(0, index) + token[index + 1] + token[index] + token.slice(index + 2);
    if (prefixesOf(swapped)) return true;
  }
  return false;
}

// Complete English words that appear in ordinary navigation labels. Crossing into one changes what
// the search accepts: the exact spelling belongs to that word ("Re Sender" -> resend), so only a
// scrambled spelling can still be the action ("Re end s message" -> reends). Accepted false positive:
// "Re: End status" also yields reends and asks once — a constructible bypass costs the attacker
// nothing, an extra confirmation costs the user a click.
const LATIN_WORD_ANCHORS = new Set([
  "sender", "senders", "settings", "setting", "deleted", "items", "item", "sent", "ends", "end",
  "apy", "byu", "new", "id", "ids", "account", "accounts", "user", "users", "profile", "profiles",
  "mail", "mails", "message", "messages", "inbox", "draft", "drafts", "folder", "folders", "list",
  "lists", "page", "pages", "home", "search", "help", "docs", "documentation", "security", "privacy",
  "payment", "payments", "purchase", "purchases", "permission", "permissions", "transfer", "transfers",
  "grant", "grants", "publisher", "publishers", "order", "orders", "invoice", "invoices", "bill",
  "bills", "team", "teams", "workspace", "workspaces",
]);

function isCompleteWord(token) {
  for (const word of LATIN_WORD_ANCHORS) {
    if (token === word || token.startsWith(word)) return true;
  }
  return false;
}

function sortedLetters(value) {
  return value.split("").sort().join("");
}

function matchesAnagram(candidate) {
  if (candidate.length < MIN_TRANSPOSITION_LENGTH || candidate.length > MAX_VERB_LENGTH) return false;
  const sorted = sortedLetters(candidate);
  return EN_IRREVERSIBLE_VERBS.some(
    (verb) => verb.length === candidate.length && sortedLetters(verb) === sorted,
  );
}

function matchesVerb(candidate) {
  if (candidate.length < 3 || candidate.length > MAX_VERB_LENGTH) return false;
  if (EN_IRREVERSIBLE_VERB_SET.has(candidate)) return true;
  if (candidate.length >= MIN_TRANSPOSITION_LENGTH && hasAdjacentTransposition(candidate)) return true;
  return matchesAnagram(candidate);
}

function isVerbToken(token) {
  return EN_IRREVERSIBLE_VERB_SET.has(token) || hasAdjacentTransposition(token);
}

function latinTokens(text) {
  const spaced = text
    .replace(CAMEL_LOWER_UPPER, "$1 $2")
    .replace(CAMEL_UPPER_WORD, "$1 $2");
  return (spaced.match(LATIN_TOKENS) ?? []).map((token) => token.toLowerCase());
}

function hasAdjacentTransposition(token) {
  if (token.length < MIN_TRANSPOSITION_LENGTH || token.length > MAX_LATIN_TOKEN_LENGTH) return false;
  for (let index = 0; index + 1 < token.length; index += 1) {
    const swapped =
      token.slice(0, index) + token[index + 1] + token[index] + token.slice(index + 2);
    if (EN_IRREVERSIBLE_VERB_SET.has(swapped)) return true;
  }
  return false;
}

function gateLatinLabel(text) {
  const tokens = latinTokens(text);
  if (!tokens.length) return false;
  if (tokens.some(isVerbToken)) return true;

  const spans = [];
  let offset = 0;
  for (const token of tokens) {
    spans.push({ token, start: offset, end: offset + token.length });
    offset += token.length;
  }
  const stream = tokens.join("");

  for (const span of spans) {
    if (!isVerbFragment(span.token)) continue;
    const stopAnchor = LATIN_STOP_WORDS.has(span.token);
    let candidate = "";
    let crossedWord = false;
    for (let pos = span.start; pos < stream.length; pos += 1) {
      const owner = spans.find((entry) => pos >= entry.start && pos < entry.end);
      // A stop word only anchors its own label: crossing into a complete word means the rest is an
      // ordinary noun ("Re Sender"). Past that point only a scrambled spelling can still be the action
      // — "resend" belongs to "Sender", while "reends" ("Re end s message") does not belong to "end".
      if (stopAnchor && owner !== span && isCompleteWord(owner.token)) crossedWord = true;
      candidate += stream[pos];
      if (candidate.length > MAX_VERB_LENGTH) break;
      if (crossedWord) {
        // Past a complete word only a scrambled spelling can still be the action: "resend" belongs to
        // "Sender", while "reends" does not belong to "end". This deliberately also gates
        // "Re: End status" (re + end + s), an accepted false positive: the attacker can write
        // "Re endsmessage" at no cost, so a constructible bypass is worse than one extra confirmation.
        if (!EN_IRREVERSIBLE_VERB_SET.has(candidate) && matchesAnagram(candidate)) return true;
      } else if (matchesVerb(candidate)) {
        return true;
      }
    }
  }
  return false;
}

export function isIrreversibleActionName(name) {
  if (typeof name !== "string") return false;
  // Two views of the same label. `stripInvisible` removes format characters, folds compatibility
  // forms with NFKC and drops combining marks (Mn) while keeping spacing, so `\bsend\b` still has its
  // boundary; the compact view
  // additionally drops spacing, punctuation and Hangul fillers, which is what makes "删 除", "S e n d"
  // and "S\u115Fend" read as the verb they are. Both views are matched.
  const normalized = stripInvisible(name);
  const compact = compactLabel(name);
  // The completed-state prefix is exempt only when what follows it is a place-name tail; any other
  // tail keeps the gate closed (fail-closed). Judging the tail by whitelist instead of by verb list
  // is what keeps "已发送 Forward" and "已发送 转发" gated without chasing every verb in existence.
  if (COMPLETED_STATE_LABEL_PATTERN.test(compact)) {
    const remainder = compact.replace(COMPLETED_STATE_LABEL_PATTERN, "");
    return !COMPLETED_STATE_TAIL_PATTERN.test(remainder);
  }
  return (
    IRREVERSIBLE_ACTION_PATTERN.test(normalized) ||
    IRREVERSIBLE_ACTION_PATTERN.test(compact) ||
    // Tokens, not substrings: "S e n d email" and "Sned" are gated, while "Sender settings" and
    // "Deleted items" stay ordinary navigation.
    gateLatinLabel(normalized)
  );
}

/**
 * Advisory only: describes how strongly an element *looks* like a control. It is used for the
 * confirmation copy and for statistics, **never** for the release decision.
 *
 * An earlier revision made this predicate the gate itself, which turned the gate fail-open: any real
 * action handler on a `<div onclick>`, an `<a>`, a `contenteditable` or a custom element stopped
 * being gated, so a genuine "发送" moved from "asks the user" to "just sends". The gate therefore
 * keys on the label alone (fail-closed) and this predicate only softens the wording.
 */
export function isOperableControlTarget(input = {}) {
  const tag = String(input.tag ?? "").trim().toLowerCase();
  if (tag === "button" || tag === "input") return true;
  if (String(input.role ?? "").trim().toLowerCase() === "button") return true;
  const type = String(input.type ?? "").trim().toLowerCase();
  // <input type="submit|button"> is covered by the tag rule; this keeps the intent explicit for
  // callers that report only role/type metadata.
  return type === "submit" || type === "button";
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
  "This control is an irreversible external action (payment, send, delete, publish or permission change). A " +
  "confirmation request has already been opened for the user in the browser: ask the user to click \"Allow once\" " +
  "there, then retry this exact action with the approvalId the connector returned. Nothing has been performed yet; " +
  "do not retry without that approvalId and do not switch to another selector to get around it.";

/**
 * One decision point for the gate, so every action that can trigger an irreversible effect is refused
 * in exactly the same shape. `null` means the action may proceed.
 */
export function decideIrreversibleAction(input = {}) {
  const action = String(input.action ?? "");
  const name = typeof input.name === "string" ? input.name : "";
  if (!name) return null;
  if (action === "click" || action === "type" || action === "set_select_value") {
    if (!isIrreversibleActionName(name)) return null;
  } else if (action === "press") {
    const key = String(input.key ?? "");
    // Space activates a focused button just like Enter, so both are gated through the shared
    // predicate; a keyboard-only path (Tab to focus, then activate) must not bypass the click gate.
    if (!isActivationKey(key) || !isIrreversibleActionName(name)) return null;
  } else {
    return null;
  }
  // Fail-closed by design: a matching label asks the user, no matter which element carries it.
  // Judging by tag/role turned the gate fail-open — `<div onclick="send()">发送</div>`, `<a>`,
  // `contenteditable` and custom elements are ordinary buttons on real sites, so a real action
  // handler stopped being gated entirely. The one narrowing is the completed-state prefix: a label
  // like "已发送"/"已删除" names a place, and the gate releases it only when what follows that prefix
  // is a place-name tail (COMPLETED_STATE_TAIL_PATTERN). Still no element-shape judgement, and any
  // other tail — "已发送 Forward", "已发送，再次发送" — keeps the gate closed. The cost it removes was
  // a pointless "Allow once" click on a plain navigation item. `isOperableControlTarget`
  // deliberately stays out of this decision; it only softens the confirmation wording.
  return {
    ok: false,
    code: CONFIRMATION_REQUIRED_CODE,
    effect: "confirmation_required",
    action,
    signal: CONFIRMATION_REQUIRED_CODE,
    target: {
      name: name.slice(0, 200),
      ...(input.tag ? { tag: String(input.tag) } : {}),
      ...(input.role ? { role: String(input.role) } : {}),
      ...(input.type ? { type: String(input.type) } : {}),
    },
    // Copy/statistics only (the approval window and logs): never read to decide whether to release.
    operableControl: isOperableControlTarget(input),
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
    const targetBefore = result.targetBefore;
    const targetAfter = result.targetAfter;
    const movedTarget = targetBefore && targetAfter && (targetBefore.scrollTop !== targetAfter.scrollTop || targetBefore.scrollLeft !== targetAfter.scrollLeft);
    const movedContainer = Array.isArray(after.containers) && after.containers.some(({ before: b, after: a }) => b.scrollTop !== a.scrollTop || b.scrollLeft !== a.scrollLeft);
    const moved = movedTarget || movedContainer || before.scrollX !== after.scrollX || before.scrollY !== after.scrollY;
    return moved
      ? { status: "verified", signal: "scroll_changed" }
      : { status: "uncertain", signal: "no_observable_effect", message: "The scroll position did not change." };
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

/**
 * Success signal for `set_select_value`. Published as a constant because three sides name it — the
 * extension handler, the desktop feature table and the tests.
 */
export const SELECT_VALUE_SET_SIGNAL = "select_value_set";

/**
 * Failure codes reported for `set_select_value`. The set operation re-raises the page-side codes
 * verbatim so a model can tell "no such option" from "several options" without parsing prose.
 * Two of these are synthesized in the worker because no page ever returns them:
 * `SELECT_VALUE_NOT_APPLIED` (the read-back disagrees with the request) and
 * `SELECT_VALUE_UNVERIFIED` (the read-back never came back at all). Everything else can arrive from
 * the page — including `SELECT_GONE`, `STALE_PAGE_REVISION` and `REGION_NOT_FOUND`, which the
 * read-back still returns when it cannot find the select it set.
 */
export const SELECT_VALUE_CODES = Object.freeze({
  NOT_A_SELECT: "NOT_A_SELECT",
  SELECT_DISABLED: "SELECT_DISABLED",
  SELECT_MULTIPLE_UNSUPPORTED: "SELECT_MULTIPLE_UNSUPPORTED",
  OPTION_TARGET_REQUIRED: "OPTION_TARGET_REQUIRED",
  OPTION_NOT_FOUND: "OPTION_NOT_FOUND",
  OPTION_AMBIGUOUS: "OPTION_AMBIGUOUS",
  OPTION_DISABLED: "OPTION_DISABLED",
  SELECT_VALUE_NOT_APPLIED: "SELECT_VALUE_NOT_APPLIED",
  // The read-back itself failed, so nothing can be claimed about the applied option. The page's own
  // reason is preferred when it has one (`SELECT_GONE`, `STALE_PAGE_REVISION`, `REGION_NOT_FOUND`).
  SELECT_VALUE_UNVERIFIED: "SELECT_VALUE_UNVERIFIED",
  // The set itself refused: the marker written before the set and the element the target resolves
  // to are not the same node (the page moved or swapped the control in between), or the selector
  // names no single control because several elements match it.
  SELECT_TARGET_CONFLICT: "SELECT_TARGET_CONFLICT",
  SELECT_TARGET_AMBIGUOUS: "SELECT_TARGET_AMBIGUOUS",
  // Identity is proven by a token-to-node reference kept in the extension's isolated world, never by
  // a DOM attribute: `cloneNode(true)` copies attributes, so an attribute can be inherited by a
  // different control that then reads back the wrong value and looks verified. These three say the
  // proof was unavailable, so the set is refused rather than written to a guess.
  SELECT_TOKEN_UNAVAILABLE: "SELECT_TOKEN_UNAVAILABLE",
  SELECT_TOKEN_REQUIRED: "SELECT_TOKEN_REQUIRED",
  SELECT_TOKEN_FAILED: "SELECT_TOKEN_FAILED",
  // `type` used to write into a native <select> directly, which bypassed option matching, the
  // identity proof and the read-back. It is refused now and points at `set_select_value`.
  TYPE_ON_SELECT_REFUSED: "TYPE_ON_SELECT_REFUSED",
  SELECT_GONE: "SELECT_GONE",
  STALE_PAGE_REVISION: "STALE_PAGE_REVISION",
  REGION_NOT_FOUND: "REGION_NOT_FOUND",
});

/**
 * Verification for `set_select_value`: the only accepted proof is a read-back taken *after* the
 * `input`/`change` events were dispatched. Dispatching an event proves nothing — a framework
 * listener can re-render the select back to its previous option, and then the page state is what the
 * user would see, not what was asked for. So a mismatch is a failure, never a success.
 *
 * The page reports `requested` (the option it matched) and `after` (what the select reads back
 * once the events settled); both value and visible label must agree.
 */
export function verifySelectValueEffect(input = {}) {
  const result = input.result;
  if (!result || typeof result !== "object") {
    return { status: "uncertain", signal: "no_result", message: "The connector returned no observation for this action." };
  }
  if (result.ok === false) {
    return {
      status: "failed",
      signal: typeof result.code === "string" && result.code ? result.code : "SELECT_FAILED",
      message: typeof result.message === "string" && result.message
        ? result.message
        : "The connector could not set the select value.",
    };
  }

  const requested = result.requested && typeof result.requested === "object" ? result.requested : {};
  const after = result.after && typeof result.after === "object" ? result.after : {};
  if (after.value === null || after.value === undefined) {
    // A read-back is the only accepted proof, so an unreadable select is never `verified` — and the
    // caller must not treat it as ok either. `code` carries the page's own reason (`SELECT_GONE`
    // when the select was removed, `NOT_A_SELECT` when it changed type), falling back to
    // SELECT_VALUE_UNVERIFIED when the read itself never came back.
    const sourceCode = typeof after.code === "string" && after.code ? after.code : "";
    return {
      status: "uncertain",
      signal: "select_value_not_readable",
      code: sourceCode || SELECT_VALUE_CODES.SELECT_VALUE_UNVERIFIED,
      message: sourceCode === SELECT_VALUE_CODES.SELECT_GONE
        ? "The select is no longer in the page, so the applied option could not be verified."
        : "The select value cannot be read back, so the applied option could not be verified.",
    };
  }

  const requestedValue = String(requested.value ?? "");
  const appliedValue = String(after.value);
  if (appliedValue !== requestedValue) {
    return {
      status: "failed",
      signal: SELECT_VALUE_CODES.SELECT_VALUE_NOT_APPLIED,
      message: `The change event was dispatched but the select reads back ${JSON.stringify(
        appliedValue,
      )} instead of ${JSON.stringify(requestedValue)}; a page listener rejected or reverted the selection.`,
    };
  }

  const requestedLabel = typeof requested.label === "string" ? requested.label : "";
  const appliedLabel = typeof after.label === "string" ? after.label : "";
  if (requestedLabel && appliedLabel !== requestedLabel) {
    return {
      status: "failed",
      signal: SELECT_VALUE_CODES.SELECT_VALUE_NOT_APPLIED,
      message: `The select value was applied but the selected option reads ${JSON.stringify(
        appliedLabel,
      )} instead of ${JSON.stringify(requestedLabel)}.`,
    };
  }

  return { status: "verified", signal: SELECT_VALUE_SET_SIGNAL };
}

const LOW_VALUE_NETWORK_TYPES = new Set(["image", "media", "font", "stylesheet", "manifest"]);const LOW_VALUE_NETWORK_URL = /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp|css|woff2?|ttf|otf|eot|map)([?#]|$)/i;

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
