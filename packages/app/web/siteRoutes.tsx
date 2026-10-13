// app/web/siteRoutes.ts
import type { RouteObject } from "app/routing";
import { type SiteId } from "./siteConstants";

export {
  type SiteId,
  detectSite,
  NON_API_SITE_HOSTNAMES,
} from "./siteConstants";

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
