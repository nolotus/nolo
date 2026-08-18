import { describe, expect, it, mock } from "bun:test";
import React from "react";
import { flushDomUpdates, renderInDom } from "../../../testing/domRender";

let moduleVersion = 0;

async function loadAppDeployCard() {
  const actualReactI18Next = await import("react-i18next");
  const actualReactRouterDom = await import("app/routing");
  mock.module("react-i18next", () => ({
    ...actualReactI18Next,
    useTranslation: () => ({
      t: (_key: string, fallback?: string) => fallback ?? "",
    }),
  }));

  mock.module("app/routing", () => ({
    ...actualReactRouterDom,
    useNavigate: () => () => {},
  }));

  mock.module("app/store", () => ({
    useAppDispatch: () => () => {},
    useAppSelector: (selector: (state: any) => any) =>
      selector({ settings: { sidebarWidth: 320 } }),
  }));

  mock.module("app/hooks/useIsMobile", () => ({
    useIsMobile: () => false,
  }));

  mock.module("render/layout/RightSidebarContext", () => ({
    default: React.createContext(null),
    useRightSidebar: () => ({
      open: () => {},
      close: () => {},
      isOpen: false,
      currentId: undefined,
    }),
  }));

  const mod = await import(`./AppDeployCard?test=${moduleVersion++}`);
  mock.restore();
  return mod.default;
}

describe("appDeploy preview behavior", () => {
  it("renders iframe preview by default for successful deploys", async () => {
    const AppDeployCard = await loadAppDeployCard();
    const view = await renderInDom(
      <AppDeployCard
        isError={false}
        rawData={{
          userFriendlyName: "hello-world",
          appUrl: "http://localhost/apps/app-1/",
          customUrl: "http://localhost/apps/app-1/",
          url: "http://localhost/apps/app-1/",
        }}
      />
    );

    try {
      expect(view.getByText("预览")).toBeTruthy();
      expect(view.getByText("打开")).toBeTruthy();
      expect(view.getByText("正在加载预览…")).toBeTruthy();
      expect(view.container.querySelector("iframe")?.getAttribute("src")).toBe(
        "http://localhost/apps/app-1/"
      );
    } finally {
      await view.cleanup();
    }
  });

  it("shows a slow-start hint when readiness probe says app is not ready yet", async () => {
    const AppDeployCard = await loadAppDeployCard();
    const view = await renderInDom(
      <AppDeployCard
        isError={false}
        rawData={{
          userFriendlyName: "hello-world",
          customUrl: "http://localhost/apps/app-1/",
          url: "http://localhost/apps/app-1/",
          previewCheck: {
            attempted: true,
            ready: false,
          },
        }}
      />
    );

    try {
      expect(view.getByText("站点已发布，但首次冷启动可能稍慢，正在等待预览可见…")).toBeTruthy();
    } finally {
      await view.cleanup();
    }
  });

  it("prefers same-origin platform preview urls when no custom domain exists", async () => {
    const AppDeployCard = await loadAppDeployCard();
    const view = await renderInDom(
      <AppDeployCard
        isError={false}
        rawData={{
          appId: "app-1",
          userFriendlyName: "hello-world",
          appUrl: "https://us.nolo.chat/apps/app-1/",
          url: "https://us.nolo.chat/apps/app-1/",
        }}
      />
    );

    try {
      expect(view.container.querySelector("iframe")?.getAttribute("src")).toBe(
        "http://localhost/apps/app-1/"
      );
    } finally {
      await view.cleanup();
    }
  });

  it("does not render iframe preview for failed deploys", async () => {
    const AppDeployCard = await loadAppDeployCard();
    const view = await renderInDom(
      <AppDeployCard
        isError
        rawData={{
          userFriendlyName: "hello-world",
          appUrl: "http://localhost/apps/app-1/",
          customUrl: "http://localhost/apps/app-1/",
          url: "http://localhost/apps/app-1/",
        }}
      />
    );

    try {
      expect(view.queryByText("预览")).toBeNull();
      expect(view.container.querySelector("iframe")).toBeNull();
    } finally {
      await view.cleanup();
    }
  });

  it("keeps hook order stable when a deploy card updates into an error state", async () => {
    const AppDeployCard = await loadAppDeployCard();
    const view = await renderInDom(
      <AppDeployCard
        isError={false}
        rawData={{
          userFriendlyName: "hello-world",
          appUrl: "http://localhost/apps/app-1/",
          customUrl: "http://localhost/apps/app-1/",
          url: "http://localhost/apps/app-1/",
        }}
      />
    );
    const loggedErrors: string[] = [];
    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      loggedErrors.push(args.map((arg) => String(arg)).join(" "));
    };

    try {
      await view.rerender(
        <AppDeployCard
          isError
          rawData={{
            userFriendlyName: "hello-world",
            appUrl: "http://localhost/apps/app-1/",
            customUrl: "http://localhost/apps/app-1/",
            url: "http://localhost/apps/app-1/",
          }}
        />
      );
      await flushDomUpdates(2);

      expect(
        loggedErrors.some((entry) =>
          entry.includes("Rendered fewer hooks than expected")
        )
      ).toBe(false);
    } finally {
      console.error = originalConsoleError;
      await view.cleanup();
    }
  });
});
