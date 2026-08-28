import { afterAll, describe, expect, it, mock } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Value-copy snapshots — Bun mock.restore() does not clear mock.module.
const realSettingSlice = { ...(await import("app/settings/settingSlice")) };
const realAuthSlice = { ...(await import("auth/authSlice")) };
const realStore = { ...(await import("app/store")) };
// 这些一并快照：mock.module 是全局粘性的，漏还原会顺着包路径拦截其他 suite
// 文件里的相对 import（usePublicAgents 的行为测试就是这么被打红的）。
const realIdentity = { ...(await import("identity")) };
const realReactRedux = { ...(await import("react-redux")) };
const realUsePublicAgents = { ...(await import("ai/agent/hooks/usePublicAgents")) };
const realUseAgentDialog = { ...(await import("ai/agent/hooks/useAgentDialog")) };
const realUseHasMounted = { ...(await import("app/hooks/useHasMounted")) };
const realRouting = { ...(await import("app/routing")) };

let moduleVersion = 0;

const restoreLeakedModuleMocks = () => {
  mock.module("identity", () => realIdentity);
  mock.module("react-redux", () => realReactRedux);
  mock.module("ai/agent/hooks/usePublicAgents", () => realUsePublicAgents);
  mock.module("ai/agent/hooks/useAgentDialog", () => realUseAgentDialog);
  mock.module("app/hooks/useHasMounted", () => realUseHasMounted);
  mock.module("app/routing", () => realRouting);
  mock.module("app/settings/settingSlice", () => realSettingSlice);
  mock.module("auth/authSlice", () => realAuthSlice);
  mock.module("app/store", () => realStore);
};

async function loadPublicAgentsPreview() {
  const actualReactI18Next = await import("react-i18next");
  const actualReactRouterDom = await import("app/routing");
  const actualReactRedux = await import("react-redux");

  mock.module("react-i18next", () => ({
    ...actualReactI18Next,
    useTranslation: () => ({
      t: (key: string, fallback?: string) => fallback ?? key,
    }),
  }));

  mock.module("app/routing", () => ({
    ...actualReactRouterDom,
    useNavigate: () => () => {},
    Link: ({
      children,
      to,
      ...props
    }: {
      children?: React.ReactNode;
      to?: string;
      [key: string]: unknown;
    }) => <a href={to} {...props}>{children}</a>,
  }));

  mock.module("render/web/ui/Avatar", () => ({
    default: ({ name }: { name: string }) => <div>{name}</div>,
  }));

  // Do not mock.module("ai/agent/hooks/usePublicAgents"): sticky package mocks
  // intercept later relative imports of the real hook under suite isolation.
  // SSR renderToStaticMarkup never runs effects, so initialData alone is enough.
  mock.module("app/store", () => ({
    ...realStore,
    useAppDispatch: () => () => undefined,
    useAppSelector: (selector: (state: any) => unknown) =>
      selector({
        settings: {
          currentServer: "http://127.0.0.1:38123",
          syncServers: ["http://127.0.0.1:38123"],
        },
        auth: {
          userId: null,
        },
      }),
  }));

  const realIdentity = await import("identity");
  mock.module("identity", () => ({
    ...realIdentity,
    useUserId: () => "user-1",
  }));
  
  mock.module("react-redux", () => ({
    ...actualReactRedux,
    useStore: () => ({
      getState: () => ({}),
      dispatch: () => {},
      subscribe: () => () => {},
    }),
  }));

  mock.module("app/settings/settingSlice", () => ({
    ...realSettingSlice,
    selectCurrentServer: (state: any) => state.settings.currentServer,
    selectSyncServers: (state: any) => state.settings.syncServers,
  }));

  mock.module("auth/authSlice", () => ({
    ...realAuthSlice,
    selectUserId: (state: any) => state.auth.userId,
  }));

  mock.module("app/hooks/useHasMounted", () => ({
    useHasMounted: () => true,
  }));

  mock.module("app/hooks/useImageLoadFallback", () => ({
    useImageLoadFallback: (url: string | null) => ({
      shouldRenderImage: !!url,
      handleImageError: () => {},
    }),
  }));

  mock.module("ai/agent/hooks/useAgentDialog", () => ({
    useAgentDialog: () => ({ isStarting: false, startDialog: () => {} }),
  }));

  mock.module("app/favorite/AgentFavoriteButton", () => ({
    default: ({ agentKey, className }: { agentKey: string; className?: string }) => (
      <div data-testid="fav-btn" data-agent={agentKey} className={className} />
    ),
  }));

  mock.module("render/web/ui/Button", () => ({
    default: ({ children, onClick, className, disabled, loading, icon }: any) => (
      <button type="button" className={className} onClick={onClick} disabled={disabled || loading}>
        {icon}
        {children}
      </button>
    ),
  }));

  const mod = await import(`./PublicAgentsPreview?test=${moduleVersion++}`);
  mock.restore();
  return mod.default;
}

