import { googleSessionRequestToken, googleSessionServer } from "core/googleSessionScope";
import { createProtectedRecordSync, protectedSyncStateKey, protectedPageBaselineKey, type ProtectedSyncDb } from "./protectedRecordSync";
import { createProtectedRecordTransport } from "./protectedRecordTransport";
import type { ProtectedRecord } from "../protectedRecordProtocol";
import { shouldPreferRemoteBodyOverLocalProjection } from "./readResolution";

export type PageReadBaseline = { authorityServer: string; authorityEpoch: string; revision: string };
const baselineKey = protectedPageBaselineKey;
const originOf = (value: string | null): string | null => {
  try {
    const url = new URL(value ?? "");
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password &&
      url.pathname === "/" && !url.search && !url.hash ? url.origin : null;
  } catch { return null; }
};
export async function getPageReadBaseline(db: ProtectedSyncDb, actorId: string, dbKey: string): Promise<PageReadBaseline | null> {
  try {
    const value = await db.get(baselineKey(actorId, dbKey)) as PageReadBaseline | undefined;
    if (!value) {
      const state = await db.get(protectedSyncStateKey(actorId, dbKey));
      if (state) throw Error("文档保护状态存在但基线缺失，已阻止退回旧读写路径");
    }
    return value ?? null;
  } catch (error) {
    if (error && typeof error === "object" && "notFound" in error && error.notFound === true) {
      let state: unknown;
      try { state = await db.get(protectedSyncStateKey(actorId, dbKey)); }
      catch (stateError) {
        if (!(stateError && typeof stateError === "object" && "notFound" in stateError && stateError.notFound === true)) throw stateError;
      }
      if (state) throw Error("文档保护状态存在但基线缺失，已阻止退回旧读写路径");
      return null;
    }
    throw error;
  }
}

/** Discovery reads never write back to a server. Undefined leaves legacy reads unchanged.
 * Session-aware callers must supply getCurrentAccess (production readAndWait does).
 * Without it, actor/token/servers are an immutable access grant for this invocation;
 * that explicit snapshot contract cannot observe external session revocation.
 */
