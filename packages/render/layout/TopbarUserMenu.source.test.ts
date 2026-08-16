import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

const root = join(import.meta.dir, "../../..");

describe("TopbarUserMenu source contract", () => {
  test("keeps the login-other-user menu action wired to the login route", () => {
    const source = readFileSync(
      join(root, "packages/render/layout/TopbarUserMenu.tsx"),
      "utf8"
    );

    expect(source).toContain("LuLogIn");
    expect(source).toContain('t("loginOtherUser", "登录其他用户")');
    expect(source).toContain('navigate("/login")');
    expect(source).toContain("topbar-user-menu__item--login-other");
  });

  test("opens the account menu from the avatar (no chevron toggle)", () => {
    const source = readFileSync(
      join(root, "packages/render/layout/TopbarUserMenu.tsx"),
      "utf8"
    );
    expect(source).toContain("topbar-user-menu__avatar-button");
    // Mixed content (header + Switch + actions) → DialogTrigger/Popover, not Menu.
    expect(source).toContain("DialogTrigger");
    expect(source).toContain("onOpenChange={setMenuOpen}");
    expect(source).toContain('import { Popover } from "render/web/ui/Popover"');
    expect(source).toContain('aria-label={t("accountMenu", "账号菜单")}');
    expect(source).not.toContain("LuChevronDown");
    expect(source).not.toContain("topbar-user-menu__toggle");
    expect(source).not.toContain('role="menu"');
    expect(source).not.toContain("useClickOutside");
    // Profile remains reachable from the menu header username.
    expect(source).toContain('navigate("/life")');
    expect(source).toContain("topbar-user-menu__username--link");
  });
});
