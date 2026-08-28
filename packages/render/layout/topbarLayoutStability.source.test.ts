import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const layoutDir = import.meta.dir;
const mainLayout = readFileSync(join(layoutDir, "MainLayout.tsx"), "utf8");
const topBar = readFileSync(join(layoutDir, "TopBar.tsx"), "utf8");
const useTopBarState = readFileSync(join(layoutDir, "useTopBarState.tsx"), "utf8");
const layoutCss = readFileSync(join(layoutDir, "layout.css"), "utf8");

describe("OPT-FE-08 topbar layout stability contracts", () => {
  it("uses a single --topbar-height token for shell chrome", () => {
    expect(layoutCss).toContain("--topbar-height: 56px");
    expect(layoutCss).toMatch(/\.topbar\s*\{[^}]*height:\s*var\(--topbar-height\)/s);
    expect(layoutCss).toMatch(
      /\.MainLayout__topbarSlot\s*\{[^}]*height:\s*var\(--topbar-height\)/s,
    );
    expect(layoutCss).toContain("top: var(--topbar-height);");
  });

  it("Suspense fallback matches TopBar height (no 52→56 jump)", () => {
    expect(mainLayout).toContain('className="MainLayout__topbarSlot"');
    expect(mainLayout).not.toMatch(/height:\s*52/);
    expect(layoutCss).toMatch(
      /\.MainLayout__topbarSlot\s*\{[^}]*flex:\s*0 0 var\(--topbar-height\)/s,
    );
  });

  it("auth placeholder matches user-area width model", () => {
    const authBlock = layoutCss.match(/\.topbar__auth-placeholder\s*\{([^}]*)\}/s)?.[1] ?? "";
    const userBlock = layoutCss.match(/\.topbar__user-area\s*\{([^}]*)\}/s)?.[1] ?? "";
    expect(authBlock).toContain("min-width: 128px");
    expect(userBlock).toContain("min-width: 128px");
    expect(topBar).toContain("topbar__auth-placeholder-dot");
  });

  it("does not subscribe TopBar to selectAllMsgs (stream-token re-render)", () => {
    expect(useTopBarState).toContain("selectAllMsgs");
    expect(useTopBarState).toContain("useStore");
    expect(useTopBarState).toContain("selectAllMsgs(store.getState())");
    expect(useTopBarState).not.toMatch(/useAppSelector\(\s*selectAllMsgs\s*\)/);
  });

  it("reserves overflow/action slots and dialog pending skeleton", () => {
    expect(topBar).toContain("reserveOverflowSlot");
    expect(topBar).toContain("topbar__action-slot--empty");
    expect(topBar).toContain("topbar__dialog-skeleton");
    expect(layoutCss).toContain(".topbar__action-slot");
    expect(layoutCss).toContain(".topbar__dialog-skeleton");
  });
});
