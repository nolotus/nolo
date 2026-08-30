import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "../../..");

const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

describe("radius scale source contract", () => {
  test("defines xs/sm/md tiers with lg/xl aliases in theme tokens", () => {
    const source = read("packages/app/settings/themeSelectors.ts");

    expect(source).toContain("xs/sm/md map to control/surface/overlay tiers");
    expect(source).toContain('const xs = compact ? "10px" : "12px"');
    expect(source).toContain("return { xs, sm, md, lg: sm, xl: md }");
  });

  test("maps core primitives to semantic radius tiers", () => {
    const ui = read("packages/render/web/ui.css");
    const form = read("packages/render/web/form.css");
    const modal = read("packages/render/web/modal.css");
    const settings = read("packages/app/settings/web/settings.css");
    const layout = read("packages/render/layout/layout.css");
    const sidebar = read("packages/chat/web/sidebarStyles.ts");

    expect(ui).toContain("--btn-radius: var(--radius-xs)");
    expect(form).toContain("border-radius: var(--radius-sm)");
    expect(modal).toContain(".c-dialog");
    expect(modal).toContain("border-radius: var(--radius-md)");
    expect(settings).toContain(".SettingsModal");
    expect(settings).toContain("border-radius: var(--radius-md)");
    expect(layout).toContain(".topbar-dropdown");
    expect(sidebar).toContain("sidebarUserSectionDropdown");
  });
});
