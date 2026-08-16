import { describe, expect, it } from "bun:test";

const read = (path: string) => Bun.file(path).text();

describe("app web routes source", () => {
  it("keeps desktop Suspense loading free of localized text", async () => {
    const source = await read("packages/app/web/routes.tsx");

    expect(source).toContain('import { getIsDesktopApp } from "app/utils/env";');
    expect(source).toContain("message={getIsDesktopApp() ? undefined : message}");
    expect(source).toContain("<PageLoading");
  });

  it("keeps dialog PageLoader and heavy marketing/lab pages route-lazy", async () => {
    const source = await read("packages/app/web/routes.tsx");

    expect(source).toContain('const PageLoader = lazy(() => import("render/page/PageLoader"))');
    expect(source).toContain('const Lab = lazy(() => import("app/pages/Lab"))');
    // Cloud-only pages use cloudLazy (not lazy) to avoid typecheck errors for excluded pages
    expect(source).toContain('cloudLazy("app/pages/Pricing/Price"');
    expect(source).toContain('cloudLazy("app/pages/Recharge"');
    expect(source).toContain('const NewChatPage = lazy(() => import("app/pages/NewChatPage"))');
    expect(source).toContain('path: AppRoutePaths.CHAT.slice(1)');
    expect(source).toContain('element: withSuspense(<NewChatPage />, "新对话")');
    expect(source).toContain(
      'const GuidedAgentCreatePage = lazy(() => import("ai/agent/web/GuidedAgentCreatePage"))'
    );
    // Avoid unused static-looking agent form entry on the main route table.
    expect(source).not.toContain('const AgentForm = lazy(() => import("ai/agent/web/AgentForm"))');
  });

  it("ADMIN_EMAIL_PATH stays synced with app/admin/adminPages.ts", async () => {
    const routesSource = await read("packages/app/web/routes.tsx");
    const adminSource = await read("packages/app/admin/adminPages.ts");

    // routes.tsx must reference the admin email path
    expect(routesSource).toContain("ADMIN_EMAIL_PATH");
    // The hardcoded path in routes.tsx must match adminPages.ts
    const adminMatch = adminSource.match(/email:\s*["']([^"']+)["']/);
    expect(adminMatch).not.toBeNull();
    const adminEmailPath = adminMatch![1];
    expect(routesSource).toContain(`"${adminEmailPath}"`);
  });

  it("does not sync-import PageLoader or DialogPage from the main route table", async () => {
    const source = await read("packages/app/web/routes.tsx");
    expect(source).not.toContain('import PageLoader from "render/page/PageLoader"');
    expect(source).not.toContain('import DialogPage from "chat/dialog/DialogPage"');
  });
});

describe("space routes lazy boundaries", () => {
  it("lazy-loads SpaceLayout and PageLoader so DialogPage is not in routes static graph", async () => {
    const source = await read("packages/create/space/routes.tsx");

    expect(source).toContain(
      'const SpaceLayout = lazy(() => import("create/space/components/SpaceLayout"))'
    );
    expect(source).toContain(
      'const PageLoader = lazy(() => import("render/page/PageLoader"))'
    );
    expect(source).not.toContain('import SpaceLayout from "create/space/components/SpaceLayout"');
    expect(source).not.toContain('import PageLoader from "render/page/PageLoader"');
  });
});

describe("settings routes lazy boundaries", () => {
  it("lazy-loads SettingLayout and Appearance off the entry static path", async () => {
    const source = await read("packages/app/settings/routes.tsx");

    expect(source).toContain('const SettingLayout = lazy(() => import("./web/SettingLayout"))');
    expect(source).toContain('const Appearance = lazy(() => import("./web/Appearance"))');
    expect(source).not.toContain('import SettingLayout from "./web/SettingLayout"');
    expect(source).not.toContain('import Appearance from "./web/Appearance"');
  });
});
