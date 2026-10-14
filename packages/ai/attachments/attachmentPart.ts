/**
 * 聊天消息里的附件 part —— 唯一真值。设计：docs/plans/2026-10-10-attachment-architecture.md
 *
 * 契约冻结：type / v / source / name / mimeType / size 上线后永不改语义；只增可选字段，
 * 破坏性变化走 v:2 且永久保留 v:1 reader。禁止写入 kind、jobId、派生文本、临时 URL、处理状态、
 * attachmentKinds。任何内容投影（`describeAttachmentForModel` / safeDescription）都不得输出
 * **本地路径、机器 id、工作区路径**。
 *
 * 读取纪律：`isAttachmentCandidate` 只判 `type` 判别符，**坏 part 一律不得被断言成完整附件**；
 * 读数据一律走 `normalizeAttachmentPart`，它返回可辨识的判别联合（valid / unsupported-version / invalid）。
 */
export const ATTACHMENT_PART_TYPE = "attachment" as const;
export const ATTACHMENT_PART_VERSION = 1 as const;

/** 读取时现算的能力提示（不落库）。 */
export type AttachmentKind =
  | "text"
  | "document"
  | "image"
  | "audio"
  | "video"
  | "archive"
  | "binary";

/** 上传生成的不可变原件 key：file-<userId>-<ulid>（packages/database/actions/upload.ts）。跨端可读，权限随上传者与 Space 判。 */
export interface RemoteFileSource {
  kind: "remote-file";
  fileKey: string;
}

/**
 * 本机原件：只在**授权同机**可读，异端/异机明确不可用，绝不静默回退、绝不自动上传。
 * - `machineId` 是**定位**（哪台机器上有这个路径才有原件），**不是授权**；同机判定之外仍须过权限适配器。
 * - `workspaceRoot` 沿用 `CapabilityExecutionContext.workspaceRoot` 语义。
 * - **快照冻结**：这里不写 mtime / 内容指纹。顶层 `size` 与 stat 出的 mtime 只是**预检**提示；
 *   派生复用的唯一依据是**处理时**算出的内容指纹，指纹拿不到就按「复用核验不成立」显式降级。
 */
export interface LocalFileSource {
  kind: "local-file";
  path: string;
  machineId: string;
  workspaceRoot?: string;
}

export type AttachmentSource = RemoteFileSource | LocalFileSource;

/** 字段完整、可被当前 reader 完整理解的附件。**只能由 `normalizeAttachmentPart` 产出。** */
export interface ValidatedAttachment {
  type: typeof ATTACHMENT_PART_TYPE;
  v: typeof ATTACHMENT_PART_VERSION;
  source: AttachmentSource;
  name: string;
  mimeType: string;
  size: number;
}

/** 契约名（= ValidatedAttachment）。写入方构造它；读取方禁止断言，必须经归一化。 */
export type AttachmentPart = ValidatedAttachment;

/**
 * 候选：`type === "attachment"` 的一切数据（含未知版本、缺字段、只有一个 `fileKey` 的旧草稿）。
 * 它**不是**完整附件，只说明「这段数据自称是附件，需要走归一化」。
 */
export interface AttachmentCandidate {
  type: typeof ATTACHMENT_PART_TYPE;
  [key: string]: unknown;
}

export type AttachmentInvalidReason =
  | "not-attachment"
  | "missing-source"
  | "unsupported-source"
  | "missing-metadata";

