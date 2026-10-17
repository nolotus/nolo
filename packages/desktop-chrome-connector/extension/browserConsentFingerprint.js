/**
 * Browser Consent Fingerprint & Canonical Action Binding
 *
 * Strict, host-neutral module generating immutable action descriptions and SHA-256
 * fingerprints from pre-collected browser action snapshots using WebCrypto.
 *
 * SAFETY CONTRACT:
 * 1. WebCrypto Only: Uses standard crypto.subtle.digest("SHA-256", ...) exclusively.
 * 2. Pure Snapshot Processor: Does not collect or manipulate DOM; consumes normalized snapshot only.
 * 3. Strict Schema: Rejects loose aliases; expects explicit, canonical identifiers.
 * 4. Secrecy: Form field values (including passwords, hidden inputs, amounts, memo) participate
 *    strictly in hash computation and are NEVER returned in outputs, summaries, or error messages.
 * 5. Safe Summary: Never includes URL queries, hashes, or form values.
 * 6. File Binding: Non-empty files require contentDigest; filename + size alone is rejected fail-closed.
 */

export const MAX_CANONICAL_STRING_LENGTH = 512 * 1024; // 512 KB
export const MAX_CANONICAL_ARRAY_LENGTH = 1000;
export const MAX_CANONICAL_OBJECT_KEYS = 500;
export const MAX_CANONICAL_DEPTH = 16;
export const MAX_FORM_FIELDS = 200;

export class FingerprintValidationError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   */
  constructor(message, code = "FINGERPRINT_VALIDATION_ERROR") {
    super(message);
    this.name = "FingerprintValidationError";
    this.code = code;
  }
}

/**
 * Computes standard SHA-256 via WebCrypto crypto.subtle.digest or an injected digest function.
 * @param {string | Uint8Array} data
 * @param {((data: string | Uint8Array) => Promise<string | Uint8Array> | string | Uint8Array) | null} [digestFn]
 * @returns {Promise<string>} 64 lowercase hexadecimal characters
 */
export async function computeSha256(data, digestFn = null) {
  if (typeof digestFn === "function") {
    const res = await digestFn(data);
    if (typeof res === "string") return res.toLowerCase();
    if (res instanceof Uint8Array) {
      return Array.from(res).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    throw new FingerprintValidationError("Injected digestFn must return string or Uint8Array");
  }

  const cryptoObj = typeof globalThis !== "undefined" ? globalThis.crypto : null;
  if (!cryptoObj?.subtle?.digest) {
    throw new FingerprintValidationError("WebCrypto crypto.subtle.digest is required", "MISSING_WEBCRYPTO");
  }

  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  if (!(bytes instanceof Uint8Array)) {
    throw new FingerprintValidationError("SHA-256 data must be a string or Uint8Array");
  }

  const buffer = await cryptoObj.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Deterministically serializes values into canonical JSON.
 * Rejects circular structures, undefined, NaN, Infinity, functions, symbols, BigInt,
 * and out-of-bounds payloads fail-closed.
 *
 * @param {unknown} value
 * @param {number} [depth=0]
 * @param {WeakSet<object>} [seen=new WeakSet()]
 * @returns {string}
 */
export function canonicalSerialize(value, depth = 0, seen = new WeakSet()) {
  if (depth > MAX_CANONICAL_DEPTH) {
    throw new FingerprintValidationError(`Exceeded maximum depth of ${MAX_CANONICAL_DEPTH}`, "DEPTH_LIMIT_EXCEEDED");
  }

  if (value === undefined) {
    throw new FingerprintValidationError("Canonical serialization rejects 'undefined'", "INVALID_TYPE");
  }

  if (typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") {
    throw new FingerprintValidationError(`Canonical serialization rejects '${typeof value}'`, "INVALID_TYPE");
  }

  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new FingerprintValidationError(`Canonical serialization rejects non-finite number: ${value}`, "INVALID_NUMBER");
    }
    return Object.is(value, -0) ? "0" : String(value);
  }

  if (typeof value === "string") {
    if (value.length > MAX_CANONICAL_STRING_LENGTH) {
      throw new FingerprintValidationError(`String length exceeds limit ${MAX_CANONICAL_STRING_LENGTH}`, "STRING_BOUND_EXCEEDED");
    }
    return JSON.stringify(value);
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      throw new FingerprintValidationError("Circular reference detected", "CIRCULAR_REFERENCE");
    }
    seen.add(value);

    try {
      if (Array.isArray(value)) {
        if (value.length > MAX_CANONICAL_ARRAY_LENGTH) {
          throw new FingerprintValidationError(`Array length exceeds limit ${MAX_CANONICAL_ARRAY_LENGTH}`, "ARRAY_BOUND_EXCEEDED");
        }
        const items = value.map((item) => canonicalSerialize(item, depth + 1, seen));
        return `[${items.join(",")}]`;
      }

      const keys = Object.keys(value).sort();
      if (keys.length > MAX_CANONICAL_OBJECT_KEYS) {
        throw new FingerprintValidationError(`Object key count exceeds limit ${MAX_CANONICAL_OBJECT_KEYS}`, "OBJECT_BOUND_EXCEEDED");
      }

      const entries = keys.map((key) => {
        if (key.length > MAX_CANONICAL_STRING_LENGTH) {
          throw new FingerprintValidationError("Object key exceeds length limit", "KEY_BOUND_EXCEEDED");
        }
        return `${JSON.stringify(key)}:${canonicalSerialize(value[key], depth + 1, seen)}`;
      });
      return `{${entries.join(",")}}`;
    } finally {
      seen.delete(value);
    }
  }

  throw new FingerprintValidationError(`Unsupported value type: ${typeof value}`, "UNSUPPORTED_TYPE");
}

