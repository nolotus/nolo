/**
 * Dialog key / dialog URL identity parsing — the single source of truth.
 *
 * 形态：`dialog-<userId>-<dialogId>`。历史实现把「最后一个 '-' 之后」当 dialogId，
 * 这只在 dialogId 不含 '-' 时成立（ULID 26 位就是这样）。本地 CLI runtime 现在写入
 * `crypto.randomUUID()` 形态的 dialogId，于是
 * `dialog-<owner>-4848f39f-1793-445b-9743-2245777f3ec3` 被切成
 * owner=`<owner>-4848f39f-1793-445b-9743`、id=`2245777f3ec3`，
 * 读取侧只查 `2245777f3ec3` 并报 not found。
 *
 * 口径（唯一真值）：
 * - dialogId 已知形态只有 ULID（26 位 Crockford base32）与 UUID（8-4-4-4-12 十六进制）；
 * - 先从 key 尾部按这两种形态取 dialogId（长度固定，规则无歧义，与 owner 是否含 '-' 无关）；
 * - 都取不到时回退到历史「最后一个 '-'」切法，保证非 ULID/UUID 的历史 id 不被读死；
 * - owner 或 dialogId 为空 → 解析失败：不猜、不把 owner 换成当前用户。
 *
 * Dependency-free（纯字符串），供 core / database / cli / agent-runtime 共用同一口径，
 * 避免每个入口各造一套正则与 lastIndexOf 切法。
 */

export const DIALOG_KEY_PREFIX = "dialog-";

/** ULID：26 位 Crockford base32。 */
export const DIALOG_ID_ULID_SOURCE = "[0-9A-HJKMNP-TV-Z]{26}";

/** UUID：8-4-4-4-12 十六进制（大小写不敏感）。 */
export const DIALOG_ID_UUID_SOURCE =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

const ULID_ID_RE = new RegExp(`^${DIALOG_ID_ULID_SOURCE}$`, "i");
const UUID_ID_RE = new RegExp(`^${DIALOG_ID_UUID_SOURCE}$`, "i");
const KNOWN_SUFFIX_LENGTHS: ReadonlyArray<{ re: RegExp; length: number }> = [
  { re: UUID_ID_RE, length: 36 },
  { re: ULID_ID_RE, length: 26 },
];

/** Path 形态：`/dialog-<owner>-<id>` 或 `/space/<spaceId>/dialog-<owner>-<id>`。 */
const DIALOG_PATH_RE = new RegExp(
  `^/(?:space/([^/]+)/)?${DIALOG_KEY_PREFIX}(.+)-(${DIALOG_ID_ULID_SOURCE}|${DIALOG_ID_UUID_SOURCE})/?$`,
  "i",
);

export type DialogKeyIdentity = { userId: string; dialogId: string };
export type DialogPathIdentity = {
  spaceId: string | null;
  ownerId: string;
  dialogId: string;
};

/** 用户输入能否被当作一个 dialogId（裸 id 与 URL 尾段的最小准入）。 */
export function isSupportedDialogId(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const id = value.trim();
  return ULID_ID_RE.test(id) || UUID_ID_RE.test(id);
}

function splitKnownDialogIdSuffix(rest: string): DialogKeyIdentity | null {
  for (const { re, length } of KNOWN_SUFFIX_LENGTHS) {
    // owner 至少 1 个字符 + 1 个分隔符。
    if (rest.length < length + 2) continue;
    if (rest[rest.length - length - 1] !== "-") continue;
    const dialogId = rest.slice(rest.length - length);
    if (!re.test(dialogId)) continue;
    return { userId: rest.slice(0, rest.length - length - 1), dialogId };
  }
  return null;
}

/**
 * `dialog-<userId>-<dialogId>` → { userId, dialogId }；无法映射（缺 owner、缺 id、
 * 非 dialog key）返回 null。
 */
export function splitDialogKeyIdentity(key: unknown): DialogKeyIdentity | null {
  if (typeof key !== "string") return null;
  const trimmed = key.trim();
  if (!trimmed.startsWith(DIALOG_KEY_PREFIX)) return null;
  const rest = trimmed.slice(DIALOG_KEY_PREFIX.length);
  // 空 owner（`dialog--<id>`）不得回退成「owner=当前用户」：拒绝而不是猜。
  if (!rest || rest.startsWith("-")) return null;
  // 只有 id、没有 owner（`dialog-<id>`）：没有可归属的 owner，拒绝。
  if (ULID_ID_RE.test(rest) || UUID_ID_RE.test(rest)) return null;
  const known = splitKnownDialogIdSuffix(rest);
  if (known) return known;
  const lastDash = rest.lastIndexOf("-");
  if (lastDash <= 0 || lastDash === rest.length - 1) return null;
  return { userId: rest.slice(0, lastDash), dialogId: rest.slice(lastDash + 1) };
}

/**
 * 展示/过滤用：尽量给出 dialogId。解析不出身份时保持历史「最后一个 '-'」切法，
 * 让调用方拿到与旧实现一致的字符串（不新增抛错路径）。
 */
export function dialogIdFromKey(key: unknown): string {
  if (typeof key !== "string") return "";
  const identity = splitDialogKeyIdentity(key);
  if (identity) return identity.dialogId;
  const index = key.lastIndexOf("-");
  return index >= 0 ? key.slice(index + 1) : key;
}

/** Dialog URL 路径 → { spaceId, ownerId, dialogId }；形态不符返回 null。 */
export function parseDialogPathIdentity(pathname: unknown): DialogPathIdentity | null {
  if (typeof pathname !== "string") return null;
  const match = DIALOG_PATH_RE.exec(pathname);
  if (!match) return null;
  const [, spaceId, ownerId, dialogId] = match;
  if (!ownerId.trim() || !dialogId) return null;
  return {
    spaceId: spaceId ? decodeURIComponent(spaceId) : null,
    ownerId,
    dialogId,
  };
}
