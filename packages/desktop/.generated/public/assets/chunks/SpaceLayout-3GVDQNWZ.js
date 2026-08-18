import {
  TabsNav_default
} from "/public/assets/chunks/chunk-Q3A7KJ5P.js";
import {
  useTheme
} from "/public/assets/chunks/chunk-LVVUA2RZ.js";
import {
  useHasMounted
} from "/public/assets/chunks/chunk-OOUNP25R.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import {
  Outlet,
  useLocation,
  useNavigate,
  useParams
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  changeSpace,
  selectCurrentSpace,
  selectCurrentSpaceId,
  selectSidebarWidth,
  selectSpaceLoading
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuHouse,
  LuSettings,
  LuUsers
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  normalizeSpaceId
} from "/public/assets/chunks/chunk-TBNFSVJC.js";
import "/public/assets/chunks/chunk-SM3EH4JD.js";
import "/public/assets/chunks/chunk-JOOBQBMM.js";
import "/public/assets/chunks/chunk-7OO56Y7L.js";
import "/public/assets/chunks/chunk-NKT4VBPJ.js";
import "/public/assets/chunks/chunk-LPS7IE46.js";
import "/public/assets/chunks/chunk-RUG5F6GD.js";
import "/public/assets/chunks/chunk-XJRNNKKF.js";
import "/public/assets/chunks/chunk-IRTDRTXE.js";
import "/public/assets/chunks/chunk-XDKHKMJ3.js";
import "/public/assets/chunks/chunk-VCXOIOLL.js";
import "/public/assets/chunks/chunk-AHAP23JL.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import "/public/assets/chunks/chunk-3EHRYDZ6.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/create/space/components/SpaceLayout.tsx
var import_react = __toESM(require_react(), 1);

// packages/create/space/components/SpaceNavigation.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var SpaceNavigation = () => {
  const { spaceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const hasMounted = useHasMounted();
  const currentSpace = useAppSelector(selectCurrentSpace);
  const loading = useAppSelector(selectSpaceLoading);
  const currentPath = location.pathname;
  const showResolvedStats = hasMounted && !loading;
  const navItems = [
    {
      id: "home",
      path: `/space/${spaceId}`,
      label: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "nav-item-content", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuHouse, { size: 16, className: "nav-icon", "aria-hidden": "true" }),
        "\u9996\u9875"
      ] })
    },
    {
      id: "members",
      path: `/space/${spaceId}/members`,
      label: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "nav-item-content", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "nav-icon-wrap", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuUsers, { size: 16, className: "nav-icon", "aria-hidden": "true" }),
          showResolvedStats && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nav-badge nav-badge--corner", children: currentSpace?.members?.length || 0 })
        ] }),
        "\u6210\u5458"
      ] })
    },
    {
      id: "settings",
      path: `/space/${spaceId}/settings`,
      label: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "nav-item-content", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuSettings, { size: 16, className: "nav-icon", "aria-hidden": "true" }),
        "\u8BBE\u7F6E"
      ] })
    }
  ];
  const getActiveTab = () => {
    const currentPathWithoutBase = currentPath.replace(`/space/${spaceId}`, "");
    if (currentPathWithoutBase === "" || currentPathWithoutBase === "/") {
      return "home";
    }
    const pathParts = currentPathWithoutBase.split("/").filter(Boolean);
    return pathParts[0] || "home";
  };
  const activeTab = getActiveTab();
  const handleTabChange = (tabId) => {
    const tab = navItems.find((item) => item.id === tabId);
    if (tab) {
      navigate(tab.path);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "space-navigation", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "space-header", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "space-header__right", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    TabsNav_default,
    {
      tabs: navItems.map((item) => ({
        id: item.id,
        label: item.label,
        disabled: false
      })),
      activeTab,
      onChange: handleTabChange,
      className: "space-tabs-nav"
    }
  ) }) }) });
};
var SpaceNavigation_default = SpaceNavigation;

// packages/create/space/components/SpaceLayout.tsx
var import_jsx_runtime2 = __toESM(require_jsx_runtime(), 1);
var SpaceLayout = () => {
  const { spaceId, pageKey } = useParams();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const sidebarWidth = useAppSelector(selectSidebarWidth);
  const currentSpaceId = useAppSelector(selectCurrentSpaceId);
  const isContentRoute = typeof pageKey === "string" && pageKey.length > 0;
  const shellMaxWidth = sidebarWidth > 0 ? Math.max(1360, 1600 - Math.round(sidebarWidth * 0.6)) : 1600;
  (0, import_react.useEffect)(() => {
    if (!spaceId) return;
    const normalizedRouteSpaceId = normalizeSpaceId(spaceId);
    if (normalizedRouteSpaceId === currentSpaceId) return;
    void dispatch(changeSpace(normalizedRouteSpaceId));
  }, [currentSpaceId, dispatch, spaceId]);
  if (isContentRoute) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-content-route-shell", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_react.Suspense, { fallback: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "loading", children: "\u52A0\u8F7D\u4E2D..." }), children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Outlet, {}) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("style", { children: `
          .space-content-route-shell {
            width: 100%;
            min-width: 0;
            min-height: 0;
            height: 100%;
            display: flex;
            flex-direction: column;
          }

          .loading {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 400px;
            color: ${theme.textTertiary};
          }
        ` })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-layout", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(SpaceNavigation_default, {}),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "space-content", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_react.Suspense, { fallback: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "loading", children: "\u52A0\u8F7D\u4E2D..." }), children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Outlet, {}) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("style", { children: `
        .space-layout {
          --space-shell-max-width: ${shellMaxWidth}px;
          --space-shell-padding-x: 24px;
          width: 100%;
          max-width: var(--space-shell-max-width);
          margin: 0 auto;
          padding: 0 var(--space-shell-padding-x) 40px;
          box-sizing: border-box;
          display: grid;
          grid-template-columns: 1fr;
          gap: ${theme.space[5]};
        }

        .space-content {
          border-radius: var(--radius-md);
          min-height: 600px;
          min-width: 0;
        }

        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 400px;
          color: ${theme.textTertiary};
        }

        @media (max-width: 768px) {
          .space-layout {
            --space-shell-padding-x: ${theme.space[3]};
          }

          .space-content {
            min-height: 0;
          }
        }
      ` })
  ] });
};
var SpaceLayout_default = SpaceLayout;
export {
  SpaceLayout_default as default
};
