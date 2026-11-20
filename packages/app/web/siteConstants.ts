export type SiteId = "default";

/**
 * 站点真值表：主机名 → 站点条目。
 * - `servesApi`：该主机的 origin 本身是 API server（首帧 currentServer 可以指向
 *   它）。nolotus.local 是保留的局域网 API 入口。
 */
type SiteEntry = { site: SiteId; servesApi?: boolean };

const hostToSite: Readonly<Record<string, SiteEntry>> = {
  "nolotus.local": { site: "default", servesApi: true },
};

export const detectSite = (hostname: string): SiteId =>
  hostToSite[hostname]?.site ?? "default";

/**
 * 子应用站点中「origin 不是 API server」的主机名集合。
 *
 * 唯一真值来源：首帧 currentServer 的排除列（app/settings/serverBootstrap.ts）
 * 与 App.tsx mount effect 的跳过判定都从这里派生，新增/删除站点只改 hostToSite。
 * 不含 nolotus.local —— 它是本地 API server。
 */
export const NON_API_SITE_HOSTNAMES: ReadonlySet<string> = new Set(
  Object.entries(hostToSite)
    .filter(([, entry]) => entry.site !== "default" && !entry.servesApi)
    .map(([hostname]) => hostname),
);
