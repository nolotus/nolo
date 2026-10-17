/**
 * Browser Consent Action Preparation
 *
 * Prepares immutable action challenge bindings for user consent.
 * Connects in-tab DOM capture to canonical WebCrypto fingerprinting.
 *
 * SAFETY CONTRACT:
 * 1. Read-Only / Zero-Execution: NEVER triggers DOM mutations, clicks, submissions, or side effects.
 * 2. No Autonomous Grant: Preparation produces an immutable challenge binding; it NEVER grants approval
 *    or bypasses irreversible action gates.
 * 3. Secrecy & Privacy: Raw form values, passwords, input text, and URL query strings / hashes are NEVER
 *    returned in RPC responses, summaries, or error messages.
 * 4. Fail-Closed Freshness: Missing or stale page revision, replaced elements, or navigating pages
 *    invalidate the binding fail-closed.
 */

export const ALLOWED_PREPARE_ACTIONS = Object.freeze(["click", "type", "press"]);

/**
 * Sanitizes an error message so it never echoes URL query parameters, hashes, or secret inputs.
 * @param {unknown} error
 * @returns {string}
 */
export function sanitizeErrorMessage(error) {
  const rawMessage = error instanceof Error ? error.message : String(error ?? "");
  if (!rawMessage) return "Action preparation failed";

  // Redact URL query strings and fragments
  let cleaned = rawMessage.replace(/https?:\/\/[^\s"'<>?#]+(\?[^\s"'<>#]*)?(#[^\s"'<>]*)?/gi, (match) => {
    try {
      const u = new URL(match);
      return `${u.protocol}//${u.host}${u.pathname}`;
    } catch {
      return match.split("?")[0].split("#")[0];
    }
  });

  // Redact stray query param fragments (?key=val)
  cleaned = cleaned.replace(/\?[a-zA-Z0-9_.~%&=-]+/g, "?[REDACTED]");
  return cleaned;
}

/**
 * Extracts strictly the scheme + host + port (origin) from a URL string.
 * Never includes pathname, search, or hash.
 * @param {string} rawUrl
 * @returns {string}
 */
export function extractSafeOrigin(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) return "unknown";
  try {
    const parsed = new URL(rawUrl);
    return parsed.origin;
  } catch {
    return "unknown";
  }
}

/**
 * Builds deterministic action args incorporating text, key, and form submit metadata.
 * @param {{
 *   action: string;
 *   targetMetadata?: Record<string, any> | null;
 *   formSnapshot?: Record<string, any> | null;
 *   payload: Record<string, any>;
 * }} options
 * @returns {Record<string, unknown>}
 */
export function buildPrepareArgs({ action, targetMetadata, formSnapshot, payload }) {
  const args = {};

  if (action === "type") {
    args.text = typeof payload.text === "string" ? payload.text : "";
    args.clearFirst = payload.clearFirst !== false;
  } else if (action === "press") {
    args.key = typeof payload.key === "string" ? payload.key : "";
  }

  // Button overrides & Link href
  if (targetMetadata?.href) {
    args.href = targetMetadata.href;
  }
  if (targetMetadata?.formAction) {
    args.formAction = targetMetadata.formAction;
  }
  if (targetMetadata?.formMethod) {
    args.formMethod = targetMetadata.formMethod;
  }
  if (targetMetadata?.formTargetAttr) {
    args.formTarget = targetMetadata.formTargetAttr;
  }

  // Form submit metadata
  const formAction = formSnapshot?.action || targetMetadata?.action;
  if (formAction) {
    args.action = formAction;
  }
  const formMethod = formSnapshot?.method || targetMetadata?.method;
  if (formMethod) {
    args.method = formMethod;
  }
  const formTarget = formSnapshot?.target || targetMetadata?.formTarget;
  if (formTarget) {
    args.target = formTarget;
  }

  return args;
}

/**
 * Short-TTL bounded store for prepared action records.
 * Internal to extension background; NEVER provides an authorization or execution RPC.
 *
 * @param {{ ttlMs?: number; maxEntries?: number; now?: () => number }} [options]
 */
export function createPreparedActionStore(options = {}) {
  const ttlMs = options.ttlMs || 60_000;
  const maxEntries = options.maxEntries || 50;
  const now = typeof options.now === "function" ? options.now : () => Date.now();
  const store = new Map();

  function prune() {
    const currentTime = now();
    for (const [key, record] of store.entries()) {
      if (currentTime >= record.expiresAt) {
        store.delete(key);
      }
    }
    while (store.size > maxEntries) {
      const oldestKey = store.keys().next().value;
      store.delete(oldestKey);
    }
  }

  function save(record) {
    prune();
    const id = record.prepareId;
    store.set(id, {
      ...record,
      createdAt: now(),
      expiresAt: now() + ttlMs,
    });
    return id;
  }

  function get(prepareId) {
    prune();
    const record = store.get(prepareId);
    if (!record) return null;
    if (now() >= record.expiresAt) {
      store.delete(prepareId);
      return null;
    }
    return record;
  }

  function clear() {
    store.clear();
  }

  function size() {
    prune();
    return store.size;
  }

  return { save, get, clear, size, ttlMs, maxEntries };
}

/**
 * Prepares an action for consent verification.
 *
 * @param {Record<string, any>} payload
 * @param {{
 *   refRegistry: { snapshot(tabId: string): any; ttlMs?: number; now?: () => number };
 *   executeInTab: (tabId: any, func: any, args?: any[]) => Promise<any>;
 *   captureBrowserConsentState: (options?: any) => Promise<any>;
 *   createActionFingerprint: (snapshot: any, options?: any) => Promise<any>;
 *   store?: ReturnType<typeof createPreparedActionStore>;
 *   createError?: (code: string, message: string) => Error;
 * }} deps
 */
