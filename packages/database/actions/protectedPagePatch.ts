import { createProtectedRecordSync, type ProtectedSyncDb } from "./protectedRecordSync";
import { createProtectedRecordTransport } from "./protectedRecordTransport";
import { getPageReadBaseline } from "./protectedPageRead";
import type { ProtectedRecord } from "../protectedRecordProtocol";

/** A protected save is durable before transport; no generic replication fallback. */
export async function patchProtectedPage(options: {
  db: ProtectedSyncDb; actorId: string; dbKey: string; data: ProtectedRecord; changes: ProtectedRecord;
  isAuthorityAllowed: (origin: string) => boolean | Promise<boolean>;
  token: () => Promise<string | null>; fetch: typeof fetch;
  requireServerConfirmation?: boolean;
  buildData?: (current: ProtectedRecord) => ProtectedRecord;
  sync?: ReturnType<typeof createProtectedRecordSync>;
}): Promise<ProtectedRecord | undefined> {
  const baseline = await getPageReadBaseline(options.db, options.actorId, options.dbKey);
  if (!baseline) return undefined;
  const sync = options.sync ?? createProtectedRecordSync({ db: options.db });
  const scope = { actorId: options.actorId, dbKey: options.dbKey };
  const state = await sync.readState(scope);
  if (state.legacyCandidates.length) throw Error("本地旧副本尚未确认，未覆盖云端；请先处理版本差异");
  const current = (state.workingCopy?.data ?? await options.db.get(options.dbKey) ?? options.data) as ProtectedRecord;
  const data = options.buildData ? options.buildData(current) : options.data;
  const draft = await sync.saveLocalDraft({ ...scope, ...baseline,
    baseRevision: state.baselineRevision ?? baseline.revision,
    mutationId: crypto.randomUUID(), data, operation: "patch", payload: options.changes,
  });
  if (draft.blocked) throw Error("草稿已保存在本地，但同步受阻；云端尚未确认");
  const transport = createProtectedRecordTransport({ sync, fetch: options.fetch, isAuthorityAllowed: options.isAuthorityAllowed,
    getToken: async () => options.token() });
  // Bound the drain; newer drafts remain durable for a later save/reconnect.
  let result: Awaited<ReturnType<typeof transport.sendNext>> | undefined;
  for (let count = 0; count < draft.outbox.length; count++) {
    result = await transport.sendNext(scope);
    if (result.outcome !== "acked") break;
  }
  if (result?.outcome === "conflict" || result?.outcome === "blocked") {
    throw Error("草稿已保存在本地，但存在版本冲突或授权问题；未覆盖云端");
  }
  const latest = await sync.readState(scope);
  if (options.requireServerConfirmation && latest.outbox.length) {
    throw Error("草稿已保存在本地，等待服务器确认；请联网后重试保存");
  }
  return (latest.workingCopy?.data ?? latest.lastAck?.record ?? options.data) as ProtectedRecord;
}
