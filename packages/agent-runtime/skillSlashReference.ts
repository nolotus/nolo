/** Portable identities only; resolving paths and authorizing access belong to callers. */
export type SkillSlashReference =
  | { source: "builtin"; id: string }
  | { source: "space"; dbKey: string }
  | { source: "project"; projectBinding: string; relativePath: string };

/**
 * `.trim()` 会连用户有意保留的尾部空白一起去掉（代码缩进、尾换行），所以只剥
 * 前导分隔空白；剥完为空才回退默认引导语——用户从补全菜单直接回车时 args 为空，
 * 若不回退就会把空 user prompt 发给模型（多数厂商直接 400）。
 */
export const DEFAULT_SKILL_SLASH_USER_PROMPT = "请按照该技能的指示执行。";

export function resolveSkillSlashUserPrompt(args: string): string {
  const trimmed = args.replace(/^\s+/, "");
  return trimmed.length > 0 ? trimmed : DEFAULT_SKILL_SLASH_USER_PROMPT;
}

export interface ParsedSkillSlashReference {
  reference: SkillSlashReference;
  /** Everything after the first token, including separator whitespace, unchanged. */
  args: string;
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Project payloads encode a JSON pair so delimiters inside either field are lossless. */
export function formatSkillSlashReference(reference: SkillSlashReference): string {
  let payload: string;
  switch (reference.source) {
    case "builtin":
      if (!isNonEmpty(reference.id)) throw new TypeError("Empty builtin skill id");
      payload = reference.id;
      break;
    case "space":
      if (!isNonEmpty(reference.dbKey)) throw new TypeError("Empty space skill dbKey");
      payload = reference.dbKey;
      break;
    case "project":
      if (!isNonEmpty(reference.projectBinding) || !isNonEmpty(reference.relativePath)) {
        throw new TypeError("Empty project skill binding or relative path");
      }
      payload = JSON.stringify([reference.projectBinding, reference.relativePath]);
      break;
    default:
      throw new TypeError("Unknown skill source");
  }
  return `/skill@${reference.source}:${encodeURIComponent(payload)}`;
}

/** Parse only a leading token. Malformed/unknown references never fall back to another source. */
export function parseSkillSlashReference(input: string): ParsedSkillSlashReference | null {
  const match = /^\/skill@([^:\s]+):(\S+)([\s\S]*)$/.exec(input);
  if (!match) return null;
  const [, source, encoded, args] = match;
  if (source !== "builtin" && source !== "space" && source !== "project") return null;

  try {
    // Decode exactly once: percent-encoded delimiters remain part of this identity.
    const payload = decodeURIComponent(encoded);
    if (!isNonEmpty(payload)) return null;
    switch (source) {
      case "builtin":
        return { reference: { source, id: payload }, args };
      case "space":
        return { reference: { source, dbKey: payload }, args };
      case "project": {
        const pair: unknown = JSON.parse(payload);
        if (!Array.isArray(pair) || pair.length !== 2 || !pair.every(isNonEmpty)) return null;
        return {
          reference: { source, projectBinding: pair[0], relativePath: pair[1] },
          args,
        };
      }
    }
  } catch {
    // Invalid URI escapes, invalid UTF-8, or invalid project JSON are not references.
    return null;
  }
}
