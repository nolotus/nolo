// packages/ai/attachments/toolsForAttachments.ts
//
// 附件 → 工具面的唯一映射（设计 §6「工具面与压缩」：audio/video → mediaJobTool；其余暂无）。
// 只负责「按 kind 推导工具名」：文件存在**不授予执行或计费权限**，付费仍走 mediaJobTool
// 的报价确认门。新增 kind 的工具只需改下面这张表，不在调用点写 if/else。
//
// 读取纪律：kind 只从 `normalizeAttachmentPart` 的 valid 结果现推（坏 part / 未知 v 一律
// 不推 kind，坏数据不得被断言成完整附件）。旧格式（`media_job` part / 已上线媒体文本）只做
// **能力提示**：让模型知道「有音视频任务可用」，从而看得见 mediaJobTool；它不是授权、也不
// 授予执行——真正的权限与计费判定留在 mediaJobTool 内部，模型拿到工具名只能发起报价。
// **任何分支都不输出本地路径**：本地定位只进端内适配器，工具表里只有 kind → 工具名。

import {
  attachmentKind,
  normalizeAttachmentPart,
  type AttachmentKind,
} from "./attachmentPart";

/**
 * P1a 收编的旧媒体 part（对话页写入的带 jobId 文本 / 首页写入的无 jobId part）。
 * 读取时归一化为 audio，不回写、不迁移。
 */
export const LEGACY_MEDIA_JOB_PART_TYPE = "media_job";

/**
 * 已上线的媒体文本形态。字段词表只有一个来源——写入侧的既有 formatter，这里不引入第三套格式：
 * - `packages/chat/messages/pendingAttachmentParts.ts#buildMediaJobText`（当前发送路径）：
 *   `[媒体附件] fileId=<fileKey> jobId=<jobId> 文件=<name> 时长=<n>s`，token 顺序不保证、各段可缺省；
 * - `packages/ai/attachments/projectUserPart.ts`（旧 `media_job` part 的模型侧投影）：
 *   `[媒体附件] 文件=<name> jobId=<id>`。
 */
export const LEGACY_MEDIA_TEXT_PREFIX = "[媒体附件]" as const;
export const LEGACY_MEDIA_TEXT_FIELDS = ["fileId", "jobId", "文件", "时长"] as const;
const LEGACY_MEDIA_TEXT_ID_FIELDS: readonly string[] = ["fileId", "jobId"];

/**
 * 旧行为分支（id 缺失时唯一的识别路径，逐字保留）：整段 token 词表、每个值不含空白。
 * 只在**没有** `fileId`/`jobId` 时兜底，因此不会把「正文里提过一次前缀」当附件。
 */
const LEGACY_MEDIA_TEXT_STRICT_PATTERN =
  /^\[媒体附件\](?:\s+(?:fileId|jobId|文件|时长)=\S+)+$/;

type LegacyMediaTextField = { key: string; value: string };

