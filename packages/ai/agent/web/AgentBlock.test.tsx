import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Value-copy snapshots — Bun mock.restore() does not clear mock.module.
const realAuthSlice = { ...(await import("auth/authSlice")) };
const realSettingSlice = { ...(await import("app/settings/settingSlice")) };
const realDbSlice = { ...(await import("database/dbSlice")) };
const realFavoriteSlice = { ...(await import("app/favorite/favoriteStore")) };
const realSpaceModule = {
  ...(await import("create/space/spaceCurrentSelectors")),
};
const realSpaceCurrentStore = {
  ...(await import("create/space/spaceCurrentStore")),
};
// 同 PublicAgentsPreview：粘性 mock 漏还原会污染后续 suite 文件。
const realIdentity = { ...(await import("identity")) };
const realReactRedux = { ...(await import("react-redux")) };
const realStore = { ...(await import("app/store")) };
const realUseAgentDialog = {
  ...(await import("ai/agent/hooks/useAgentDialog")),
};
const realUseHasMounted = { ...(await import("app/hooks/useHasMounted")) };
const realRouting = { ...(await import("app/routing")) };
const realToast = { ...(await import("app/utils/toast")) };

let moduleVersion = 0;
let mockSpaceState: {
  currentSpaceId: string | null;
  viewMode: "all" | "categories";
};
const dialogOptions: Array<{
  spaceId?: string | null;
  preferredServerOrigin?: string | null;
}> = [];

const restoreLeakedModuleMocks = () => {
  mock.module("identity", () => realIdentity);
  mock.module("react-redux", () => realReactRedux);
  mock.module("app/store", () => realStore);
  mock.module("ai/agent/hooks/useAgentDialog", () => realUseAgentDialog);
  mock.module("app/hooks/useHasMounted", () => realUseHasMounted);
  mock.module("app/routing", () => realRouting);
  mock.module("app/utils/toast", () => realToast);
  mock.module("auth/authSlice", () => realAuthSlice);
  mock.module("app/settings/settingSlice", () => realSettingSlice);
  mock.module("database/dbSlice", () => realDbSlice);
  mock.module("app/favorite/favoriteStore", () => realFavoriteSlice);
  mock.module("create/space/spaceCurrentSelectors", () => realSpaceModule);
  mock.module("create/space/spaceCurrentStore", () => realSpaceCurrentStore);
};