/**
 * Computes canonical SHA-256 digest of any value.
 * @param {unknown} value
 * @param {((data: string | Uint8Array) => Promise<string | Uint8Array> | string | Uint8Array) | null} [digestFn]
 * @returns {Promise<string>}
 */
export async function computeCanonicalDigest(value, digestFn = null) {
  const serialized = canonicalSerialize(value);
  return computeSha256(serialized, digestFn);
}

/**
 * Validates a single form field from pre-collected DOM snapshot.
 * Requires stable unique elementId from the DOM collector (e.g. radios share name, so elementId is required).
 *
 * @param {unknown} field
 * @param {number} index
 * @returns {Record<string, unknown>}
 */
function validateFormField(field, index) {
  if (typeof field !== "object" || field === null || Array.isArray(field)) {
    throw new FingerprintValidationError(`Form field at index ${index} must be an object`, "INVALID_FIELD");
  }

  const raw = /** @type {Record<string, unknown>} */ (field);
  const elementId = typeof raw.elementId === "string" ? raw.elementId.trim() : "";
  if (!elementId) {
    throw new FingerprintValidationError(
      `Form field at index ${index} missing required unique 'elementId'`,
      "MISSING_ELEMENT_ID"
    );
  }

  const type = typeof raw.type === "string" && raw.type.trim() ? raw.type.trim().toLowerCase() : "text";
  const isSensitive = type === "password" || type === "hidden" || Boolean(raw.sensitive);

  const canonical = {
    elementId,
    type,
  };
  if (typeof raw.name === "string" && raw.name.trim()) {
    canonical.name = raw.name.trim();
  }

  if (type === "file") {
    const rawFiles = Array.isArray(raw.files) ? raw.files : raw.file && typeof raw.file === "object" ? [raw.file] : [];
    const files = [];

    for (let i = 0; i < rawFiles.length; i++) {
      const f = rawFiles[i];
      if (typeof f !== "object" || f === null) {
        throw new FingerprintValidationError(`File descriptor in '${elementId}' must be an object`, "INVALID_FILE");
      }
      const name = String(f.name ?? "").trim();
      const size = Number(f.size ?? 0);
      if (!Number.isFinite(size) || size < 0) {
        throw new FingerprintValidationError(`File size in '${elementId}' must be non-negative finite number`, "INVALID_FILE_SIZE");
      }
      const mimeType = String(f.type ?? "").trim();
      const contentDigest = typeof f.contentDigest === "string" ? f.contentDigest.trim() : null;

      // Fail-closed security rule: Non-empty file requires verified contentDigest
      if (size > 0 || name.length > 0) {
        if (!contentDigest) {
          throw new FingerprintValidationError(
            `File in '${elementId}' has non-empty content but lacks contentDigest (fail-closed)`,
            "MISSING_FILE_CONTENT_DIGEST"
          );
        }
      }

      files.push({ contentDigest, name, size, type: mimeType });
    }

    files.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    canonical.files = files;
  } else if (type === "checkbox" || type === "radio") {
    canonical.checked = Boolean(raw.checked);
    canonical.value = raw.value !== undefined ? String(raw.value) : "on";
  } else if (type === "select" || type === "select-one" || type === "select-multiple") {
    let selected = [];
    if (Array.isArray(raw.selected)) {
      selected = raw.selected.map(String);
    } else if (raw.value !== undefined && raw.value !== null) {
      selected = [String(raw.value)];
    }
    selected.sort();
    canonical.selected = selected;
  } else {
    // Normal text, password, hidden, amount, email, etc.
    canonical.value = raw.value !== undefined && raw.value !== null ? String(raw.value) : "";
  }

  if (isSensitive) {
    canonical.sensitive = true;
  }

  return canonical;
}

