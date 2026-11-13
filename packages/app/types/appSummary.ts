import { deriveAppIdFromRouteKey, isAppRouteKey, resolveAppRouteKey } from "app/utils/appKeys";
import { normalizeAppHttpUrl } from "app/utils/appRuntimeUrl";
import { toTimestampMs } from "core/timestamp";
import type { ContentIcon } from "render/contentIcon/types";

export type AppVisibility = "private" | "unlisted" | "public";
export type AppDeployMode = "platform";

export interface CustomDomain {
  hostname: string;
  url: string;
  mode: "platform_a" | string;
  pendingDns?: boolean;
  dnsRecordType?: "A" | string;
  aRecords?: string[];
  verifiedAt?: string;
}

export interface AppSummary {
  name: string;
  url: string | null;
  appId?: string;
  appKey?: string;
  /** 承载该记录的 server（读取/副本来源），不是原部署位置。 */
  serverOrigin?: string;
  /** 记录里保存的原部署 server：部署位置的真值来源。 */
  versionServerOrigin?: string;
  spaceId?: string | null;
  customUrl?: string;
  modifiedOn?: string;
  visibility?: AppVisibility;
  deployMode?: AppDeployMode;
  icon?: ContentIcon | null;
}

export interface AppSummaryRecord {
  appId?: string;
  appKey?: string;
  dbKey?: string;
  userId?: string;
  name?: string;
  customUrl?: string | null;
  /** 服务端下发的访问地址：有就保留，不丢。 */
  url?: string | null;
  /** 服务端下发的原部署 server。 */
  versionServerOrigin?: string;
  visibility?: AppVisibility;
  deployMode?: AppDeployMode;
  spaceId?: string | null;
  updatedAt?: string | number;
  createdAt?: string | number;
  /** 承载该记录的 server（读取/副本来源），不是原部署位置。 */
  serverOrigin?: string;
  icon?: ContentIcon | null;
}

const toIsoString = (value: unknown): string | undefined => {
  const timestamp = toTimestampMs(value);
  return timestamp > 0 ? new Date(timestamp).toISOString() : undefined;
};

const buildAppUrl = (serverOrigin: string | undefined, appId?: string): string | null => {
  if (!serverOrigin || !appId) return null;
  return `${serverOrigin.replace(/\/+$/, "")}/apps/${appId}/`;
};

export function toAppSummary(
  record: Partial<AppSummaryRecord> | null | undefined,
  fallbackServerOrigin: string
): AppSummary | null {
  if (!record || typeof record !== "object") return null;

  const recordDbKey =
    typeof record.dbKey === "string" && record.dbKey.trim().length > 0
      ? record.dbKey
      : undefined;
  const explicitAppId =
    typeof record.appId === "string" && record.appId.trim().length > 0
      ? record.appId
      : undefined;
  const appKey = resolveAppRouteKey(
    typeof record.appKey === "string"
      ? record.appKey
      : isAppRouteKey(recordDbKey)
        ? recordDbKey
        : undefined,
    explicitAppId
  );
  if (!appKey) return null;
  const appId = explicitAppId ?? deriveAppIdFromRouteKey(appKey, record.userId);

  const name =
    typeof record.name === "string" && record.name.trim().length > 0
      ? record.name
      : appId ?? appKey;

  // 部署位置（真值）与承载来源（副本/读取来源）分开读，不能互相冒充。
  const versionServerOrigin =
    typeof record.versionServerOrigin === "string" &&
    record.versionServerOrigin.trim().length > 0
      ? record.versionServerOrigin.trim()
      : undefined;
  const hostServerOrigin =
    typeof record.serverOrigin === "string" && record.serverOrigin.trim().length > 0
      ? record.serverOrigin.trim()
      : fallbackServerOrigin;
  // 服务端下发的 url 优先保留；缺 url 时按部署位置兜底，再退到承载来源。
  const recordedUrl = normalizeAppHttpUrl(record.url);

  return {
    name,
    url: recordedUrl ?? buildAppUrl(versionServerOrigin ?? hostServerOrigin, appId),
    appId,
    appKey,
    serverOrigin: hostServerOrigin,
    versionServerOrigin,
    spaceId:
      typeof record.spaceId === "string" && record.spaceId.trim().length > 0
        ? record.spaceId
        : null,
    customUrl:
      typeof record.customUrl === "string" && record.customUrl.trim().length > 0
        ? record.customUrl
        : undefined,
    modifiedOn: toIsoString(record.updatedAt ?? record.createdAt),
    visibility: record.visibility ?? "private",
    deployMode: record.deployMode ?? "platform",
    icon: record.icon ?? null,
  };
}
