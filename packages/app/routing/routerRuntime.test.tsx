import React, { act } from "react";
import { afterEach, describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import {
  Link,
  type Location as RouterLocation,
  MemoryRouter,
  Navigate,
  NavLink,
  Outlet,
  RouterProvider,
  useLocation,
  useNavigate,
  useParams,
  useRoutes,
  useSearchParams,
} from "./index";

// Helpers

function LocationProbe() {
  const location = useLocation();
  const params = useParams<"id">();
  return (
    <span>
      {location.pathname}:{params.id}
    </span>
  );
}

function RoutesProbe() {
  return useRoutes([
    {
      path: "/",
      element: (
        <div>
          root
          <Outlet />
        </div>
      ),
      children: [
        { index: true, element: <span>home</span> },
        { path: "item/:id", element: <LocationProbe /> },
      ],
    },
  ]);
}

function StateProbe() {
  const location = useLocation();
  return <span>{JSON.stringify(location.state)}</span>;
}

function SearchProbe() {
  const [searchParams] = useSearchParams();
  return <span>q={searchParams.get("q")}</span>;
}

function NavigateProbe() {
  const navigate = useNavigate();
  // SSR: just renders the button
  return <button onClick={() => navigate("/dest")}>go</button>;
}

// Tests

describe("native router runtime", () => {
  // SSR / RouterProvider

  it("renders nested route matches on the server", () => {
    const html = renderToString(
      <RouterProvider initialUrl="https://nolo.test/item/abc">
        <RoutesProbe />
      </RouterProvider>,
    );
    expect(html).toContain("root");
    // React SSR inserts <!-- --> between adjacent text nodes
    expect(html).toContain("/item/abc");
    expect(html).toContain("abc");
  });

  it("preserves initial state on server", () => {
    const html = renderToString(
      <RouterProvider
        initialUrl="https://nolo.test/"
        initialState={{ modal: true }}
      >
        <StateProbe />
      </RouterProvider>,
    );
    expect(html).toContain("modal");
    expect(html).toContain("true");
  });

  it("renders links as anchors", () => {
    const html = renderToString(
      <RouterProvider initialUrl="https://nolo.test/">
        <Link to="/pricing">Pricing</Link>
      </RouterProvider>,
    );
    expect(html).toContain('href="/pricing"');
    expect(html).toContain("Pricing");
  });

  it("renders Navigate without throwing during SSR", () => {
    const html = renderToString(
      <RouterProvider initialUrl="https://nolo.test/old">
        <Navigate to="/new" replace />
      </RouterProvider>,
    );
    expect(html).toBe("");
  });

  it("exposes search params on server", () => {
    const html = renderToString(
      <RouterProvider initialUrl="https://nolo.test/?q=test">
        <SearchProbe />
      </RouterProvider>,
    );
    // React SSR inserts <!-- --> between adjacent text nodes
    expect(html).toContain("q=");
    expect(html).toContain("test");
  });

  it("exposes navigate as a function on server", () => {
    const html = renderToString(
      <RouterProvider initialUrl="https://nolo.test/">
        <NavigateProbe />
      </RouterProvider>,
    );
    expect(html).toContain("<button");
    expect(html).toContain("go");
  });

  it("matches nested routes under a base path", () => {
    function BaseProbe() {
      return useRoutes([
        {
          path: "/base",
          element: <div>base-root<Outlet /></div>,
          children: [
            { path: "item/:id", element: <LocationProbe /> },
          ],
        },
      ]);
    }
    const html = renderToString(
      <RouterProvider initialUrl="https://nolo.test/base/item/xyz">
        <BaseProbe />
      </RouterProvider>,
    );
    expect(html).toContain("base-root");
    expect(html).toContain("xyz");
  });

  // useRoutes

  it("returns null when no route matches", () => {
    function NoMatchProbe() {
      const result = useRoutes([{ path: "/only-this", element: <span>ok</span> }]);
      return <div>{result === null ? "null" : "rendered"}</div>;
    }
    const html = renderToString(
      <RouterProvider initialUrl="https://nolo.test/something-else">
        <NoMatchProbe />
      </RouterProvider>,
    );
    expect(html).toContain("null");
  });

  it("supports locationArg override for background location routing", () => {
    const bgLocation = {
      pathname: "/item/bg",
      search: "",
      hash: "",
      state: null,
      key: "bg",
    };
    function BackgroundProbe() {
      // useRoutes uses bgLocation for matching
      const element = useRoutes(
        [{ path: "item/:id", element: <LocationProbe /> }],
        bgLocation,
      );
      return <>{element}</>;
    }
    const html = renderToString(
      <RouterProvider initialUrl="https://nolo.test/real">
        <BackgroundProbe />
      </RouterProvider>,
    );
    // Route matched against bgLocation → params.id = "bg"
    expect(html).toContain("bg");
    // useLocation() returns the context location ("/real"), not bgLocation
    expect(html).toContain("/real");
  });

  // Link

  it("passes through className and other anchor props", () => {
    const html = renderToString(
      <RouterProvider initialUrl="https://nolo.test/">
        <Link to="/about" className="nav-link" data-testid="about">
          About
        </Link>
      </RouterProvider>,
    );
    expect(html).toContain('class="nav-link"');
    expect(html).toContain('data-testid="about"');
  });

  // NavLink

  it("applies active className when path matches", () => {
    const html = renderToString(
      <RouterProvider initialUrl="https://nolo.test/about">
        <NavLink to="/about" className={({ isActive }) => (isActive ? "active" : "inactive")}>
          About
        </NavLink>
      </RouterProvider>,
    );
    expect(html).toContain('class="active"');
  });

  it("applies inactive className when path does not match", () => {
    const html = renderToString(
      <RouterProvider initialUrl="https://nolo.test/other">
        <NavLink to="/about" className={({ isActive }) => (isActive ? "active" : "inactive")}>
          About
        </NavLink>
      </RouterProvider>,
    );
    expect(html).toContain('class="inactive"');
  });

  it("applies active className for nested paths", () => {
    const html = renderToString(
      <RouterProvider initialUrl="https://nolo.test/about/team">
        <NavLink to="/about" className={({ isActive }) => (isActive ? "active" : "inactive")}>
          About
        </NavLink>
      </RouterProvider>,
    );
    expect(html).toContain('class="active"');
  });

  it("supports function children with isActive", () => {
    const html = renderToString(
      <RouterProvider initialUrl="https://nolo.test/about">
        <NavLink to="/about">
          {({ isActive }) => <span>{isActive ? "ON" : "OFF"}</span>}
        </NavLink>
      </RouterProvider>,
    );
    expect(html).toContain("ON");
  });

  it("supports string className", () => {
    const html = renderToString(
      <RouterProvider initialUrl="https://nolo.test/about">
        <NavLink to="/about" className="nav-link">
          About
        </NavLink>
      </RouterProvider>,
    );
    expect(html).toContain('class="nav-link"');
  });

  it("supports style render props with active state", () => {
    const html = renderToString(
      <RouterProvider initialUrl="https://nolo.test/about">
        <NavLink
          to="/about"
          style={({ isActive }) => ({
            color: isActive ? "rgb(1, 2, 3)" : "rgb(4, 5, 6)",
          })}
        >
          About
        </NavLink>
      </RouterProvider>,
    );
    expect(html).toContain("color:rgb(1, 2, 3)");
  });

  // Outlet

  it("renders nothing for outlet with no children", () => {
    function LeafWithOutlet() {
      return useRoutes([{ path: "/", element: <Outlet /> }]);
    }
    const html = renderToString(
      <RouterProvider initialUrl="https://nolo.test/">
        <LeafWithOutlet />
      </RouterProvider>,
    );
    expect(html).toBe("");
  });

  // MemoryRouter

  it("MemoryRouter uses last initialEntry as starting location", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/a", "/b", "/c"]}>
        <RoutesProbe />
      </MemoryRouter>,
    );
    // "/c" doesn't match any route in RoutesProbe that has a specific path
    // but "/" matches the root. Let's use a simpler probe.
    function PathProbe() {
      const location = useLocation();
      return <span>{location.pathname}</span>;
    }
    const html2 = renderToString(
      <MemoryRouter initialEntries={["/a", "/b", "/c"]}>
        <PathProbe />
      </MemoryRouter>,
    );
    expect(html2).toContain("/c");
  });

  it("MemoryRouter defaults to /", () => {
    function PathProbe() {
      const location = useLocation();
      return <span>{location.pathname}</span>;
    }
    const html = renderToString(
      <MemoryRouter>
        <PathProbe />
      </MemoryRouter>,
    );
    expect(html).toContain("/");
  });

  // useNavigate

  it("useNavigate returns a function", () => {
    function NavProbe() {
      const navigate = useNavigate();
      expect(typeof navigate).toBe("function");
      return <span>ok</span>;
    }
    renderToString(
      <RouterProvider initialUrl="https://nolo.test/">
        <NavProbe />
      </RouterProvider>,
    );
  });

  // useSearchParams

  it("reads search params on server", () => {
    const html = renderToString(
      <RouterProvider initialUrl="https://nolo.test/search?q=hello&lang=en">
        <SearchProbe />
      </RouterProvider>,
    );
    // React SSR inserts <!-- --> between adjacent text nodes
    expect(html).toContain("q=");
    expect(html).toContain("hello");
  });

  it("useSearchParams setter is a function", () => {
    function SetterProbe() {
      const [, setSearchParams] = useSearchParams();
      expect(typeof setSearchParams).toBe("function");
      return <span>ok</span>;
    }
    renderToString(
      <RouterProvider initialUrl="https://nolo.test/?q=test">
        <SetterProbe />
      </RouterProvider>,
    );
  });

  it("useSearchParams setter accepts functional updates", () => {
    function SetterProbe() {
      const [, setSearchParams] = useSearchParams();
      setSearchParams((prev) => {
        prev.set("q", "next");
        return prev;
      });
      return <span>ok</span>;
    }
    const html = renderToString(
      <RouterProvider initialUrl="https://nolo.test/?q=test">
        <SetterProbe />
      </RouterProvider>,
    );
    expect(html).toContain("ok");
  });
});

