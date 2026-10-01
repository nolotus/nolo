import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  getLegacyCredentialPath,
  migrateLegacyCredentialFile,
  type CredentialMigrationOptions,
} from "./credentialLocationMigration";
import { resolveNoloStateDir } from "./noloStateDir";

export type OAuthProvider =
  | "chatgpt"
  | "xai"
  | "antigravity"
  | "claude"
  | "cloudflare"
  | "cursor"
  | "devin";

/**
 * 该本地凭据由服务端托管：服务端是唯一的 refresh 持有者与刷新者。
 *
 * 存在这个标记 = 本地绝不能自己刷新（本地文件里也不该再有 refreshToken）。
 * 过期时只能向服务端取新 access token，否则会与其它端互相作废上游授权。
 */
export type ServerManagedMarker = {
  /** 托管它的服务器 origin。 */
  origin: string;
  /** 属主 userId（防止切换 profile 后把别人的 token 写进来）。 */
  userId: string;
  /** 同步成功时刻。 */
  syncedAt: number;
};

export type OAuthCredential = {
  provider: OAuthProvider;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
  idToken?: string;
  accountId?: string;
  metadata?: Record<string, unknown>;
  obtainedAt: number;
  /** 见 ServerManagedMarker。缺省 = 纯本地凭据，行为与以前完全一致。 */
  serverManaged?: ServerManagedMarker;
};

export type OAuthTokenStore = {
  read(provider: OAuthProvider): OAuthCredential | null;
  write(provider: OAuthProvider, credential: OAuthCredential): void;
  remove(provider: OAuthProvider): void;
};

export type OAuthRefreshFn = (
  credential: OAuthCredential,
  deps?: { fetchImpl?: typeof fetch; now?: () => number }
) => Promise<OAuthCredential>;
export const DEFAULT_REFRESH_SKEW_MS = 5 * 60 * 1000;

/**
 * Credentials live under the nolo home like every other piece of local state,
 * so `NOLO_HOME` redirects them too. Without that, a test process could only
 * reach the developer's real tokens — which meant tests had to overwrite and
 * restore them in place, one crash away from leaving a fake token behind.
 */
export function getCredentialsDir(homeDir?: string): string {
  return resolveNoloStateDir("credentials", homeDir);
}

export function getCredentialPath(provider: OAuthProvider, homeDir?: string): string {
  return join(getCredentialsDir(homeDir), `${provider}.json`);
}

/** Same private-dir pattern as fileCredentialBroker (0700, best-effort chmod). */
function ensurePrivateDir(dir: string): void {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  try {
    chmodSync(dir, 0o700);
  } catch {
    // Best-effort on platforms that ignore chmod (e.g. some Windows mounts).
  }
}

/** Same private-file pattern as fileCredentialBroker (0600, best-effort chmod). */
function writePrivateFile(path: string, body: string): void {
  writeFileSync(path, body, { encoding: "utf8", mode: 0o600 });
  try {
    chmodSync(path, 0o600);
  } catch {
    // Best-effort.
  }
}

function isValidOAuthCredential(raw: string, provider: OAuthProvider): boolean {
  try {
    const parsed = JSON.parse(raw) as OAuthCredential;
    return parsed?.provider === provider && typeof parsed.accessToken === "string" && Boolean(parsed.accessToken);
  } catch {
    return false;
  }
}

function migrateOAuthCredentialIfNeeded(
  provider: OAuthProvider,
  homeDir: string | undefined,
  migration?: CredentialMigrationOptions,
): void {
  if (homeDir !== undefined || !migration?.enableLegacyMigration) return;
  const legacyHomeDir = migration.legacyHomeDir ?? homedir();
  const canonicalPath = getCredentialPath(provider);
  migrateLegacyCredentialFile({
    canonicalPath,
    legacyPath: getLegacyCredentialPath(`${provider}.json`, legacyHomeDir),
    mode: migration.mode ?? (migration.legacyHomeDir ? "test" : "production"),
    isValid: (raw) => isValidOAuthCredential(raw, provider),
  });
}

