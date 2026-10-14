import type { UiAskChoiceQuestionPayload } from "./uiAskChoiceTool";

export const UI_CARD_VERSION = 1 as const;
const MAX_BLOCKS = 32;
const MAX_TEXT_BYTES = 20_000;
/** Card-body budget; shared with UI projection (projectDesktopToolUiContent). */
export const UI_CARD_MAX_BYTES = 100_000;
/** Envelope allowance for the projected `{ type, card, fallbackText }` wrapper around a card. */
export const UI_CARD_ENVELOPE_MAX_BYTES = UI_CARD_MAX_BYTES + 4_096;
const MAX_COLLECTION_ITEMS = 500;
const MAX_JSON_DEPTH = 12;
const MAX_JSON_NODES = 2_000;

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type UiCardAction =
  | { type: "submit"; payload?: Record<string, JsonValue> }
  | { type: "openApp"; appId: string; url?: string };
export type UiCardBlock =
  | { type: "text"; text: string }
  | { type: "metric"; label: string; value: string; detail?: string }
  | { type: "list"; title?: string; items: string[] }
  | { type: "table"; columns: string[]; rows: string[][] }
  | { type: "choice"; question: UiAskChoiceQuestionPayload }
  | { type: "action"; action: UiCardAction };
export interface UiCard { id: string; version: typeof UI_CARD_VERSION; source: "tool"; blocks: UiCardBlock[] }
export type UiCardParseResult = { ok: true; value: UiCard } | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}
function isText(value: unknown): value is string {
  return typeof value === "string" && new TextEncoder().encode(value).byteLength <= MAX_TEXT_BYTES;
}
function isStringArray(value: unknown, max = MAX_COLLECTION_ITEMS): value is string[] {
  return Array.isArray(value) && value.length <= max && value.every(isText);
}
function isJsonValue(value: unknown, depth: number, budget: { nodes: number }): value is JsonValue {
  budget.nodes += 1;
  if (budget.nodes > MAX_JSON_NODES || depth > MAX_JSON_DEPTH) return false;
  if (value === null || typeof value === "boolean") return true;
  if (typeof value === "string") return isText(value);
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every((item) => isJsonValue(item, depth + 1, budget));
  // No per-object key filter here: nested payloads are free-form by design, and
  // hasOnlyKeys(value, Object.keys(value)) is tautological. Executable/reference
  // keys are filtered by the denylist loop below instead.
  if (!isRecord(value)) return false;
  for (const [key, item] of Object.entries(value)) {
    if (["$ref", "$expr", "expression", "script"].includes(key)) return false;
    if (!isText(key) || !isJsonValue(item, depth + 1, budget)) return false;
  }
  return true;
}
function isChoiceQuestion(value: unknown): value is UiAskChoiceQuestionPayload {
  if (!isRecord(value) || !hasOnlyKeys(value, ["id", "header", "question", "choices", "multiSelect", "allowOther", "required"])) return false;
  if (!isText(value.id) || !value.id.trim() || !isText(value.question) || !value.question.trim()) return false;
  if (value.header !== undefined && !isText(value.header)) return false;
  for (const flag of ["multiSelect", "allowOther", "required"] as const) {
    if (value[flag] !== undefined && typeof value[flag] !== "boolean") return false;
  }
  if (!Array.isArray(value.choices) || value.choices.length === 0 || value.choices.length > MAX_COLLECTION_ITEMS) return false;
  const ids = new Set<string>();
  for (const option of value.choices) {
    if (!isRecord(option) || !hasOnlyKeys(option, ["id", "label", "detail", "recommended", "userMessage"])) return false;
    if (!isText(option.label) || !option.label.trim()) return false;
    if (option.id !== undefined) {
      if (!isText(option.id) || !option.id.trim() || ids.has(option.id)) return false;
      ids.add(option.id);
    }
    if (option.detail !== undefined && !isText(option.detail)) return false;
    if (option.userMessage !== undefined && !isText(option.userMessage)) return false;
    if (option.recommended !== undefined && typeof option.recommended !== "boolean") return false;
  }
  return true;
}
function isAppUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    const hasWebProtocol = parsed.protocol === "http:" || parsed.protocol === "https:";
    const authority = value.slice(value.indexOf("//") + 2).split(/[/?#]/, 1)[0];
    return hasWebProtocol && authority.length > 0 && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}
function isBlock(value: unknown): value is UiCardBlock {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  switch (value.type) {
    case "text": return hasOnlyKeys(value, ["type", "text"]) && isText(value.text);
    case "metric": return hasOnlyKeys(value, ["type", "label", "value", "detail"]) && isText(value.label) && isText(value.value) && (value.detail === undefined || isText(value.detail));
    case "list": return hasOnlyKeys(value, ["type", "title", "items"]) && (value.title === undefined || isText(value.title)) && isStringArray(value.items);
    case "table": {
      const columns = value.columns;
      const rows = value.rows;
      return hasOnlyKeys(value, ["type", "columns", "rows"]) && isStringArray(columns, 50) && columns.length > 0 && Array.isArray(rows) && rows.length <= MAX_COLLECTION_ITEMS && rows.every((row) => isStringArray(row, 50) && row.length === columns.length);
    }
    case "choice": return hasOnlyKeys(value, ["type", "question"]) && isChoiceQuestion(value.question);
    case "action": {
      if (!isRecord(value.action) || typeof value.action.type !== "string") return false;
      if (value.action.type === "submit") {
        if (!hasOnlyKeys(value, ["type", "action"]) || !hasOnlyKeys(value.action, ["type", "payload"])) return false;
        if (value.action.payload === undefined) return true;
        return isRecord(value.action.payload) && isJsonValue(value.action.payload, 0, { nodes: 0 });
      }
      if (value.action.type === "openApp") {
        return hasOnlyKeys(value, ["type", "action"]) && hasOnlyKeys(value.action, ["type", "appId", "url"]) && isText(value.action.appId) && !!value.action.appId.trim() && (value.action.url === undefined || (isText(value.action.url) && isAppUrl(value.action.url)));
      }
      return false;
    }
    default: return false;
  }
}

export function parseUiCard(input: unknown): UiCardParseResult {
  if (!isRecord(input) || !hasOnlyKeys(input, ["id", "version", "source", "blocks"])) return { ok: false, error: "invalid card shape" };
  if (typeof input.id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(input.id)) return { ok: false, error: "invalid card id" };
  if (input.version !== UI_CARD_VERSION || input.source !== "tool") return { ok: false, error: "unsupported card version or source" };
  if (!Array.isArray(input.blocks) || input.blocks.length > MAX_BLOCKS || !input.blocks.every(isBlock)) return { ok: false, error: "invalid blocks" };
  try {
    if (new TextEncoder().encode(JSON.stringify(input)).byteLength > UI_CARD_MAX_BYTES) return { ok: false, error: "card too large" };
  } catch { return { ok: false, error: "unserializable card" }; }
  return { ok: true, value: input as unknown as UiCard };
}

/** Deterministic text projection; preserves payload and performs no action. */
export function uiCardFallback(card: UiCard): string {
  return card.blocks.map((block) => {
    switch (block.type) {
      case "text": return block.text;
      case "metric": return `${block.label}: ${block.value}${block.detail ? ` (${block.detail})` : ""}`;
      case "list": return `${block.title ? `${block.title}\n` : ""}${block.items.map((item) => `- ${item}`).join("\n")}`;
      case "table": return [block.columns.join(" | "), ...block.rows.map((row) => row.join(" | "))].join("\n");
      case "choice": return `${block.question.question}\n${block.question.choices.map((item) => `- ${item.label}${item.detail ? ` — ${item.detail}` : ""}`).join("\n")}`;
      case "action": return block.action.type === "submit"
        ? `Submit action (not executed): ${block.action.payload === undefined ? "{}" : JSON.stringify(block.action.payload)}`
        : `Open app (not authorized): ${block.action.appId}${block.action.url ? ` (${block.action.url})` : ""}`;
    }
  }).join("\n\n");
}