/**
 * Validates form fields and computes formDigest.
 * Never returns raw fields or sensitive values to caller.
 *
 * @param {unknown} fieldsInput
 * @param {((data: string | Uint8Array) => Promise<string | Uint8Array> | string | Uint8Array) | null} [digestFn]
 * @returns {Promise<{
 *   formDigest: string;
 *   fieldCount: number;
 *   hasSensitiveFields: boolean;
 * }>}
 */
export async function computeFormDigest(fieldsInput, digestFn = null) {
  if (fieldsInput === undefined || fieldsInput === null) {
    const emptyDigest = await computeSha256("[]", digestFn);
    return { fieldCount: 0, formDigest: emptyDigest, hasSensitiveFields: false };
  }

  if (!Array.isArray(fieldsInput)) {
    throw new FingerprintValidationError("Form input must be an array of fields", "INVALID_FORM_INPUT");
  }

  if (fieldsInput.length > MAX_FORM_FIELDS) {
    throw new FingerprintValidationError(`Form fields exceed maximum limit of ${MAX_FORM_FIELDS}`, "FORM_LIMIT_EXCEEDED");
  }

  const seenElementIds = new Set();
  const canonicalList = [];
  let hasSensitiveFields = false;

  for (let i = 0; i < fieldsInput.length; i++) {
    const field = validateFormField(fieldsInput[i], i);
    if (seenElementIds.has(field.elementId)) {
      throw new FingerprintValidationError(
        `Duplicate form elementId detected: '${field.elementId}'`,
        "DUPLICATE_ELEMENT_ID"
      );
    }
    seenElementIds.add(field.elementId);
    if (field.sensitive) hasSensitiveFields = true;
    canonicalList.push(field);
  }

  // Stable ordering by elementId guarantees DOM reordering invariance
  canonicalList.sort((a, b) => (a.elementId < b.elementId ? -1 : a.elementId > b.elementId ? 1 : 0));

  const formDigest = await computeSha256(canonicalSerialize(canonicalList), digestFn);

  return {
    fieldCount: canonicalList.length,
    formDigest,
    hasSensitiveFields,
  };
}

/**
 * Computes deterministic SHA-256 digest of action arguments.
 * @param {unknown} argsInput
 * @param {((data: string | Uint8Array) => Promise<string | Uint8Array> | string | Uint8Array) | null} [digestFn]
 * @returns {Promise<string>}
 */
export async function computeArgsDigest(argsInput, digestFn = null) {
  if (argsInput === undefined || argsInput === null) {
    return computeSha256("{}", digestFn);
  }
  if (typeof argsInput !== "object" || Array.isArray(argsInput)) {
    throw new FingerprintValidationError("Action args must be a non-null object", "INVALID_ACTION_ARGS");
  }
  return computeCanonicalDigest(argsInput, digestFn);
}

/**
 * Builds a non-sensitive summary strictly omitting URL queries, hashes, and form values.
 *
 * @param {{
 *   action: string;
 *   target: { targetId: string; tag?: string; name?: string };
 *   url: string;
 *   tabId: string;
 *   fieldCount: number;
 *   formDigest: string;
 *   fingerprint: string;
 * }} params
 * @returns {string}
 */
export function buildActionSummary(params) {
  const { action, target, url, tabId, fieldCount, formDigest, fingerprint } = params;
  const tagPart = target.tag ? `<${target.tag}>` : "element";
  const namePart = target.name ? `'${target.name}'` : `'${target.targetId}'`;

  // Strip query string and hash strictly from URL to avoid leaking parameters
  const cleanUrl = url.split("?")[0].split("#")[0];

  const parts = [
    `Action '${action}' on ${tagPart} ${namePart} at ${cleanUrl} (tab: ${tabId})`,
  ];
  if (fieldCount > 0) {
    parts.push(`form: ${fieldCount} fields [formDigest: ${formDigest.slice(0, 12)}...]`);
  }
  parts.push(`binding: ${fingerprint.slice(0, 16)}`);

  return parts.join("; ");
}