export function readOAuthCredential(
  provider: OAuthProvider,
  homeDir?: string,
  migration?: CredentialMigrationOptions,
): OAuthCredential | null {
  migrateOAuthCredentialIfNeeded(provider, homeDir, migration);
  const path = getCredentialPath(provider, homeDir);
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, "utf8");
  try {
    const parsed = JSON.parse(raw) as OAuthCredential;
    if (!parsed?.provider || !parsed?.accessToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeOAuthCredential(
  provider: OAuthProvider,
  credential: OAuthCredential,
  homeDir?: string
): void {
  const path = getCredentialPath(provider, homeDir);
  ensurePrivateDir(getCredentialsDir(homeDir));
  writePrivateFile(path, `${JSON.stringify(credential, null, 2)}\n`);
}

export function removeOAuthCredential(provider: OAuthProvider, homeDir?: string): void {
  const path = getCredentialPath(provider, homeDir);
  if (!existsSync(path)) return;
  unlinkSync(path);
}

export function createOAuthTokenStore(
  homeDir?: string,
  migration?: CredentialMigrationOptions,
): OAuthTokenStore {
  return {
    read(provider) {
      return readOAuthCredential(provider, homeDir, migration);
    },
    write(provider, credential) {
      writeOAuthCredential(provider, credential, homeDir);
    },
    remove(provider) {
      removeOAuthCredential(provider, homeDir);
    },
  };
}

export function isTokenExpired(
  credential: OAuthCredential,
  skewMs = DEFAULT_REFRESH_SKEW_MS,
  now = Date.now()
): boolean {
  if (!credential.expiresAt) return false;
  return credential.expiresAt - now <= skewMs;
}

export async function resolveFreshAccessToken(args: {
  provider: OAuthProvider;
  store?: OAuthTokenStore;
  homeDir?: string;
  refresh?: OAuthRefreshFn;
  skewMs?: number;
  now?: () => number;
  migration?: CredentialMigrationOptions;
  /** 强制刷新（401 重试路径）：即便本地认为 token 仍新鲜也重新换一次。 */
  force?: boolean;
  /**
   * 服务端托管凭据的取 token 通道（由 CLI 注入）。托管凭据过期时走这里，
   * 绝不走 args.refresh。
   */
  pullFromServer?: (input: {
    provider: OAuthProvider;
    force: boolean;
    /** 该凭据的托管标记：调用方据此校验目标服务器与属主，防止串号。 */
    serverManaged: ServerManagedMarker;
  }) => Promise<{ accessToken: string; expiresAt?: number; accountId?: string } | null>;
}): Promise<string | null> {
  const store = args.store ?? createOAuthTokenStore(args.homeDir, args.migration);
  const now = args.now ?? Date.now;
  const credential = store.read(args.provider);
  if (!credential) return null;
  const skew = args.skewMs ?? DEFAULT_REFRESH_SKEW_MS;
  const stillFresh = !isTokenExpired(credential, skew, now());

  // 服务端托管：本地永不刷新。过期就向服务端取，取不到就明确失败。
  if (credential.serverManaged) {
    if (!args.force && stillFresh) return credential.accessToken;
    const pull = args.pullFromServer;
    if (pull) {
      const pulled = await pull({
        provider: args.provider,
        force: args.force === true,
        serverManaged: credential.serverManaged,
      });
      if (pulled?.accessToken) {
        // 只更新 access/expiresAt/accountId；refreshToken 本就不该存在。
        // 只在拿到不更旧的 token 时写回，避免并发下用旧值覆盖新值。
        const notOlder =
          !credential.expiresAt ||
          !pulled.expiresAt ||
          pulled.expiresAt >= credential.expiresAt;
        if (notOlder) {
          const { refreshToken: _dropped, ...cleanedBase } = credential;
          store.write(args.provider, {
            ...cleanedBase,
            accessToken: pulled.accessToken,
            ...(pulled.expiresAt !== undefined ? { expiresAt: pulled.expiresAt } : {}),
            ...(pulled.accountId ? { accountId: pulled.accountId } : {}),
          });
        }
        return pulled.accessToken;
      }
    }
    // 拉取失败：仍有效的旧 token 继续用，真过期则如实报错（不回退本地刷新）。
    if (credential.expiresAt && credential.expiresAt > now()) {
      return credential.accessToken;
    }
    throw new Error(
      `OAuth credential for "${args.provider}" is server-managed and its access token has expired. ` +
        `Connect to ${credential.serverManaged.origin} to get a fresh one, or re-authorize with \`nolo auth ${args.provider} --sync-to-server\`.`,
    );
  }

  if (!args.force && stillFresh) {
    return credential.accessToken;
  }
  if (!credential.refreshToken || !args.refresh) return null;
  const refreshed = await args.refresh(credential);
  store.write(args.provider, refreshed);
  return refreshed.accessToken;
}