export type AttachmentNormalization =
  | {
      status: "valid";
      attachment: ValidatedAttachment;
      /** true = source 由旧草稿 v1 顶层 `fileKey` 只读归一化而来（不迁移、不回写）。 */
      legacyFileKey: boolean;
    }
  | { status: "unsupported-version"; version: number | null; detail: string }
  | { status: "invalid"; reason: AttachmentInvalidReason; detail: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const nonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

/** 只判判别符：命中不代表字段完整（见 `AttachmentCandidate`）。 */
export const isAttachmentCandidate = (part: unknown): part is AttachmentCandidate =>
  isRecord(part) && part.type === ATTACHMENT_PART_TYPE;

/**
 * @deprecated 兼容旧调用点的候选判定（只判 `type`），窄化结果是 `AttachmentCandidate` 而不是完整附件。
 * 新代码请用 `isAttachmentCandidate` + `normalizeAttachmentPart`。
 */
export const isAttachmentPart: (part: unknown) => part is AttachmentCandidate =
  isAttachmentCandidate;

/** 兼容旧调用点：能否被当前 reader 完整理解（含旧草稿顶层 fileKey 的只读归一化结果）。不是类型守卫。 */
export const isReadableAttachmentPart = (part: unknown): boolean =>
  normalizeAttachmentPart(part).status === "valid";

const readSource = (
  part: AttachmentCandidate,
): { source: AttachmentSource; legacyFileKey: boolean } | { invalid: string } => {
  const raw = part.source;
  if (raw !== undefined && raw !== null) {
    if (!isRecord(raw)) return { invalid: "source 不是对象" };
    if (raw.kind === "remote-file") {
      const fileKey = nonEmptyString(raw.fileKey);
      return fileKey
        ? { source: { kind: "remote-file", fileKey }, legacyFileKey: false }
        : { invalid: "remote-file source 缺 fileKey" };
    }
    if (raw.kind === "local-file") {
      const path = nonEmptyString(raw.path);
      const machineId = nonEmptyString(raw.machineId);
      if (!path) return { invalid: "local-file source 缺 path" };
      // 机器定位缺失不能猜：换端时无法判定「是否本机」，直接判坏数据（不静默回退）。
      if (!machineId) return { invalid: "local-file source 缺 machineId" };
      const workspaceRoot = nonEmptyString(raw.workspaceRoot);
      return {
        source: {
          kind: "local-file",
          path,
          machineId,
          ...(workspaceRoot ? { workspaceRoot } : {}),
        },
        legacyFileKey: false,
      };
    }
    return { invalid: `未知 source.kind: ${String((raw as Record<string, unknown>).kind)}` };
  }
  // 旧草稿 v1：source 之前只写顶层 fileKey。只读兼容，不迁移、不回写。
  const legacyFileKey = nonEmptyString(part.fileKey);
  if (legacyFileKey) {
    return { source: { kind: "remote-file", fileKey: legacyFileKey }, legacyFileKey: true };
  }
  return { invalid: "缺 source（也无可兼容的顶层 fileKey）" };
};

/**
 * 读取时唯一入口：把任意数据归一化成「可用 / 版本未知（可见降级）/ 坏数据（可见降级）」。
 * 不抛错、不改写入参（旧草稿兼容只在返回值里体现）。
 */
export const normalizeAttachmentPart = (part: unknown): AttachmentNormalization => {
  if (!isAttachmentCandidate(part)) {
    return { status: "invalid", reason: "not-attachment", detail: "type !== 'attachment'" };
  }
  if (part.v !== ATTACHMENT_PART_VERSION) {
    const version = part.v;
    return {
      status: "unsupported-version",
      version: typeof version === "number" && Number.isFinite(version) ? version : null,
      detail: `v=${String(version)} 不是当前 reader 已知的版本`,
    };
  }
  const source = readSource(part);
  if ("invalid" in source) {
    // source 已给但不可理解 → unsupported-source；完全没给 → missing-source。
    const given = part.source !== undefined && part.source !== null;
    return {
      status: "invalid",
      reason: given ? "unsupported-source" : "missing-source",
      detail: source.invalid,
    };
  }
  const name = nonEmptyString(part.name);
  const size = part.size;
  const sizeOk = typeof size === "number" && Number.isFinite(size) && size >= 0;
  if (!name || !sizeOk) {
    const missing = [!name ? "name" : null, !sizeOk ? "size" : null].filter(Boolean).join("/");
    return { status: "invalid", reason: "missing-metadata", detail: `快照字段无效: ${missing}` };
  }
  return {
    status: "valid",
    legacyFileKey: source.legacyFileKey,
    attachment: {
      type: ATTACHMENT_PART_TYPE,
      v: ATTACHMENT_PART_VERSION,
      source: source.source,
      name,
      mimeType: typeof part.mimeType === "string" ? part.mimeType : "",
      size,
    },
  };
};

const ext = (name: string): string => {
  const match = /\.([a-z0-9]+)$/i.exec(name.trim());
  return match ? match[1].toLowerCase() : "";
};

const EXT_KIND: Record<string, AttachmentKind> = {};
/** 同一扩展名登记两种 kind 立即暴露（历史上 `.ts` 同时被登记为 video 与 text）。 */
const register = (kind: AttachmentKind, list: string) => {
  for (const e of list.split(" ")) {
    if (EXT_KIND[e]) {
      throw new Error(`attachment EXT_KIND 冲突: .${e} 已是 ${EXT_KIND[e]}，又登记为 ${kind}`);
    }
    EXT_KIND[e] = kind;
  }
};
register("image", "avif bmp gif heic heif ico jpg jpeg png svg tif tiff webp");
register("audio", "aac flac m4a mp3 oga ogg opus wav weba wma amr");
// `.ts` 不在表内：普通 .ts 是源码（见下方 text），MPEG-TS 传输流只按 mime 确证才算 video。
register("video", "avi m4v mkv mov mp4 mpeg mpg webm wmv 3gp flv");
register("document", "pdf doc docx odt rtf ppt pptx odp xls xlsx ods csv epub pages numbers key");
register("archive", "zip rar 7z tar gz tgz bz2 xz zst apk aab ipa jar war dmg iso deb rpm");
register(
  "text",
  "txt md mdx markdown json jsonl yaml yml toml ini cfg conf env log xml html htm css scss sass less js jsx ts tsx mjs cjs py rb go rs java kt swift c h cc cpp hpp cs php sh bash zsh sql graphql proto vue svelte lua r dart",
);

/** kind 的输入：只读 name/mimeType，容忍任意 part 形态（未知/缺字段一律走 binary 兜底）。 */
export type AttachmentKindInput =
  | { name?: unknown; mimeType?: unknown }
  | Record<string, unknown>;

/** MPEG-TS 传输流（video/mp2t、application/x-mpegts…）。 */
const MPEG_TS_MIME = /mp2t|mpeg-?ts|x-mpegts/;

/**
 * 读取时现算的分类（不落库，规则可随时改进）。扩展名优先，因为浏览器常给出空或泛化的 mimeType；
 * 扩展名未知时再看 mimeType；都不认识 → binary。
 *
 * **kind 只是能力提示**：不承诺可解析，**也不是授权/安全判定**（未知一律 binary，不得据此放行或拒绝）。
 * 真正的格式与内容校验在执行操作时做真实探测。
 * `.ts` 歧义：普通 TypeScript 源码 → text；只有 mime 确证是传输流才算 video（扩展名不可信）。
 */
export const attachmentKind = (args: AttachmentKindInput): AttachmentKind => {
  const e = ext(typeof args.name === "string" ? args.name : "");
  const mime = (typeof args.mimeType === "string" ? args.mimeType : "").toLowerCase();
  if (e === "ts" && MPEG_TS_MIME.test(mime)) return "video";
  const byExt = EXT_KIND[e];
  if (byExt) return byExt;
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("text/")) return "text";
  if (mime === "application/pdf") return "document";
  if (/zip|x-tar|x-7z|x-rar|gzip|android\.package/.test(mime)) return "archive";
  if (/json|xml|javascript|yaml/.test(mime)) return "text";
  return "binary";
};

