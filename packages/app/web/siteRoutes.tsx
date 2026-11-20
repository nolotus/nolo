// app/web/siteRoutes.ts
import type { RouteObject } from "app/routing";
import { type SiteId } from "./siteConstants";

export {
  type SiteId,
  detectSite,
  NON_API_SITE_HOSTNAMES,
} from "./siteConstants";

export async function loadRoutes(
  _site: SiteId,
  _user?: any
): Promise<RouteObject[]> {
  const appRoutes = await import("app/web/routes");
  return appRoutes.routes();
}