/** 按字段 key 切分（不是按空白切分：`文件=` 的值可以含空格）。 */
const parseLegacyMediaFields = (body: string): LegacyMediaTextField[] | null => {
  const matcher = new RegExp(`(?:${LEGACY_MEDIA_TEXT_FIELDS.join("|")})=`, "g");
  const starts: Array<{ key: string; start: number; end: number }> = [];
  for (let match = matcher.exec(body); match; match = matcher.exec(body)) {
    starts.push({
      key: match[0].slice(0, -1),
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  if (starts.length === 0) return null;
  // 前缀之后、第一个字段之前只允许空白：其它内容说明这不是 legacy 描述，而是散文。
  if (body.slice(0, starts[0].start).trim() !== "") return null;

  return starts.map((field, index) => ({
    key: field.key,
    value: body.slice(field.end, index + 1 < starts.length ? starts[index + 1].start : body.length),
  }));
};

/** id 必须是单个 token（不含空白）：值里混进散文的 `jobId=j1 这个能转录吗` 不算 id。 */
const hasLegacyMediaId = (fields: readonly LegacyMediaTextField[]): boolean =>
  fields.some(
    (field) =>
      LEGACY_MEDIA_TEXT_ID_FIELDS.includes(field.key) && /^\S+$/.test(field.value.trim()),
  );

/**
 * 有边界的 legacy 描述识别（**不用**严格整段词表当唯一判据）：
 * 1. 必须以 `[媒体附件]` **开头**，前缀后是空白或字符串结束 —— 正文里偶然提到一次前缀不算；
 * 2. 前缀之后只允许上面那套字段，每个字段值非空；
 * 3. 只要 `fileId=` / `jobId=` 里有一个是有效 token 就认（真机 `fileId=file-user-01ABC
 *    jobId=j1 文件=2026年10月05日 下午05点31分.m4a 时长=42s`：文件名的右边界是下一个字段
 *    key，所以含空格的文件名能被完整读出）；
 * 4. 缺 id 时回落到旧行为（严格整段 token 词表）—— 与升级前逐字一致，不因正文提过前缀就命中。
 *
 * 命中只是**能力提示**（让模型看得见 mediaJobTool），不是授权、也不授予执行：权限与计费
 * 判定仍在 mediaJobTool 内部。id 存在时「空格文件名 + 尾随散文」在文本层面不可区分，一律
 * 按文件名读，不因此多给任何权限。
 */
export const isLegacyMediaText = (text: string): boolean => {
  if (typeof text !== "string" || !text.startsWith(LEGACY_MEDIA_TEXT_PREFIX)) return false;
  const rest = text.slice(LEGACY_MEDIA_TEXT_PREFIX.length);
  if (rest !== "" && !/^\s/.test(rest)) return false;

  const fields = parseLegacyMediaFields(rest);
  if (!fields) return false;
  if (fields.some((field) => field.value.trim() === "")) return false;
  if (hasLegacyMediaId(fields)) return true;

  // 缺 ID：文件元数据按旧 compat 期望处理（只认不含空白的整段 token 词表）。
  return LEGACY_MEDIA_TEXT_STRICT_PATTERN.test(text);
};

/** 该 part 是否是已上线媒体文本（只作能力提示用：不是完整附件，也不是授权）。 */
export const isLegacyMediaJobText = (part: unknown): boolean => {
  if (typeof part !== "object" || part === null) return false;
  const record = part as Record<string, unknown>;
  if (record.type !== "text" || typeof record.text !== "string") return false;
  return isLegacyMediaText(record.text.trim());
};

/** 表驱动：kind → 该 kind 使用的工具名。 */
const TOOLS_BY_KIND: Record<AttachmentKind, readonly string[]> = {
  audio: ["mediaJobTool"],
  video: ["mediaJobTool"],
  image: [],
  document: [],
  text: [],
  archive: [], // P2：archive 目录清单 + 只读条目工具
  binary: [],
};

/**
 * 由附件种类推导本回合应可见的工具名（去重、稳定顺序 = 首次出现的顺序）。
 * 未知 kind 与空输入一律返回空数组，不抛错。
 */
export const toolsForAttachmentKinds = (
  kinds: readonly string[] | null | undefined,
): string[] => {
  const names = new Set<string>();
  for (const kind of kinds ?? []) {
    for (const name of TOOLS_BY_KIND[kind as AttachmentKind] ?? []) {
      names.add(name);
    }
  }
  return Array.from(names);
};

/**
 * 单个 part 的能力提示 kind；不认识 / 坏数据一律 null（不猜、不抛错）：
 * - `attachment`：走 `normalizeAttachmentPart`（唯一读取入口）后再按**归一化后的** source
 *   联合与 name/mimeType 现算 kind —— 旧草稿的顶层 `fileKey` 也照此归一化，坏 source /
 *   未知 v / 缺元数据不推 kind。
 * - 旧 `media_job` part：audio。
 * - 旧媒体文本：audio（见文件头：只是能力提示，不授予执行）。
 */
export const attachmentKindOfPart = (part: unknown): AttachmentKind | null => {
  if (typeof part !== "object" || part === null) return null;
  const record = part as Record<string, unknown>;
  if (record.type === LEGACY_MEDIA_JOB_PART_TYPE) return "audio";
  if (isLegacyMediaJobText(record)) return "audio";
  const normalized = normalizeAttachmentPart(record);
  return normalized.status === "valid" ? attachmentKind(normalized.attachment) : null;
};

/** Slate 段落嵌套只再下探这几层，避免在脏数据上做无界递归。 */
const MAX_PART_DEPTH = 4;

const collectParts = (input: unknown, out: unknown[], depth: number): void => {
  if (depth > MAX_PART_DEPTH) return;
  if (Array.isArray(input)) {
    for (const item of input) collectParts(item, out, depth + 1);
    return;
  }
  if (typeof input !== "object" || input === null) return;
  const record = input as Record<string, unknown>;
  out.push(record);
  // 附件 part 可能挂在 Slate 段落的 children 下（编辑器输入）。
  if (Array.isArray(record.children)) collectParts(record.children, out, depth + 1);
};

/**
 * 从消息/输入 content 里收集附件种类：
 * - `attachment` part → 归一化后由 `attachmentKind` 现算（不落库）
 * - 旧 `media_job` part / 已上线媒体文本 → "audio"
 *
 * 其余 part（text / image_url / page / 未知）不产生 kind —— 未知格式的兜底是
 * `binary`，由 reader 在读取时按 part 单独决定，不在这里猜。
 */
export const attachmentKindsInContent = (content: unknown): AttachmentKind[] => {
  const parts: unknown[] = [];
  collectParts(content, parts, 0);

  const kinds = new Set<AttachmentKind>();
  for (const part of parts) {
    const kind = attachmentKindOfPart(part);
    if (kind) kinds.add(kind);
  }
  return Array.from(kinds);
};