/** 人读大小。非有限/负数（坏数据）→ 空串；小于 1B 也绝不出 NaN/undefined。 */
const formatSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
};

/** 已归一化附件的最小安全描述：只含 name/mimeType/size/kind；remote 额外带不可变 fileKey。 */
export const describeValidatedAttachment = (attachment: ValidatedAttachment): string => {
  const kind = attachmentKind(attachment);
  const meta = [attachment.mimeType.trim(), formatSize(attachment.size)]
    .filter(Boolean)
    .join(" · ");
  const locator =
    attachment.source.kind === "remote-file" ? ` · fileKey=${attachment.source.fileKey}` : "";
  const head = `[附件] ${attachment.name.trim()}${meta ? ` · ${meta}` : ""} · kind=${kind}${locator}`;
  return kind === "binary" ? `${head}\n（该类型暂无法读取内容）` : head;
};

const displayName = (part: unknown): string => {
  const name = isRecord(part) ? part.name : undefined;
  return typeof name === "string" && name.trim() ? name.trim() : "未命名文件";
};

/**
 * 附件的模型侧最小文本描述（兼容保留，永不为空、永不泄露本地定位信息）。
 * 坏数据/未知版本 → `[附件不可用: name]`；非附件 → `[未识别的附件]`。
 */
export const describeAttachmentForModel = (part: unknown): string => {
  if (!isAttachmentCandidate(part)) return "[未识别的附件]";
  const normalized = normalizeAttachmentPart(part);
  if (normalized.status !== "valid") return `[附件不可用: ${displayName(part)}]`;
  return describeValidatedAttachment(normalized.attachment);
};
