import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("share route source contract", () => {
  it("keeps the share import route eagerly imported for SSR", () => {
    const source = readFileSync(join(import.meta.dir, "routes.tsx"), "utf8");
    expect(source).toContain('import ShareImportPage from "app/pages/ShareImportPage"');
    expect(source).not.toContain('const ShareImportPage = lazy(() => import("app/pages/ShareImportPage"))');
    expect(source).toContain('path: "share/:token"');
    expect(source).toContain('withSuspense(<ShareImportPage />, "分享内容")');
  });

  it("keeps the non-detail share surfaces lazy-loaded", () => {
    const routesSource = readFileSync(join(import.meta.dir, "routes.tsx"), "utf8");
    const lifeRoutesSource = readFileSync(
      join(import.meta.dir, "../../life/routes.tsx"),
      "utf8"
    );
    expect(routesSource).toContain(
      'const ShareCommunityPage = lazy(() => import("app/pages/ShareCommunityPage"))'
    );
    // My shares lives under life routes, not app/web/routes.
    expect(lifeRoutesSource).toContain(
      'const LazyMySharesPage = lazy(() => import("app/pages/MySharesPage"))'
    );
  });
});