/**
 * Resolves a strict browser action snapshot into an immutable cryptographic binding and SHA-256 fingerprint.
 *
 * @param {unknown} snapshotInput
 * @param {{
 *   owner?: string;
 *   digestFn?: ((data: string | Uint8Array) => Promise<string | Uint8Array> | string | Uint8Array) | null;
 * }} [options]
 * @returns {Promise<Readonly<{
 *   fingerprint: string;
 *   formDigest: string;
 *   argsDigest: string;
 *   summary: string;
 *   fieldCount: number;
 *   binding: Readonly<{
 *     action: string;
 *     argsDigest: string;
 *     browser: string;
 *     dialog: string;
 *     document: string;
 *     formDigest: string;
 *     owner: string;
 *     pageRevision: string;
 *     tab: string;
 *     target: string;
 *     url: string;
 *   }>;
 * }>>}
 */
export async function createActionFingerprint(snapshotInput, options = {}) {
  if (typeof snapshotInput !== "object" || snapshotInput === null || Array.isArray(snapshotInput)) {
    throw new FingerprintValidationError("Action snapshot must be an object", "INVALID_SNAPSHOT");
  }

  const snap = /** @type {Record<string, unknown>} */ (snapshotInput);

  // 1. Strict Document schema
  const doc = snap.document;
  if (typeof doc !== "object" || doc === null || Array.isArray(doc)) {
    throw new FingerprintValidationError("Snapshot missing required 'document' object", "MISSING_DOCUMENT");
  }
  const documentId = typeof doc.documentId === "string" ? doc.documentId.trim() : "";
  const url = typeof doc.url === "string" ? doc.url.trim() : "";
  const pageRevision = typeof doc.pageRevision === "string" ? doc.pageRevision.trim() : "";
  if (!documentId) throw new FingerprintValidationError("document.documentId must be a non-empty string", "MISSING_DOCUMENT_ID");
  if (!url) throw new FingerprintValidationError("document.url must be a non-empty string", "MISSING_DOCUMENT_URL");
  if (!pageRevision) throw new FingerprintValidationError("document.pageRevision must be a non-empty string", "MISSING_PAGE_REVISION");

  // 2. Strict Tab schema
  const tabId = typeof snap.tabId === "string" ? snap.tabId.trim() : "";
  if (!tabId) throw new FingerprintValidationError("Snapshot missing required non-empty 'tabId'", "MISSING_TAB_ID");

  // 3. Strict Target schema
  const target = snap.target;
  if (typeof target !== "object" || target === null || Array.isArray(target)) {
    throw new FingerprintValidationError("Snapshot missing required 'target' object", "MISSING_TARGET");
  }
  const targetId = typeof target.targetId === "string" ? target.targetId.trim() : "";
  if (!targetId) throw new FingerprintValidationError("target.targetId must be a non-empty string", "MISSING_TARGET_ID");
  const targetTag = typeof target.tag === "string" ? target.tag.trim() : "";
  const targetName = typeof target.name === "string" ? target.name.trim() : "";

  // 4. Strict Action schema
  const actionObj = snap.action;
  if (typeof actionObj !== "object" || actionObj === null || Array.isArray(actionObj)) {
    throw new FingerprintValidationError("Snapshot missing required 'action' object", "MISSING_ACTION");
  }
  const action = typeof actionObj.action === "string" ? actionObj.action.trim() : "";
  if (!action) throw new FingerprintValidationError("action.action must be a non-empty string", "MISSING_ACTION_NAME");

  // 5. Compute Digests asynchronously
  const digestFn = options.digestFn ?? null;
  const { formDigest, fieldCount } = await computeFormDigest(snap.form, digestFn);
  const argsDigest = await computeArgsDigest(actionObj.args, digestFn);

  // 6. Authority Scopes
  const owner = typeof snap.owner === "string" && snap.owner.trim() ? snap.owner.trim() : typeof options.owner === "string" && options.owner.trim() ? options.owner.trim() : "default-owner";
  const dialog = typeof snap.dialogId === "string" && snap.dialogId.trim() ? snap.dialogId.trim() : "default-dialog";
  const browser = typeof snap.browserId === "string" && snap.browserId.trim() ? snap.browserId.trim() : "default-browser";

  // 7. Canonical Binding (11 keys matching BrowserConsentBinding strictly)
  const binding = Object.freeze({
    action,
    argsDigest,
    browser,
    dialog,
    document: documentId,
    formDigest,
    owner,
    pageRevision,
    tab: tabId,
    target: targetId,
    url,
  });

  const canonicalBindingJson = canonicalSerialize(binding);
  const fingerprint = await computeSha256(canonicalBindingJson, digestFn);

  const summary = buildActionSummary({
    action,
    fieldCount,
    fingerprint,
    formDigest,
    tabId,
    target: { name: targetName, tag: targetTag, targetId },
    url,
  });

  return Object.freeze({
    binding,
    fieldCount,
    fingerprint,
    argsDigest,
    formDigest,
    summary,
  });
}