async function loadAgentBlock() {
  const actualReactI18Next = await import("react-i18next");
  const actualReactRouterDom = await import("app/routing");
  const actualReactRedux = await import("react-redux");
  const actualStore = await import("app/store");

  mock.module("react-i18next", () => ({
    ...actualReactI18Next,
    useTranslation: () => ({
      t: (key: string, fallback?: string) => fallback ?? key,
    }),
  }));

  mock.module("app/routing", () => ({
    ...actualReactRouterDom,
    useNavigate: () => () => {},
    useParams: () => ({}),
    Link: ({
      children,
      to,
      ...props
    }: {
      children?: React.ReactNode;
      to?: string;
      [key: string]: unknown;
    }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  }));

  const realIdentity = await import("identity");
  mock.module("identity", () => ({
    ...realIdentity,
    useUserId: () => "user-1",
  }));

  mock.module("react-redux", () => ({
    ...actualReactRedux,
    useSelector: (selector: (state: any) => unknown) =>
      selector({
        auth: {
          currentUser: { userId: "user-1" },
        },
      }),
  }));

  mock.module("app/store", () => ({
    ...actualStore,
    useAppDispatch: () => () => ({
      unwrap: async () => undefined,
    }),
    useAppSelector: (selector: (state: any) => unknown) =>
      selector({
        settings: {
          currentServer: "http://localhost",
        },
        favorite: {
          agentIds: [],
        },
        space: mockSpaceState,
      }),
  }));

  mock.module("auth/authSlice", () => ({
    ...realAuthSlice,
    selectUserId: (state: any) => state?.auth?.currentUser?.userId ?? "user-1",
  }));

  mock.module("app/settings/settingSlice", () => ({
    ...realSettingSlice,
    selectCurrentServer: () => "http://localhost",
  }));

  mock.module("database/dbSlice", () => ({
    ...realDbSlice,
    remove: (payload: unknown) => payload,
  }));

  mock.module("app/favorite/favoriteStore", () => ({
    ...realFavoriteSlice,
    removeFavoriteLocally: (payload: unknown) => payload,
  }));

  // Keep real deleteContentFromSpace thunk (.fulfilled) for sibling reducers.
  mock.module("create/space/spaceCurrentSelectors", () => ({
    ...realSpaceModule,
    selectCurrentSpaceId: (state: any) => state.space.currentSpaceId,
    selectViewMode: (state: any) => state.space.viewMode,
  }));

  mock.module("create/space/spaceCurrentStore", () => ({
    ...realSpaceCurrentStore,
    useCurrentSpaceId: () =>
      mockSpaceState.viewMode === "all" ? null : mockSpaceState.currentSpaceId,
    useViewMode: () => mockSpaceState.viewMode,
    getCurrentSpaceId: () =>
      mockSpaceState.viewMode === "all" ? null : mockSpaceState.currentSpaceId,
    getCurrentSpaceIdRaw: () => mockSpaceState.currentSpaceId,
    getViewMode: () => mockSpaceState.viewMode,
  }));

  // module replacement for app/identity removed

  mock.module("core/init", () => ({
    isSystemAdmin: () => false,
  }));

  mock.module("app/hooks/useHasMounted", () => ({
    useHasMounted: () => true,
  }));

  mock.module("ai/agent/hooks/useAgentDialog", () => ({
    useAgentDialog: (
      _agentKey: string,
      options: {
        spaceId?: string | null;
        preferredServerOrigin?: string | null;
      } = {},
    ) => {
      dialogOptions.push(options);
      return {
        isStarting: false,
        startDialog: () => {},
      };
    },
  }));

  mock.module("app/favorite/AgentFavoriteButton", () => ({
    default: ({
      agentKey,
      className,
    }: {
      agentKey: string;
      className?: string;
    }) => (
      <button
        type="button"
        data-testid="fav-btn"
        data-agent={agentKey}
        className={`agent-fav-btn-optimized ${className || ""}`}
      />
    ),
  }));

  mock.module("render/web/ui/Avatar", () => ({
    default: ({ name }: { name: string }) => <div>{name}</div>,
  }));

  mock.module("render/web/ui/modal/Dialog", () => ({
    Dialog: ({ children }: { children?: React.ReactNode }) => (
      <div>{children}</div>
    ),
  }));

  mock.module("ai/agent/avatarUtils", () => ({
    resolveAvatarUrl: () => null,
  }));

  mock.module("ai/llm/modelAvatar", () => ({
    getModelAvatarComponent: () => null,
  }));

  mock.module("app/utils/toast", () => ({
    default: {
      success: () => {},
      error: () => {},
    },
    toast: {
      success: () => {},
      error: () => {},
    },
  }));

  const mod = await import(`./AgentBlock?test=${moduleVersion++}`);
  return mod.default;
}

describe("AgentBlock", () => {
  afterAll(() => {
    restoreLeakedModuleMocks();
  });

  beforeEach(() => {
    mockSpaceState = {
      currentSpaceId: null,
      viewMode: "all",
    };
    dialogOptions.length = 0;
  });

  it("does not render the favorite button", async () => {
    const AgentBlock = await loadAgentBlock();
    const html = renderToStaticMarkup(
      <AgentBlock
        item={
          {
            id: "agent-1",
            dbKey: "agent-1",
            name: "Favorite Agent",
            introduction: "Helpful intro",
            tags: [],
          } as any
        }
        reload={() => {}}
      />,
    );

    expect(html).not.toContain("agent__fav-btn");
    expect(html.match(/<button/g)?.length ?? 0).toBe(1);
  });

  it("renders ordinary agent pricing as explicit per-million-token model cost", async () => {
    const AgentBlock = await loadAgentBlock();
    const html = renderToStaticMarkup(
      <AgentBlock
        item={
          {
            id: "agent-turn",
            dbKey: "agent-turn",
            name: "Turn Agent",
            introduction: "Helpful intro",
            provider: "openrouter",
            model: "openai/gpt-4.1-mini",
            inputPrice: 20,
            outputPrice: 20,
            tags: [],
          } as any
        }
        reload={() => {}}
      />,
    );

    expect(html).not.toContain("输入");
    expect(html).toContain("输出");
    expect(html).not.toContain("tokens");
    expect(html).toContain("1M / 20 积分");
    expect(html).toContain("agent__model-cost");
    expect(html).not.toContain("按次参考价");
    expect(html).not.toContain("/ perTurn");
    expect(html).not.toContain("100次");
    expect(html).not.toContain("1000次");
  });

  it("keeps tiny ordinary agent pricing as per-million-token model cost", async () => {
    const AgentBlock = await loadAgentBlock();
    const html = renderToStaticMarkup(
      <AgentBlock
        item={
          {
            id: "agent-tiny-turn",
            dbKey: "agent-tiny-turn",
            name: "Tiny Turn Agent",
            introduction: "Helpful intro",
            provider: "openrouter",
            model: "openai/gpt-4.1-mini",
            inputPrice: 1,
            outputPrice: 0,
            tags: [],
          } as any
        }
        reload={() => {}}
      />,
    );

    expect(html).not.toContain("输入");
    expect(html).not.toContain("1 积分");
    expect(html).not.toContain("tokens");
    expect(html).toContain("免费");
    expect(html).toContain("agent__model-cost");
    expect(html).not.toContain("按次参考价");
    expect(html).not.toContain("/ perTurn");
    expect(html).not.toContain("100次");
    expect(html).not.toContain("1000次");
  });

  it("passes the agent origin server into dialog creation options", async () => {
    const AgentBlock = await loadAgentBlock();
    renderToStaticMarkup(
      <AgentBlock
        item={
          {
            id: "agent-origin",
            dbKey: "agent-origin",
            name: "Origin Agent",
            introduction: "Helpful intro",
            originServer: "https://us.nolo.chat",
            tags: [],
          } as any
        }
        reload={() => {}}
      />,
    );

    expect(dialogOptions.at(-1)).toEqual({
      spaceId: null,
      preferredServerOrigin: "https://us.nolo.chat",
    });
  });

  it("prefers authority server over origin provenance for dialog creation options", async () => {
    const AgentBlock = await loadAgentBlock();
    renderToStaticMarkup(
      <AgentBlock
        item={
          {
            id: "agent-authority",
            dbKey: "agent-authority",
            name: "Authority Agent",
            introduction: "Helpful intro",
            authorityServer: "https://self.example.com",
            originServer: "https://us.nolo.chat",
            tags: [],
          } as any
        }
        reload={() => {}}
      />,
    );

    expect(dialogOptions.at(-1)).toEqual({
      spaceId: null,
      preferredServerOrigin: "https://self.example.com",
    });
  });

  it("starts public plaza agents in the currently selected space when the sidebar is scoped", async () => {
    mockSpaceState = {
      currentSpaceId: "space-current",
      viewMode: "categories",
    };
    const AgentBlock = await loadAgentBlock();

    renderToStaticMarkup(
      <AgentBlock
        item={
          {
            id: "agent-space-start",
            dbKey: "agent-space-start",
            name: "Space Start Agent",
            introduction: "Helpful intro",
            tags: [],
          } as any
        }
        reload={() => {}}
      />,
    );

    expect(dialogOptions[0]).toEqual({
      spaceId: "space-current",
      preferredServerOrigin: "http://localhost",
    });
  });

  it("keeps image agents without imageWorkflow on generic per-image pricing", async () => {
    const AgentBlock = await loadAgentBlock();
    const html = renderToStaticMarkup(
      <AgentBlock
        item={
          {
            id: "agent-image",
            dbKey: "agent-image",
            name: "Image Agent",
            introduction: "Makes images",
            provider: "google",
            model: "gemini-3.1-flash-image-preview",
            imageConfig: { enabled: true, imageSize: "2K" },
            tags: [],
          } as any
        }
        reload={() => {}}
      />,
    );

    // Should show the generic price label (t('price') → 'price' in test harness)
    expect(html).toMatch(/>price<|> price</);
    expect(html).toContain("/ perImage");
    // Should NOT show the generator-specific label
    expect(html).not.toContain("默认档参考价");
  });

  it("shows default-profile estimate for generator image agents", async () => {
    const AgentBlock = await loadAgentBlock();
    const html = renderToStaticMarkup(
      <AgentBlock
        item={
          {
            id: "agent-generator",
            dbKey: "agent-generator",
            name: "Generator Agent",
            introduction: "Generates images",
            provider: "google",
            model: "gemini-3.1-flash-image-preview",
            imageWorkflow: "generate",
            imageConfig: { enabled: true, imageSize: "2K" },
            tags: [],
          } as any
        }
        reload={() => {}}
      />,
    );

    expect(html).toContain("默认档参考价");
    expect(html).toContain("medium · 1024x1024");
  });
});