export async function readProtectedPage(options: {
  db: ProtectedSyncDb; actorId: string; dbKey: string; servers: string[]; token: string;
  fetch: typeof fetch;
  getCurrentAccess?: () => { actorId?: string; token?: string; servers: string[] };
  sync?: ReturnType<typeof createProtectedRecordSync>;
}): Promise<ProtectedRecord | undefined> {
  const { db, actorId, dbKey } = options;
  const assertAccess = (origin?: string) => {
    const access = options.getCurrentAccess?.() ?? options;
    if (access.actorId !== actorId || !access.token?.trim()) {
      throw Error("文档读取身份已变化或认证已撤销，已停止读取");
    }
    if (origin && !access.servers.some(server => originOf(server) === origin)) {
      throw Error("文档归属服务器不在已配置服务器中或已移除，未发送认证信息，未转发认证信息");
    }
    return origin ? googleSessionRequestToken(access.token, origin)! : access.token;
  };
  assertAccess();
  const sync = options.sync ?? createProtectedRecordSync({ db });
  const saved = await getPageReadBaseline(db, actorId, dbKey);
  assertAccess(saved?.authorityServer);
  // Once protected, offline reads may never fall into legacy cache replacement.
  if (saved) {
    const state = await sync.readState({ actorId, dbKey });
    if (state.workingCopy) {
      // Reopening resumes only the existing immutable queue; never invent a new mutation.
      if (options.getCurrentAccess && !state.blocked && !state.legacyCandidates.length) {
        const transport = createProtectedRecordTransport({ sync, fetch: options.fetch,
          isAuthorityAllowed: (origin) => {
            const access = options.getCurrentAccess!();
            return access.actorId === actorId && access.servers.some((server) => originOf(server) === origin);
          },
          getToken: async ({ authorityServer }) => assertAccess(authorityServer),
        });
        for (let count = 0; count < state.outbox.length; count++) {
          if ((await transport.sendNext({ actorId, dbKey })).outcome !== "acked") break;
        }
        const latest = await sync.readState({ actorId, dbKey });
        assertAccess(saved.authorityServer);
        return (latest.workingCopy?.data ?? latest.lastAck?.record ?? state.workingCopy.data) as ProtectedRecord;
      }
      assertAccess(saved.authorityServer);
      return state.workingCopy.data as ProtectedRecord;
    }
  }
  const access = options.getCurrentAccess?.() ?? options;
  const googleAuthority = googleSessionServer(access.token);
  const servers = saved ? [saved.authorityServer] : options.servers.filter(server =>
    access.servers.some(candidate => originOf(candidate) === originOf(server)) &&
    (!googleAuthority || originOf(server) === googleAuthority));

  for (const server of servers) {
    const origin = originOf(server);
    if (!origin) continue;
    const token = assertAccess(origin);
    let response: Response;
    try {
      response = await options.fetch(`${origin}/api/v1/db/read/${encodeURIComponent(dbKey)}`, {
        headers: { Authorization: `Bearer ${token}` }, redirect: "error", credentials: "omit",
        signal: AbortSignal.timeout(5000),
      });
    } catch { assertAccess(origin); continue; }
    assertAccess(origin);
    if (!response.ok) continue;
    const authorityServer = originOf(response.headers.get("X-Nolo-Authority-Server"));
    const authorityEpoch = response.headers.get("X-Nolo-Authority-Epoch");
    if (!authorityServer || !authorityEpoch?.trim()) continue;
    // Do not forward account credentials to an arbitrary URL advertised by a peer.
    const authorityToken = assertAccess(authorityServer);
    if (authorityServer !== origin) {
      response = await options.fetch(`${authorityServer}/api/v1/db/read/${encodeURIComponent(dbKey)}`, {
        headers: { Authorization: `Bearer ${authorityToken}` }, redirect: "error", credentials: "omit",
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok || response.headers.get("X-Nolo-Authority-Server") !== authorityServer ||
          response.headers.get("X-Nolo-Authority-Epoch") !== authorityEpoch) throw Error("文档归属校验失败，未采用副本");
    }
    if (saved && (saved.authorityServer !== authorityServer || saved.authorityEpoch !== authorityEpoch)) {
      throw Error("文档归属已切换，保留本地内容，需重新确认归属");
    }
    const etag = response.headers.get("ETag");
    if (!etag || !/^"[^"\r\n]+"$/.test(etag)) throw Error("文档服务器未返回有效版本基线");
    const record = await response.json() as ProtectedRecord;
    if (!record || record.type !== "page") throw Error("文档归属服务器返回了无效记录");
    const local = await db.get(dbKey).catch((error) => {
      if (error && typeof error === "object" && "notFound" in error && error.notFound === true) return undefined;
      throw error;
    });
    // 只有元数据的本地副本（用户数据 summary 缓存：无 slateData / content）不是用户草稿，
    // 不能当成「旧副本候选」保留：否则带正文的权威记录被投影遮蔽，页面标题正确、正文为空。
    const localIsProjection = shouldPreferRemoteBodyOverLocalProjection(local, record);
    const candidates = !saved && local && !localIsProjection && JSON.stringify(local) !== JSON.stringify(record)
      ? [{ candidateId: "legacy-local", source: "local", record: local as ProtectedRecord, revision: null, observedAt: null }]
      : undefined;
    assertAccess(authorityServer);
    const result = await sync.acceptRemote({ actorId, dbKey, record, revision: etag.slice(1, -1),
      authority: { authorityServer, authorityEpoch }, legacyCandidates: candidates,
      assertCurrentAccess: () => { assertAccess(authorityServer); } });
    assertAccess(authorityServer);
    // Keep the displayed local version until the user resolves a legacy conflict.
    return (result.state.workingCopy?.data ?? (!result.applied && local ? local : record)) as ProtectedRecord;
  }
  if (saved) {
    const local = await db.get(dbKey);
    assertAccess(saved.authorityServer);
    if (local) return local as ProtectedRecord;
    throw Error("文档权威服务器不可用，且没有本地缓存");
  }
  assertAccess();
  return undefined;
}