export async function handlePrepareBrowserAction(payload = {}, deps) {
  const createErr = deps.createError || ((code, message) => {
    const err = new Error(message);
    err.code = code;
    return err;
  });

  // 1. Action validation (exact allowlist: click, type, press)
  const action = String(payload.action || "").toLowerCase().trim();
  if (!ALLOWED_PREPARE_ACTIONS.includes(action)) {
    throw createErr(
      "UNSUPPORTED_ACTION",
      `Action '${action || "empty"}' is not supported for preparation; must be click, type, or press.`,
    );
  }

  // 2. Reject elementRef targeting fail-closed
  if (payload.ref || payload.elementRef) {
    throw createErr(
      "UNSUPPORTED_TARGET_KIND",
      "elementRef targeting is not supported for action preparation; use selector or active.",
    );
  }

  // 3. Validate tabId
  const tabId = String(payload.tabId ?? "").trim();
  if (!tabId) {
    throw createErr("MISSING_TAB_ID", "tabId is required for action preparation.");
  }

  // 4. Validate refRegistry page revision (fail-closed: cannot fake constant)
  const registrySnapshot = deps.refRegistry.snapshot(tabId);
  if (!registrySnapshot) {
    throw createErr(
      "STALE_PAGE_REVISION",
      "No active page observation found for tab. Read page before preparing action.",
    );
  }

  const now = typeof deps.refRegistry.now === "function" ? deps.refRegistry.now() : Date.now();
  if (
    typeof deps.refRegistry.ttlMs === "number" &&
    typeof registrySnapshot.observedAt === "number" &&
    now - registrySnapshot.observedAt > deps.refRegistry.ttlMs
  ) {
    throw createErr(
      "STALE_PAGE_REVISION",
      "Page observation has expired. Read page before preparing action.",
    );
  }

  const pageRevision = String(registrySnapshot.pageRevision || "").trim();
  if (!pageRevision) {
    throw createErr(
      "MISSING_PAGE_REVISION",
      "Page observation lacks pageRevision. Read page before preparing action.",
    );
  }

  // 5. Target selection options
  const captureOptions = {
    rejectAsResult: true,
  };
  if (payload.active === true || (action === "press" && !payload.selector)) {
    captureOptions.active = true;
  } else if (typeof payload.selector === "string" && payload.selector.trim()) {
    captureOptions.selector = payload.selector.trim();
  } else {
    throw createErr(
      "MISSING_TARGET_SELECTOR",
      "Target selector or active flag is required for action preparation.",
    );
  }

  // 6. Execute in-tab DOM capture
  let captureResult;
  try {
    captureResult = await deps.executeInTab(tabId, deps.captureBrowserConsentState, [captureOptions]);
  } catch (error) {
    throw createErr(
      error?.code || "CAPTURE_FAILED",
      sanitizeErrorMessage(error?.message || error),
    );
  }

  if (!captureResult || captureResult.ok === false) {
    throw createErr(
      captureResult?.code || "CAPTURE_FAILED",
      sanitizeErrorMessage(captureResult?.message || "DOM capture failed"),
    );
  }

  // 7. Build deterministic action args incorporating submit metadata
  const actionArgs = buildPrepareArgs({
    action,
    targetMetadata: captureResult.target,
    formSnapshot: captureResult.form,
    payload,
  });

  // 8. Assemble snapshot for canonical fingerprinting
  // owner & dialogId from payload are untrusted identifiers; host authentication remains required
  const owner = typeof payload.owner === "string" && payload.owner.trim() ? payload.owner.trim() : "untrusted-client";
  const dialogId = typeof payload.dialogId === "string" && payload.dialogId.trim() ? payload.dialogId.trim() : "untrusted-dialog";

  const snapshotInput = {
    document: {
      documentId: captureResult.document.documentId,
      url: captureResult.document.url,
      pageRevision,
    },
    tabId,
    target: {
      targetId: captureResult.target.targetId,
      tag: captureResult.target.tag,
      name: captureResult.target.name,
    },
    action: {
      action,
      args: actionArgs,
    },
    form: captureResult.form?.fields || null,
    owner,
    dialogId,
  };

  const fingerprintResult = await deps.createActionFingerprint(snapshotInput);

  // 9. Generate opaque prepare ID and store record in private store
  const randomHex = typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `prep-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
  const prepareId = `prep_${randomHex.replace(/-/g, "")}`;

  const store = deps.store;
  if (store && typeof store.save === "function") {
    store.save({
      prepareId,
      binding: fingerprintResult.binding,
      fingerprint: fingerprintResult.fingerprint,
      action,
      tabId,
      owner,
      dialogId,
    });
  }

  // 10. Assemble and return safe public description (Strict Secrecy)
  // NEVER exposes raw passwords, form values, URL query strings, or raw element selectors.
  const origin = extractSafeOrigin(captureResult.document.url);

  return {
    ok: true,
    prepareId,
    origin,
    fingerprint: fingerprintResult.fingerprint,
    argsDigest: fingerprintResult.argsDigest,
    formDigest: fingerprintResult.formDigest,
    summary: fingerprintResult.summary,
    fieldCount: fingerprintResult.fieldCount,
    hasSensitiveFields: Boolean(captureResult.form?.fields?.some((f) => f.sensitive)),
    securityNotice: "PREPARE_ONLY_NO_GRANT: Action prepared for host authorization. Cannot execute directly.",
  };
}
