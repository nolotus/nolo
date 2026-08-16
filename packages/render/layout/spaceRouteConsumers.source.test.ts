import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const topBarSource = readFileSync(join(import.meta.dir, "TopBar.tsx"), "utf-8");
const mainLayoutSource = readFileSync(
  join(import.meta.dir, "MainLayout.tsx"),
  "utf-8"
);

describe("space route consumer source contract", () => {
  it("keeps TopBar on the shared space route helper instead of local regex parsing", () => {
    expect(topBarSource).toContain('from "./mainLayoutViewMode";');
    expect(topBarSource).toContain("getRouteDescriptor(location.pathname)");
    expect(topBarSource).not.toContain("getSpaceRouteContext(location.pathname)");
    expect(topBarSource).not.toContain("SpaceTypeFilterBar");
    expect(topBarSource).not.toContain("topbar__space-filters");
    expect(topBarSource).not.toContain('/^\\/space\\/[^/]+\\/?$/');
  });

  it("keeps MainLayout delegating view-mode forcing to the shared helper module", () => {
    expect(mainLayoutSource).toContain(
      'from "./mainLayoutViewMode"'
    );
    expect(mainLayoutSource).toContain("shouldForceCategoriesViewMode");
    expect(mainLayoutSource).not.toContain("shouldForceAllViewMode");
  });
});
