import { asOptionalPositiveFiniteNumber } from "core/optionalPositiveNumber";
import { normalizeServerOrigin } from "core/serverOrigin";
import { isTombstoneRecord } from "../tombstones";

const toComparableTimestamp = (data: any): number => {
  if (!data || typeof data !== "object") return 0;

  const updatedAtMs = asOptionalPositiveFiniteNumber(
    new Date(data.updatedAt).getTime(),
  );
  if (updatedAtMs !== undefined) return updatedAtMs;

  const createdAtMs = asOptionalPositiveFiniteNumber(
    new Date(data.createdAt).getTime(),
  );
  if (createdAtMs !== undefined) return createdAtMs;

  return (
    asOptionalPositiveFiniteNumber(Number(data?.meta?.createdAt)) ?? 0
  );
};

export const partitionReadServers = ({
  allServers,
  preferredServerOrigin,
}: {
  allServers: string[];
  preferredServerOrigin?: string | null;
}): {
  preferredServer: string | null;
  fallbackServers: string[];
  orderedServersForLocalHit: string[];
} => {
  const preferredServer =
    typeof preferredServerOrigin === "string" &&
    preferredServerOrigin.trim().length > 0
      ? normalizeServerOrigin(preferredServerOrigin)
      : null;

  const fallbackServers = preferredServer
    ? allServers.filter(
        (server) => normalizeServerOrigin(server) !== preferredServer
      )
    : allServers;

  return {
    preferredServer,
    fallbackServers,
    orderedServersForLocalHit: preferredServer
      ? [preferredServer, ...fallbackServers]
      : fallbackServers,
  };
};

export const compareRemoteRecordsByComparableTime = (
  left: any,
  right: any
): number => toComparableTimestamp(left) - toComparableTimestamp(right);

/**
 * 记录是否是页面（page）记录：优先看 type，缺 type 时回退看 dbKey 前缀。
 * 正文规则只针对页面：其它类型记录的既有判定不受影响。
 */
export const isPageRecord = (record: any): boolean => {
  if (!record || typeof record !== "object") return false;
  if (typeof record.type === "string") return record.type === "page";
  return typeof record.dbKey === "string" && record.dbKey.startsWith("page-");
};

/**
 * 记录是否带正文字段。
 *
 * 只看字段的**存在与类型**，不看内容是否为空：
 * 用户把正文清空后 content:"" / slateData:[] 仍是完整正文，不能被当成投影。
 *
 * 用户数据同步的 summary 模式（server/routes/query.ts 的 SUMMARY_FIELDS）只回
 * 元数据：dbKey/id/type/userId/title/createdAt/updatedAt/created/spaceId/serverOrigin，
 * 既没有 slateData 也没有 content —— 这类副本是**投影**，不是记录本身。
 */
export const hasRecordBodyPayload = (record: any): boolean => {
  if (!record || typeof record !== "object") return false;
  if (Array.isArray(record.slateData)) return true;
  return typeof record.content === "string";
};

/**
 * 本地副本只有元数据投影时，它不能遮蔽带正文的权威记录。
 *
 * 症状：本地缓存里的 summary 投影与权威记录 updatedAt 完全相同 → 只比时间的
 * 替换判定保留本地投影 → 页面标题正确、正文为空。
 *
 * 边界：
 * - 只作用于页面记录；其它类型记录的既有判定不变。
 * - 墓碑不因远端带正文而复活（删除语义由 tombstone 规则决定）。
 * - 本地副本带正文字段（含清空后的空串 / 空数组）时，本地是完整正文，远端不覆盖它。
 * - 本地副本严格更新（真实本地编辑）仍以本地为准，不强制云端覆盖本地。
 */
export const shouldPreferRemoteBodyOverLocalProjection = (
  localData: any,
  remoteData: any
): boolean => {
  if (!isPageRecord(localData) || !isPageRecord(remoteData)) return false;
  if (isTombstoneRecord(localData) || isTombstoneRecord(remoteData)) return false;
  if (!hasRecordBodyPayload(remoteData)) return false;
  if (hasRecordBodyPayload(localData)) return false;
  return compareRemoteRecordsByComparableTime(localData, remoteData) <= 0;
};

/**
 * 写入缓存时是否属于**正文降级**：把只有元数据的页面投影写进已缓存的完整正文之上。
 * 这类写入还会把较新的 summary 时间盖到旧正文上，冒充"已确认的新正文"。
 */
export const isPageBodyDowngrade = (
  nextRecord: any,
  localRecord: any
): boolean => {
  if (!isPageRecord(nextRecord) || !isPageRecord(localRecord)) return false;
  if (isTombstoneRecord(nextRecord) || isTombstoneRecord(localRecord)) return false;
  return !hasRecordBodyPayload(nextRecord) && hasRecordBodyPayload(localRecord);
};

export const pickBestSettledRemoteRecord = ({
  settledResults,
  isBetterCandidate,
}: {
  settledResults: PromiseSettledResult<any>[];
  isBetterCandidate: (current: any, latest: any) => boolean;
}): { data: any; index: number } | null => {
  const validResults = settledResults
    .map((result, index) => ({
      data: result.status === "fulfilled" ? result.value : null,
      index,
    }))
    .filter((item) => item.data !== null && typeof item.data === "object");

  if (validResults.length === 0) return null;

  const latest = validResults.reduce((best, current) =>
    isBetterCandidate(current.data, best.data) ? current : best
  );

  return { index: latest.index, data: latest.data };
};

export const shouldReplaceLocalWithRemoteRecord = ({
  localData,
  remoteData,
  isRemoteNewer,
}: {
  localData: any;
  remoteData: any;
  isRemoteNewer: (remoteData: any, localData: any) => boolean;
}): boolean => {
  if (!remoteData || typeof remoteData !== "object") return false;
  if (!localData || typeof localData !== "object") return true;
  // 只有元数据的本地投影（无 slateData / content）不得遮蔽带正文的权威记录。
  if (shouldPreferRemoteBodyOverLocalProjection(localData, remoteData)) return true;
  return isRemoteNewer(remoteData, localData);
};

export const shouldReplicateLocalRecord = ({
  localData,
  remoteData,
  remoteTargetCount,
}: {
  localData: any;
  remoteData: any;
  remoteTargetCount: number;
}): boolean =>
  !!localData && !remoteData && remoteTargetCount > 0;

const compactUniqueServers = (
  servers: Array<string | null | undefined>
): string[] => {
  const out: string[] = [];
  for (const server of servers) {
    if (typeof server !== "string" || server.trim().length === 0) continue;
    const normalized = normalizeServerOrigin(server);
    if (!out.includes(normalized)) out.push(normalized);
  }
  return out;
};

export const planAuthorityReadServers = ({
  allServers,
  authorityServer,
  serverOrigin,
}: {
  allServers: string[];
  authorityServer?: string | null;
  serverOrigin?: string | null;
}): string[] =>
  compactUniqueServers([authorityServer, serverOrigin, ...allServers]);
