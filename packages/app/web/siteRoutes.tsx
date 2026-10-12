// app/web/siteRoutes.ts
import type { RouteObject } from "app/routing";


export type SiteId = "date" | "crm" | "default";

const hostToSite: Record<string, SiteId> = {
  "nolotus.local": "crm",
  "date.nolo.chat": "date",
  "crm.nolo.chat": "crm",
};

export const detectSite = (hostname: string): SiteId =>
  hostToSite[hostname] ?? "default";

export async function loadRoutes(
  site: SiteId,
  user?: any
): Promise<RouteObject[]> {
  if (site === "crm") {
    const { crmRoutes } = await import("lab/crm/crmRoutes");
    return crmRoutes;
  }

  if (site === "date") {
    const { dateRoutes } = await import("lab/date/dateRoutes");
    return dateRoutes;
  }

  const appRoutes = await import("app/web/routes");
  return appRoutes.routes();
}
