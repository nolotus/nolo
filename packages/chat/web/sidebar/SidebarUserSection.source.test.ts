import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

const root = join(import.meta.dir, "../../../..");

describe("SidebarUserSection source contract", () => {
  test("routes avatar clicks to life profile and keeps account menu on chevron", () => {
    const source = readFileSync(
      join(root, "packages/chat/web/sidebar/SidebarUserSection.tsx"),
      "utf8"
    );

    expect(source).toContain('navigate("/life")');
    expect(source).toContain('navigate("/life/usage")');
    expect(source).toContain("SidebarUserSection__menu-toggle");
    expect(source).toContain('t("usage_dashboard", "使用统计")');
    expect(source).toContain('t("goToProfile", "个人主页")');
    expect(source).toContain("DarkModeSwitch compact");
    expect(source).toContain("LuUserPlus");
    expect(source).toContain("LuChevronDown");
  });

  test("hosts the feedback entry that moved off the home quick-chat chips", () => {
    const source = readFileSync(
      join(root, "packages/chat/web/sidebar/SidebarUserSection.tsx"),
      "utf8"
    );

    expect(source).toContain("QUICK_CHAT_FEEDBACK_LAUNCH_PATH");
    expect(source).toContain("navigate(QUICK_CHAT_FEEDBACK_LAUNCH_PATH)");
    expect(source).toContain('t("quickChat.chipFeedbackAgent", "我想反馈")');
  });
});