describe("PublicAgentsPreview", () => {
  afterAll(() => {
    restoreLeakedModuleMocks();
  });

  it("renders ordinary agent pricing as explicit per-million-token model cost on home AI plaza cards", async () => {
    const PublicAgentsPreview = await loadPublicAgentsPreview();
    const html = renderToStaticMarkup(
      <PublicAgentsPreview
        data={[
          {
            id: "agent-home-preview",
            dbKey: "agent-home-preview",
            name: "Home Preview Agent",
            introduction: "hello",
            provider: "openrouter",
            model: "openai/gpt-4.1-mini",
            inputPrice: 20,
            outputPrice: 20,
            tags: [],
          } as any,
        ]}
      />
    );

    expect(html).not.toContain("输入");
    expect(html).toContain("输出");
    expect(html).not.toContain("tokens");
    expect(html).toContain("1M / 20 积分");
    expect(html).toContain("agent__model-cost");
    expect(html).not.toContain("按次参考价");
    expect(html).not.toContain("/ perTurn");
  });

  it("does not render reference pricing for CLI agents on home AI plaza cards", async () => {
    const PublicAgentsPreview = await loadPublicAgentsPreview();
    const html = renderToStaticMarkup(
      <PublicAgentsPreview
        data={[
          {
            id: "agent-home-cli",
            dbKey: "agent-home-cli",
            name: "CLI Agent",
            introduction: "hello",
            apiSource: "cli",
            provider: "openrouter",
            model: "openai/gpt-4.1-mini",
            inputPrice: 20,
            outputPrice: 20,
            tags: [],
          } as any,
        ]}
      />
    );

    expect(html).not.toContain("按次参考价");
    expect(html).not.toContain("/ perTurn");
  });

  it("keeps image agents on per-image pricing in home AI plaza cards", async () => {
    const PublicAgentsPreview = await loadPublicAgentsPreview();
    const html = renderToStaticMarkup(
      <PublicAgentsPreview
        data={[
          {
            id: "agent-home-image",
            dbKey: "agent-home-image",
            name: "Image Agent",
            introduction: "hello",
            provider: "google",
            model: "gemini-3.1-flash-image-preview",
            imageConfig: { enabled: true, imageSize: "2K" },
            tags: [],
          } as any,
        ]}
      />
    );

    expect(html).toContain(">price<");
    expect(html).toContain("/ perImage");
  });

  it("renders custom agent avatars on home AI plaza cards when avatarFileId is present", async () => {
    const PublicAgentsPreview = await loadPublicAgentsPreview();
    const html = renderToStaticMarkup(
      <PublicAgentsPreview
        data={[
          {
            id: "agent-home-avatar",
            dbKey: "agent-home-avatar",
            name: "Avatar Agent",
            introduction: "hello",
            avatarFileId: "file-avatar-123",
            tags: [],
          } as any,
        ]}
      />
    );

    expect(html).toContain('class="agent__avatar-img"');
    expect(html).toContain("file-avatar-123");
  });
});