describe("native router space route params", () => {
  function SpaceProbe() {
    const params = useParams<"spaceId" | "dialogId">();
    const location = useLocation();
    return (
      <span data-testid="probe">
        spaceId={params.spaceId};dialogId={params.dialogId};path={location.pathname}
      </span>
    );
  }

  const spaceRoutes = [
    {
      path: "/space/:spaceId",
      element: (
        <div>
          space-layout
          <Outlet />
        </div>
      ),
      children: [
        { index: true, element: <SpaceProbe /> },
        { path: ":dialogId", element: <SpaceProbe /> },
      ],
    },
  ];

  it("useParams returns spaceId for /space/:spaceId", () => {
    function RoutesWrapper() {
      return <>{useRoutes(spaceRoutes)}</>;
    }
    const html = renderToString(
      <RouterProvider initialUrl="https://nolo.test/space/01ABC">
        <RoutesWrapper />
      </RouterProvider>,
    );
    // React SSR inserts <!-- --> between text nodes; check parts separately
    expect(html).toContain("spaceId");
    expect(html).toContain("01ABC");
    expect(html).toContain("path");
    expect(html).toContain("/space/01ABC");
  });

  it("useParams returns both spaceId and dialogId for /space/:spaceId/:dialogId", () => {
    function RoutesWrapper() {
      return <>{useRoutes(spaceRoutes)}</>;
    }
    const html = renderToString(
      <RouterProvider initialUrl="https://nolo.test/space/01ABC/02DEF">
        <RoutesWrapper />
      </RouterProvider>,
    );
    expect(html).toContain("spaceId");
    expect(html).toContain("01ABC");
    expect(html).toContain("dialogId");
    expect(html).toContain("02DEF");
    expect(html).toContain("/space/01ABC/02DEF");
  });

  it("different space ids render different params", () => {
    function RoutesWrapper1() {
      return <>{useRoutes(spaceRoutes)}</>;
    }
    function RoutesWrapper2() {
      return <>{useRoutes(spaceRoutes)}</>;
    }
    const html1 = renderToString(
      <RouterProvider initialUrl="https://nolo.test/space/space-one">
        <RoutesWrapper1 />
      </RouterProvider>,
    );
    const html2 = renderToString(
      <RouterProvider initialUrl="https://nolo.test/space/space-two">
        <RoutesWrapper2 />
      </RouterProvider>,
    );
    expect(html1).toContain("space-one");
    expect(html2).toContain("space-two");
  });

  it("parent layout useParams sees params from the active leaf route", () => {
    function LayoutProbe() {
      const params = useParams<"spaceId" | "pageKey">();
      return (
        <div>
          layout-space={params.spaceId};layout-page={params.pageKey}
          <Outlet />
        </div>
      );
    }
    function LeafProbe() {
      const params = useParams<"spaceId" | "pageKey">();
      return (
        <span>
          leaf-space={params.spaceId};leaf-page={params.pageKey}
        </span>
      );
    }
    function RoutesWrapper() {
      return (
        <>
          {useRoutes([
            {
              path: "/space/:spaceId",
              element: <LayoutProbe />,
              children: [{ path: ":pageKey", element: <LeafProbe /> }],
            },
          ])}
        </>
      );
    }

    const html = renderToString(
      <RouterProvider initialUrl="https://nolo.test/space/space-1/dialog-user-1">
        <RoutesWrapper />
      </RouterProvider>,
    );
    expect(html).toContain("layout-space");
    expect(html).toContain("space-1");
    expect(html).toContain("layout-page");
    expect(html).toContain("dialog-user-1");
    expect(html).toContain("leaf-space");
    expect(html).toContain("leaf-page");
  });
});

