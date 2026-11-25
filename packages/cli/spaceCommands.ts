import { MemberRole, SpaceVisibility, ContentType } from "../app/types";
import { authRoutes } from "core/authRoutes";
import { DataType } from "../create/types";
import { createSpaceKey, normalizeSpaceId } from "../create/space/spaceKeys";
import {
  parseUserIdFromAuthToken,
  readOption,
  resolveAuthToken,
  resolveServerUrl,
  resolveServerCandidates,
} from "./cliEnvHelpers";
import { readDbRecord, writeAgentRecord } from "./agentRecordHelpers";
import { readLiveDbRecordAfterTombstoneMerge } from "./globalRecordOperations";
import { ulid } from "ulid";
import { readFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { resolveFileCategory } from "../app/utils/fileUtils";
import type { CliFetchImpl } from "./cliFetch";

type SpaceCommandDeps = {
  env: NodeJS.ProcessEnv;
  output?: { write(chunk: string): unknown };
  fetchImpl?: CliFetchImpl;
};

const VALID_INVITE_ROLES = new Set<string>([
  MemberRole.ADMIN,
  MemberRole.MEMBER,
  MemberRole.GUEST,
]);

/**
 * MIME type used for `space upload`, inferred from the file extension.
 *
 * Ask: space upload originally accepted YAML only. Books, PDFs and other
 * documents are the common case, so the command stores any file; the type is
 * inferred here and unknown extensions fall back to a generic binary type
 * rather than rejecting the upload.
 */
const UPLOAD_MIME_BY_EXTENSION: Record<string, string> = {
  ".yaml": "application/yaml",
  ".yml": "application/yaml",
  ".json": "application/json",
  ".csv": "text/csv",
  ".tsv": "text/tab-separated-values",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".pdf": "application/pdf",
  ".epub": "application/epub+zip",
  ".mobi": "application/x-mobipocket-ebook",
  ".azw3": "application/vnd.amazon.ebook",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".odt": "application/vnd.oasis.opendocument.text",
  ".rtf": "application/rtf",
  ".zip": "application/zip",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  // Deliberately NOT mapped: active content (.html/.htm/.svg/.xhtml). The server
  // stores this mime and replays it as Content-Type on file reads; public/space
  // reads are served inline (no Content-Disposition) from the app origin
  // (packages/database/server/routes/fileRead.ts buildFileContentHeaders), so a
  // mapped text/html would make the CLI a stored-XSS uploader. Those extensions
  // fall back to application/octet-stream and download instead of rendering.
};

export function resolveUploadMimeType(extension: string): string {
  const normalized = extension.trim().toLowerCase();
  const key = normalized.startsWith(".") ? normalized : `.${normalized}`;
  return UPLOAD_MIME_BY_EXTENSION[key] ?? "application/octet-stream";
}

/**
 * 解析本次上传要展示/记录的显示文件名。
 *
 * Ask: Z-Library 一类站点给出的原始文件名常常是 150 字的乱码串，用户需要
 * `--name "书名 - 作者.epub"` 把它规整掉。这里只改**展示名**，字节、扩展名与
 * MIME 仍以真实文件为准。
 *
 * 安全：`--name` 是外部输入，不做 `basename()` 静默截断（那会掩盖调用方本想
 * 写到别处的意图），而是直接拒绝含路径分隔符 / `.` / `..` 的值。
 */
export function resolveUploadName(args: {
  filePath: string;
  displayName?: string;
}): string {
  const fileExt = extname(args.filePath).toLowerCase();
  if (args.displayName === undefined) return basename(args.filePath);

  const raw = args.displayName.trim();
  if (!raw) {
    throw new Error("space upload --name must not be empty; omit --name to keep the original file name.");
  }
  // 控制字符（含 \t \n \r 与 DEL）：展示名会进 header/文件名/日志，带控制字符
  // 既是注入面，也会让各端文件管理器显示异常，直接拒绝。
  if (/[\u0000-\u001f\u007f]/.test(raw)) {
    throw new Error(
      "space upload --name must not contain control characters (tab, newline, CR, DEL, …).",
    );
  }
  if (raw === "." || raw === ".." || raw.includes("/") || raw.includes("\\")) {
    throw new Error(
      `space upload --name must be a plain file name without path separators, got: ${raw}`,
    );
  }
  if (basename(raw) !== raw) {
    throw new Error(`space upload --name must be a plain file name, got: ${raw}`);
  }

  const rawExt = extname(raw);
  // 没带扩展名 → 沿用真实文件扩展名（MIME 由它推断）。
  if (!rawExt) return `${raw}${fileExt}`;
  if (rawExt.toLowerCase() !== fileExt) {
    throw new Error(
      `space upload --name extension (${rawExt}) must match the uploaded file extension (${fileExt}); the stored MIME type is inferred from the real file name.`,
    );
  }
  return raw;
}

/**
 * 上传后可直接打开阅读的页面链接。
 *
 * 路由真值（`packages/app/web/routes.tsx` + `packages/render/page/PageLoader.tsx`）：
 * - 空间内文件挂在 `/space/:spaceId/:pageKey`。
 * - 个人私有文件没有 `/file/:key` 路由，走顶层 `:pageKey` 兜底路由，
 *   即 `${serverUrl}/${pageKey}`；PageLoader 按 `file-`/`image-` 前缀分派到 FilePage。
 */
export function resolveFilePageUrl(args: {
  serverUrl: string;
  fileDbKey: string;
  spaceId?: string | null;
}): string {
  const pageKey = encodeURIComponent(args.fileDbKey);
  return args.spaceId ? `${args.serverUrl}/space/${args.spaceId}/${pageKey}` : `${args.serverUrl}/${pageKey}`;
}

function hasHelpArg(args: string[]) {
  return args.includes("--help") || args.includes("-h");
}

function hasFlag(args: string[], flag: string) {
  return args.includes(flag);
}

function writeOutput(deps: SpaceCommandDeps, text: string) {
  (deps.output ?? process.stdout).write(text);
}

function requireTokenUser(args: string[], env: NodeJS.ProcessEnv) {
  const authToken = resolveAuthToken(args, env);
  const userId = parseUserIdFromAuthToken(authToken) || env.USER_ID || "";
  if (!authToken) {
    throw new Error("space command requires an auth token. Pass --token or set AUTH_TOKEN.");
  }
  if (!userId) {
    throw new Error("auth token does not contain userId. Pass a user-scoped token.");
  }
  return { authToken, userId };
}

function printCreateUsage(output: { write(chunk: string): unknown }) {
  output.write(`Usage:
  nolo space create --name <name> [--description <text>] [--id <spaceId>]

Options:
  --visibility private|public  Defaults to private.
  --public                     Shortcut for --visibility public.
  --server <url>               Default write target.
  --token <jwt>                Auth token. Required for writes.
  --json                       Print machine-readable JSON.
`);
}

function printInviteUsage(output: { write(chunk: string): unknown }) {
  output.write(`Usage:
  nolo space invite --space <spaceId> --member <userId> [--role member|admin|guest]

Options:
  --server <url>               Default write target.
  --token <jwt>                Auth token. Required for writes.
  --json                       Print machine-readable JSON.

Note:
  Use --member for an existing Nolo user id, or --email to send a pending
  space invitation email.
`);
}

function printAcceptInviteUsage(output: { write(chunk: string): unknown }) {
  output.write(`Usage:
  nolo space accept-invite --invite <inviteToken>

Options:
  --server <url>               Default API target.
  --token <jwt>                Auth token. Required for accepting.
  --invite <inviteToken>       Space invite token from the email link.
  --space-invite <inviteToken> Alias for --invite.
  --json                       Print machine-readable JSON.
`);
}

function printUploadUsage(output: { write(chunk: string): unknown }) {
  output.write(`Usage:
  nolo space upload --space <spaceId> --file <path> [--name <displayName>]
  nolo space upload --personal --file <path> [--name <displayName>]

Target (exactly one is required):
  --space <spaceId>            Upload into a space (members-only).
  --personal, --private-storage
                               Upload into the current user's personal storage
                               (outside any space; no space contents record).

Options:
  --name <displayName>         Override the displayed file name, e.g.
                               "权力与进步 - 达龙·阿西莫格鲁.epub". Must be a bare
                               file name (no path separators); when the extension is
                               omitted the real file's extension is appended, and a
                               different extension is rejected because the stored MIME
                               type comes from the real file name.
  --server <url>               Default API target.
  --token <jwt>                Auth token. Required for writes.
  --json                       Print machine-readable JSON (fileId, dbKey, uploadName,
                               mimeType, target, pageUrl).

Note:
  Any file type is accepted as long as the file name has a non-empty extension
  (book.epub); the stored MIME type is inferred from that extension. .yaml/.yml
  map to application/yaml, unknown and active-content extensions (.html, .svg)
  fall back to application/octet-stream.
`);
}

async function writeDbRecord(args: {
  authToken: string;
  dbKey: string;
  fetchImpl: CliFetchImpl;
  record: Record<string, any>;
  serverUrl: string;
  userId: string;
}) {
  await writeAgentRecord({
    agentKey: args.dbKey,
    authToken: args.authToken,
    fetchImpl: args.fetchImpl,
    serverUrl: args.serverUrl,
    userId: args.userId,
    record: args.record,
  });
}

export async function runSpaceCreateCommand(
  args: string[],
  deps: SpaceCommandDeps,
): Promise<number> {
  if (hasHelpArg(args)) {
    printCreateUsage(deps.output ?? process.stdout);
    return 0;
  }

  const name = readOption(args, "--name") ?? args.find((value) => !value.startsWith("-"));
  if (!name?.trim()) {
    throw new Error("space create requires --name <name>.");
  }

  const { authToken, userId } = requireTokenUser(args, deps.env);
  const serverUrl = resolveServerUrl(args, deps.env);
  const fetchImpl = deps.fetchImpl ?? fetch;
  const spaceId = normalizeSpaceId(readOption(args, "--id") ?? ulid());
  const now = Date.now();
  const nowISO = new Date(now).toISOString();
  const visibilityRaw = readOption(args, "--visibility");
  const visibility = hasFlag(args, "--public") || visibilityRaw === SpaceVisibility.PUBLIC
    ? SpaceVisibility.PUBLIC
    : SpaceVisibility.PRIVATE;
  const description = readOption(args, "--description") ?? "";
  const spaceKey = createSpaceKey.space(spaceId);
  const memberKey = createSpaceKey.member(userId, spaceId);

  const spaceRecord = {
    id: spaceId,
    dbKey: spaceKey,
    type: DataType.SPACE,
    name: name.trim(),
    description,
    ownerId: userId,
    visibility,
    members: [userId],
    categories: {},
    contents: {},
    createdAt: now,
    updatedAt: now,
  };
  const memberRecord = {
    dbKey: memberKey,
    type: DataType.SPACE,
    userId,
    role: MemberRole.OWNER,
    joinedAt: now,
    spaceId,
    spaceName: name.trim(),
    ownerId: userId,
    visibility,
    createdAt: nowISO,
    updatedAt: nowISO,
    spaceCreatedAt: now,
    spaceUpdatedAt: now,
  };

  await writeDbRecord({ authToken, dbKey: spaceKey, fetchImpl, record: spaceRecord, serverUrl, userId });
  await writeDbRecord({ authToken, dbKey: memberKey, fetchImpl, record: memberRecord, serverUrl, userId });

  const result = { spaceId, spaceKey, memberKey, name: name.trim(), visibility, serverUrl };
  if (hasFlag(args, "--json")) {
    writeOutput(deps, `${JSON.stringify(result, null, 2)}\n`);
  } else {
    writeOutput(deps, `Created space ${spaceId} (${name.trim()})\n`);
  }
  return 0;
}

export async function runSpaceInviteCommand(
  args: string[],
  deps: SpaceCommandDeps,
): Promise<number> {
  if (hasHelpArg(args)) {
    printInviteUsage(deps.output ?? process.stdout);
    return 0;
  }

  const spaceIdRaw = readOption(args, "--space") ?? readOption(args, "--space-id");
  const email = readOption(args, "--email");
  const memberId = readOption(args, "--member") ?? readOption(args, "--member-id");
  if (!spaceIdRaw?.trim()) throw new Error("space invite requires --space <spaceId>.");
  if (!memberId?.trim() && !email?.trim()) {
    throw new Error("space invite requires --member <userId> or --email <address>.");
  }

  const role = readOption(args, "--role") ?? MemberRole.MEMBER;
  if (!VALID_INVITE_ROLES.has(role)) {
    throw new Error("--role must be one of member, admin, or guest.");
  }

  const { authToken, userId } = requireTokenUser(args, deps.env);
  const serverUrl = resolveServerUrl(args, deps.env);
  const fetchImpl = deps.fetchImpl ?? fetch;
  const spaceId = normalizeSpaceId(spaceIdRaw);

  if (email?.trim()) {
    const response = await fetchImpl(`${serverUrl}${authRoutes.users.spaceInvite.path}`, {
      method: authRoutes.users.spaceInvite.method,
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        spaceId,
        email: email.trim(),
        role,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        data?.error?.message || data?.error || `space invite failed: HTTP ${response.status}`,
      );
    }
    if (hasFlag(args, "--json")) {
      writeOutput(deps, `${JSON.stringify(data, null, 2)}\n`);
    } else {
      writeOutput(deps, `Invited ${email.trim()} to space ${spaceId} as ${role}\n`);
    }
    return 0;
  }

  const spaceKey = createSpaceKey.space(spaceId);
  const spaceRecord = await readDbRecord({
    dbKey: spaceKey,
    authToken,
    fetchImpl,
    serverUrl,
  });

  const members = Array.isArray(spaceRecord?.members) ? spaceRecord.members : [];
  if (!members.includes(userId)) {
    throw new Error("current user is not a member of this space.");
  }
  if (members.includes(memberId)) {
    throw new Error("member already exists in this space.");
  }

  const now = Date.now();
  const updatedSpaceRecord = {
    ...spaceRecord,
    members: [...members, memberId],
    updatedAt: now,
  };
  if (!memberId?.trim()) {
    throw new Error("space invite requires --member <userId>.");
  }
  const memberKey = createSpaceKey.member(memberId.trim(), spaceId);
  const memberRecord = {
    dbKey: memberKey,
    type: DataType.SPACE,
    userId: memberId,
    role,
    joinedAt: now,
    updatedAt: now,
    spaceId,
    spaceName: spaceRecord.name ?? spaceId,
    ownerId: spaceRecord.ownerId,
    visibility: spaceRecord.visibility ?? SpaceVisibility.PRIVATE,
    spaceCreatedAt: spaceRecord.createdAt,
    spaceUpdatedAt: now,
  };

  await writeDbRecord({ authToken, dbKey: spaceKey, fetchImpl, record: updatedSpaceRecord, serverUrl, userId });
  await writeDbRecord({ authToken, dbKey: memberKey, fetchImpl, record: memberRecord, serverUrl, userId });

  const result = { spaceId, spaceKey, memberKey, memberId, role, serverUrl };
  if (hasFlag(args, "--json")) {
    writeOutput(deps, `${JSON.stringify(result, null, 2)}\n`);
  } else {
    writeOutput(deps, `Invited ${memberId} to space ${spaceId} as ${role}\n`);
  }
  return 0;
}

export async function runSpaceAcceptInviteCommand(
  args: string[],
  deps: SpaceCommandDeps,
): Promise<number> {
  if (hasHelpArg(args)) {
    printAcceptInviteUsage(deps.output ?? process.stdout);
    return 0;
  }

  const inviteToken =
    readOption(args, "--invite") ??
    readOption(args, "--space-invite") ??
    readOption(args, "--invite-token");
  if (!inviteToken?.trim()) {
    throw new Error("space accept-invite requires --invite <inviteToken>.");
  }

  const { authToken } = requireTokenUser(args, deps.env);
  const serverUrl = resolveServerUrl(args, deps.env);
  const fetchImpl = deps.fetchImpl ?? fetch;
  const response = await fetchImpl(`${serverUrl}${authRoutes.users.spaceInviteAccept.path}`, {
    method: authRoutes.users.spaceInviteAccept.method,
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token: inviteToken.trim(),
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.error?.message || data?.error || `space invite accept failed: HTTP ${response.status}`,
    );
  }

  if (hasFlag(args, "--json")) {
    writeOutput(deps, `${JSON.stringify(data, null, 2)}\n`);
  } else {
    writeOutput(deps, `Accepted invite for space ${data?.spaceId ?? ""}\n`);
  }
  return 0;
}

export async function runSpaceUploadCommand(
  args: string[],
  deps: SpaceCommandDeps,
): Promise<number> {
  if (hasHelpArg(args)) {
    printUploadUsage(deps.output ?? process.stdout);
    return 0;
  }

  const personalStorage = hasFlag(args, "--personal") || hasFlag(args, "--private-storage");
  const spaceIdRaw = readOption(args, "--space") ?? readOption(args, "--space-id");
  const filePath = readOption(args, "--file");
  if (personalStorage && spaceIdRaw?.trim()) {
    throw new Error(
      "space upload takes exactly one target: --space <spaceId> or --personal (they are mutually exclusive).",
    );
  }
  if (!personalStorage && !spaceIdRaw?.trim()) {
    throw new Error(
      "space upload requires a target: --space <spaceId> for a space, or --personal for your own private storage.",
    );
  }
  if (!filePath?.trim()) throw new Error("space upload requires --file <path>.");

  const ext = extname(filePath).toLowerCase();
  if (!ext || ext === ".") {
    throw new Error(
      "space upload requires a file name with a non-empty extension (the extension decides the stored MIME type), e.g. book.epub",
    );
  }
  const mimeType = resolveUploadMimeType(ext);
  const uploadName = resolveUploadName({
    filePath,
    displayName: readOption(args, "--name"),
  });

  const { authToken, userId } = requireTokenUser(args, deps.env);
  const serverUrl = resolveServerUrl(args, deps.env);
  const fetchImpl = deps.fetchImpl ?? fetch;
  const spaceId = personalStorage ? null : normalizeSpaceId(spaceIdRaw as string);

  const fileContent = readFileSync(filePath);
  const spaceKey = spaceId ? createSpaceKey.space(spaceId) : null;
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  // 个人存储不挂任何空间：不读 space 记录，也不回写 space contents。
  const spaceRecord = spaceKey
    ? (
        await readLiveDbRecordAfterTombstoneMerge({
          dbKey: spaceKey,
          authToken,
          fetchImpl,
          serverUrls: resolveServerCandidates(args, deps.env, serverUrl),
        })
      ).record
    : null;

  const formData = new FormData();
  formData.append("file", new Blob([fileContent], { type: mimeType }), uploadName);
  
  const fileId = ulid();
  const fileDbKey = `file-${userId}-${fileId}`;
  formData.append("metadata", JSON.stringify({
    id: fileId,
    title: uploadName,
    originalName: uploadName,
    fileName: `${fileId}${ext}`,
    filePath: "",
    size: fileContent.length,
    mimeType,
    type: DataType.FILE,
    fileCategory: resolveFileCategory({
      mimeType,
      fileName: uploadName,
    }),
    dbKey: fileDbKey,
    userId,
    ownerType: personalStorage ? "user" : "space",
    ownerId: personalStorage ? userId : spaceId,
    ...(personalStorage ? {} : { ownerDbKey: spaceKey }),
    source: personalStorage ? "cli-personal-upload" : "cli-space-upload",
    createdAt: nowIso,
    updatedAt: nowIso,
  }));
  formData.append("customKey", fileDbKey);
  formData.append("userId", userId);
  formData.append("ownerType", personalStorage ? "user" : "space");
  formData.append("ownerId", personalStorage ? userId : (spaceId as string));

  const uploadRes = await fetchImpl(`${serverUrl}/api/v1/db/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    body: formData,
  });

  const uploadData = await uploadRes.json().catch(() => ({}));
  if (!uploadRes.ok) {
    throw new Error(
      uploadData?.error?.message || uploadData?.error || `space upload failed: HTTP ${uploadRes.status}`
    );
  }

  // 服务端上传响应形如 { message, fileId, metadata }，metadata.mimeType 是真正落库的
  // 值（`packages/database/server/routes/upload.ts` 由 multipart 文件 part 决定）。
  const rawServerMimeType = (uploadData as any)?.metadata?.mimeType;
  const serverMimeType =
    typeof rawServerMimeType === "string" && rawServerMimeType.trim()
      ? rawServerMimeType.trim()
      : null;
  const storedMimeType = serverMimeType ?? mimeType;
  const mimeTypeSource = serverMimeType ? ("server" as const) : ("inferred" as const);

  if (spaceRecord && spaceKey) {
    const contents = spaceRecord.contents || {};
    contents[fileDbKey] = {
      ...(contents[fileDbKey] ?? {}),
      title: uploadName,
      type: ContentType.FILE,
      contentKey: fileDbKey,
      createdAt: contents[fileDbKey]?.createdAt ?? now,
      updatedAt: now,
    };

    await writeDbRecord({
      authToken,
      dbKey: spaceKey,
      fetchImpl,
      record: { ...spaceRecord, contents, updatedAt: now },
      serverUrl,
      userId,
    });
  }

  const result = {
    ...uploadData,
    fileId,
    dbKey: fileDbKey,
    uploadName,
    // MIME 口径：服务端返回的落库值优先（它与真实字节一起被持久化），
    // 响应没给才回退到本地按扩展名推断的值，并如实标注来源。
    mimeType: storedMimeType,
    mimeTypeSource,
    target: personalStorage ? ("personal" as const) : ("space" as const),
    spaceId,
    spaceKey,
    pageUrl: resolveFilePageUrl({ serverUrl, fileDbKey, spaceId }),
  };

  if (hasFlag(args, "--json")) {
    writeOutput(deps, `${JSON.stringify(result, null, 2)}\n`);
  } else if (personalStorage) {
    writeOutput(
      deps,
      `Uploaded ${uploadName} to your personal storage (fileId: ${fileId})\n  page: ${result.pageUrl}\n`,
    );
  } else {
    writeOutput(
      deps,
      `Uploaded ${uploadName} to space ${spaceId} (fileId: ${fileId})\n  page: ${result.pageUrl}\n`,
    );
  }

  return 0;
}
