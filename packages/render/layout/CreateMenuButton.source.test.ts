import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(import.meta.dir, relativePath), "utf-8");

/** Domain + presentation + policy (split from former single CreateMenuButton.tsx). */
const readCreateMenuSources = () =>
  [
    readSource("CreateMenuButtonContainer.tsx"),
    readSource("CreateMenuButton.tsx"),
    readSource("createMenuPolicy.ts"),
  ].join("\n");

describe("CreateMenuButton source contract", () => {
  it("navigates new chats to the dedicated QuickChat page with optional spaceId", () => {
    const source = readCreateMenuSources();

    expect(source).toContain('import { AppRoutePaths } from "app/constants/routePaths";');
    expect(source).toContain("const spaceId = currentSpaceId ?? currentSpace?.id ?? null");
    expect(source).toContain("encodeURIComponent(spaceId)");
    expect(source).toContain("AppRoutePaths.CHAT");
    expect(source).toContain('case "new-chat"');
    expect(source).not.toContain('import { noloAgentId } from "core/init";');
    expect(source).not.toContain("createNewDialog({");
    expect(source).not.toContain("agents: [noloAgentId]");
    expect(source).not.toContain("selectCurrentDialogConfig");
  });

  it("uses RAC Menu for items (keyboard roles come from react-aria-components)", () => {
    const source = readCreateMenuSources();
    // AriaMenuTrigger + our Popover with hideArrow, consistent with every other
    // surface (Menu/Select/UserMenu/quick-chat picker all hide the arrow).
    expect(source).toContain("MenuTrigger as AriaMenuTrigger");
    expect(source).toContain("hideArrow");
    expect(source).toContain('import { Menu } from "render/web/ui/Menu"');
    expect(source).toContain('import { MenuItem } from "render/web/ui/Menu"');
    expect(source).toContain("<Menu onAction={onAction}>");
    expect(source).toContain('case "new-chat"');
    expect(source).toContain("id={id}");
    // Hand-rolled button items + stopPropagation shell removed; CategoryHeader
    // already guards .create-menu / .create-menu-popover / isCreateMenuOpen.
    expect(source).not.toContain("create-menu__item");
    expect(source).not.toContain("create-menu__dropdown");
    expect(source).not.toContain("stopMenuEvent");
  });

  it("opens space-scoped new pages under /space/:spaceId/:pageKey", () => {
    const source = readCreateMenuSources();
    expect(source).toContain("buildRoutableContentPath");
    expect(source).toContain("pageCreateSpaceId");
    expect(source).toContain("navigate(`${path}?edit=true`)");
    expect(source).not.toContain("navigate(`/${key}?edit=true`)");
  });

  it("keeps only manual AI creation in the create menu (conversation create lives on new-chat page)", () => {
    const source = readCreateMenuSources();

    expect(source).not.toContain("startConversationalAgentCreation");
    expect(source).not.toContain("create-agent-conversation");
    expect(source).not.toContain('t("cybot:create_agent_conversation", "用对话创建 AI")');
    expect(source).toContain('t("agent:create_agent_manual", "手动配置 AI")');
    expect(source).toContain('navigate("/create/agent")');
  });

  it("persists create-menu opens through settings instead of component-local storage", () => {
    const source = readCreateMenuSources();

    expect(source).toContain("selectCreateMenuOpenCount");
    expect(source).toContain("setSettings({ createMenuOpenCount: createMenuOpenCount + 1 })");
    expect(source).toContain("CREATE_MENU_OPEN_COUNT_THRESHOLD");
    expect(source).toContain("createMenuOpenCount <= CREATE_MENU_OPEN_COUNT_THRESHOLD");
    expect(source).toContain('aria-label={triggerTitle}');
    expect(source).toContain("{shouldShowLabel ?");
    expect(source).not.toContain("nolo-create-menu-open-count");
    expect(source).not.toContain("localStorage");
  });

  it("hover-open preview does not increment createMenuOpenCount (only manual click does)", () => {
    const source = readCreateMenuSources();

    // 两条路径共享 applyOpenChange(open, count)，区别只在 count 参数：
    // 点击 count=true（计数 + onOpenMenu），hover count=false（不计数）。
    expect(source).toContain("applyOpenChange");
    expect(source).toContain("applyOpenChange(open, true)");
    expect(source).toContain("applyOpenChange(open, false)");
    // 计数副作用只在 count=true 分支触发：源码里计数被 if (open && count) 守卫。
    expect(source).toContain("if (open && count)");
  });

  it("hover-open uses RAC PreviewTrigger, not hand-rolled timers (avoids flicker)", () => {
    const source = readCreateMenuSources();

    // 必须用 RAC PreviewTrigger 处理 hover 预览：内置 warmup/close 延迟与
    // trigger↔popover 间隙处理，手写 mouseEnter/Leave 计时器会在间隙震荡闪烁。
    expect(source).toContain("PreviewTrigger as AriaPreviewTrigger");
    expect(source).toContain("<AriaPreviewTrigger");
    // 手写计时器实现细节不应再出现（防止退化回闪烁方案）。
    expect(source).not.toContain("scheduleClose");
    expect(source).not.toContain("onMouseEnter");
    expect(source).not.toContain("HOVER_CLOSE_DELAY_MS");
  });
});