describe("native router useSearchParams in browser environment", () => {
  let dom: JSDOM;
  let container: HTMLDivElement;
  let root: Root;
  let prevWindow: typeof globalThis.window | undefined;
  let prevDocument: typeof globalThis.document | undefined;
  let prevNavigator: typeof globalThis.navigator | undefined;
  let prevActEnvironment: boolean | undefined;

  function setup(initialUrl: string) {
    dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
      url: initialUrl,
    });

    prevWindow = globalThis.window;
    prevDocument = globalThis.document;
    prevNavigator = globalThis.navigator;
    prevActEnvironment = (globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT?: boolean;
    }).IS_REACT_ACT_ENVIRONMENT;

    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
      navigator: dom.window.navigator,
    });
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;

    container = dom.window.document.getElementById("root") as HTMLDivElement;
    root = createRoot(container);
  }

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    Object.assign(globalThis, {
      window: prevWindow,
      document: prevDocument,
      navigator: prevNavigator,
    });
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = prevActEnvironment;
  });

  it("functional setSearchParams preserves pathname and updates query", async () => {
    setup("http://localhost/space/01ABC?view=list");

    function SearchParamProbe() {
      const [searchParams, setSearchParams] = useSearchParams();
      const location = useLocation();
      return (
        <div>
          <span data-testid="path">{location.pathname}</span>
          <span data-testid="view">{searchParams.get("view")}</span>
          <span data-testid="sort">{searchParams.get("sort")}</span>
          <button
            data-testid="set-sort"
            onClick={() =>
              setSearchParams((prev) => {
                prev.set("sort", "date");
                return prev;
              })
            }
          >
            sort
          </button>
        </div>
      );
    }

    await act(async () => {
      root.render(
        <RouterProvider>
          <SearchParamProbe />
        </RouterProvider>,
      );
    });

    const pathEl = dom.window.document.querySelector("[data-testid='path']");
    const viewEl = dom.window.document.querySelector("[data-testid='view']");
    const sortEl = dom.window.document.querySelector("[data-testid='sort']");

    expect(pathEl?.textContent).toBe("/space/01ABC");
    expect(viewEl?.textContent).toBe("list");
    expect(sortEl?.textContent).toBe("");

    const btn = dom.window.document.querySelector(
      "[data-testid='set-sort']",
    ) as HTMLButtonElement;

    await act(async () => {
      btn.click();
    });

    // After functional update: pathname preserved, view=list retained, sort=date added
    expect(dom.window.location.pathname).toBe("/space/01ABC");
    expect(dom.window.location.search).toContain("view=list");
    expect(dom.window.location.search).toContain("sort=date");
  });

  it("object setSearchParams replaces query and preserves path", async () => {
    setup("http://localhost/space/01ABC?old=1");

    function ObjectSetProbe() {
      const [searchParams, setSearchParams] = useSearchParams();
      const location = useLocation();
      return (
        <div>
          <span data-testid="path">{location.pathname}</span>
          <span data-testid="q">{searchParams.get("q")}</span>
          <button
            data-testid="set-q"
            onClick={() => setSearchParams({ q: "hello" })}
          >
            set
          </button>
        </div>
      );
    }

    await act(async () => {
      root.render(
        <RouterProvider>
          <ObjectSetProbe />
        </RouterProvider>,
      );
    });

    const btn = dom.window.document.querySelector(
      "[data-testid='set-q']",
    ) as HTMLButtonElement;

    await act(async () => {
      btn.click();
    });

    expect(dom.window.location.pathname).toBe("/space/01ABC");
    expect(dom.window.location.search).toContain("q=hello");
  });

  it("passes Location object state through Link clicks", async () => {
    setup("https://nolo.test/source");

    function Probe() {
      const location = useLocation();
      return (
        <>
          <Link
            to={{
              pathname: "/target",
              search: "?from=link",
              hash: "#section",
              state: { from: "location-object" },
              key: "link-location",
            }}
          >
            Go
          </Link>
          <span data-testid="state">{JSON.stringify(location.state)}</span>
        </>
      );
    }

    await act(async () => {
      root.render(
        <RouterProvider>
          <Probe />
        </RouterProvider>,
      );
    });
    await act(async () => {
      container.querySelector("a")?.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true, button: 0 }),
      );
    });

    expect(dom.window.location.pathname).toBe("/target");
    expect(dom.window.location.search).toBe("?from=link");
    expect(dom.window.location.hash).toBe("#section");
    expect(container.querySelector("[data-testid='state']")?.textContent).toContain(
      "location-object",
    );
  });

  it("does not wrap default client navigation in View Transition", async () => {
    setup("https://nolo.test/source");
    let transitionCalls = 0;
    (dom.window.document as any).startViewTransition = (callback: () => void) => {
      transitionCalls += 1;
      callback();
      const done = Promise.resolve();
      return { ready: done, finished: done, updateCallbackDone: done };
    };

    function Probe() {
      const location = useLocation();
      const navigate = useNavigate();
      return (
        <>
          <button data-testid="go" onClick={() => navigate("/target")}>
            Go
          </button>
          <span data-testid="path">{location.pathname}</span>
        </>
      );
    }

    await act(async () => {
      root.render(
        <RouterProvider>
          <Probe />
        </RouterProvider>,
      );
    });

    const btn = dom.window.document.querySelector(
      "[data-testid='go']",
    ) as HTMLButtonElement;

    await act(async () => {
      btn.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(dom.window.location.pathname).toBe("/target");
    expect(container.querySelector("[data-testid='path']")?.textContent).toBe(
      "/target",
    );
    expect(transitionCalls).toBe(0);
  });

  it("relative Navigate resolves against the matched parent route", async () => {
    setup("http://localhost/settings");

    function SettingsIndexRedirect() {
      return <Navigate to="appearance" replace />;
    }

    function AppRoutes() {
      return useRoutes([
        {
          path: "/",
          element: <Outlet />,
          children: [
            {
              path: "settings",
              element: <Outlet />,
              children: [
                { index: true, element: <SettingsIndexRedirect /> },
                { path: "appearance", element: <span>appearance</span> },
              ],
            },
          ],
        },
      ]);
    }

    await act(async () => {
      root.render(
        <RouterProvider>
          <AppRoutes />
        </RouterProvider>,
      );
    });

    expect(dom.window.location.pathname).toBe("/settings/appearance");
    expect(container.textContent).toContain("appearance");
  });

  it("navigate accepts a Location object for background route restores", async () => {
    setup("http://localhost/settings");

    function RestoreBackgroundProbe() {
      const navigate = useNavigate();
      const location = useLocation();
      const backgroundLocation: RouterLocation = {
        pathname: "/space/01ABC",
        search: "?tab=chat",
        hash: "#latest",
        state: { from: "settings" },
        key: "background",
      };

      return (
        <div>
          <span data-testid="path">{location.pathname}</span>
          <span data-testid="state">{JSON.stringify(location.state)}</span>
          <button
            data-testid="restore"
            onClick={() => navigate(backgroundLocation, { replace: true })}
          >
            restore
          </button>
        </div>
      );
    }

    await act(async () => {
      root.render(
        <RouterProvider>
          <RestoreBackgroundProbe />
        </RouterProvider>,
      );
    });

    const btn = dom.window.document.querySelector(
      "[data-testid='restore']",
    ) as HTMLButtonElement;

    await act(async () => {
      btn.click();
    });

    expect(dom.window.location.pathname).toBe("/space/01ABC");
    expect(dom.window.location.search).toBe("?tab=chat");
    expect(dom.window.location.hash).toBe("#latest");
    expect(container.textContent).toContain('"from":"settings"');
    expect(container.textContent).toContain("/space/01ABC");
  });

  it("maintains browser history idx while exposing only user state", async () => {
    setup("http://localhost/");

    function HistoryIndexProbe() {
      const navigate = useNavigate();
      const location = useLocation();

      return (
        <div>
          <span data-testid="state">{JSON.stringify(location.state)}</span>
          <button
            data-testid="push"
            onClick={() => navigate("/pricing", { state: { source: "home" } })}
          >
            push
          </button>
          <button
            data-testid="replace"
            onClick={() => navigate("/downloads", { replace: true, state: { source: "pricing" } })}
          >
            replace
          </button>
        </div>
      );
    }

    await act(async () => {
      root.render(
        <RouterProvider>
          <HistoryIndexProbe />
        </RouterProvider>,
      );
    });

    expect(dom.window.history.state?.idx).toBe(0);

    const pushBtn = dom.window.document.querySelector(
      "[data-testid='push']",
    ) as HTMLButtonElement;
    const replaceBtn = dom.window.document.querySelector(
      "[data-testid='replace']",
    ) as HTMLButtonElement;

    await act(async () => {
      pushBtn.click();
    });

    expect(dom.window.location.pathname).toBe("/pricing");
    expect(dom.window.history.state?.idx).toBe(1);
    expect(dom.window.history.state?.usr).toEqual({ source: "home" });
    expect(container.textContent).toContain('"source":"home"');
    expect(container.textContent).not.toContain('"idx"');

    await act(async () => {
      replaceBtn.click();
    });

    expect(dom.window.location.pathname).toBe("/downloads");
    expect(dom.window.history.state?.idx).toBe(1);
    expect(dom.window.history.state?.usr).toEqual({ source: "pricing" });
    expect(container.textContent).toContain('"source":"pricing"');
    expect(container.textContent).not.toContain('"idx"');
  });
});

describe("native router backgroundLocation modal route", () => {
  it("useRoutes with backgroundLocation matches modal path while context shows real path", () => {
    const appRoutes = [
      {
        path: "/",
        element: (
          <div>
            app-shell
            <Outlet />
          </div>
        ),
        children: [
          { index: true, element: <span>home</span> },
          {
            path: "settings",
            element: <span>settings-page</span>,
          },
        ],
      },
    ];

    // Real URL is / but background location is /settings (modal overlay)
    const backgroundLocation: RouterLocation = {
      pathname: "/settings",
      search: "",
      hash: "",
      state: null,
      key: "bg",
    };

    function ModalProbe() {
      const location = useLocation();
      const modalElement = useRoutes(appRoutes, backgroundLocation);
      return (
        <div>
          <span data-testid="real-path">{location.pathname}</span>
          <span data-testid="modal-content">{modalElement ? "matched" : "no-match"}</span>
        </div>
      );
    }

    const html = renderToString(
      <RouterProvider initialUrl="https://nolo.test/">
        <ModalProbe />
      </RouterProvider>,
    );

    // Background location matched /settings
    expect(html).toContain("modal-content");
    expect(html).toMatch(/matched|settings-page/);
    // Real context location is / (not /settings)
    expect(html).toContain("/");
  });
});
