import {
  Tab,
  TabList,
  Tabs
} from "/public/assets/chunks/chunk-ZY3QGHFY.js";
import {
  useIsMobile
} from "/public/assets/chunks/chunk-ZQBH52MP.js";
import "/public/assets/chunks/chunk-LKJPGMXH.js";
import {
  BaseModal
} from "/public/assets/chunks/chunk-XTMQULJ5.js";
import "/public/assets/chunks/chunk-VELLRNIX.js";
import "/public/assets/chunks/chunk-I2UX5KHN.js";
import {
  SettingRoutePaths
} from "/public/assets/chunks/chunk-UTF6L3FT.js";
import {
  Outlet,
  useLocation,
  useNavigate
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  isDesktopApp
} from "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuBrain,
  LuBug,
  LuCode,
  LuDownload,
  LuGauge,
  LuKey,
  LuLaptop,
  LuMessageSquare,
  LuPalette,
  LuShield,
  LuSparkles,
  LuUser,
  LuX
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import "/public/assets/chunks/chunk-AHAP23JL.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/settings/web/SettingLayout.tsx
var import_react = __toESM(require_react());

// packages/app/settings/navItems.ts
var buildSettingNavItems = (t) => {
  const items = [
    {
      path: SettingRoutePaths.SETTING_APPEARANCE,
      label: String(t("settings.nav.appearance", "\u5916\u89C2")),
      Icon: LuPalette
    },
    {
      path: SettingRoutePaths.SETTING_ACCOUNT,
      label: String(t("settings.nav.account", "\u8D26\u6237")),
      Icon: LuUser
    },
    {
      path: SettingRoutePaths.SETTING_SECURITY,
      label: String(t("settings.nav.security", "\u5B89\u5168")),
      Icon: LuShield
    },
    {
      path: SettingRoutePaths.SETTING_EDITOR,
      label: String(t("settings.nav.editor", "\u7F16\u8F91\u5668")),
      Icon: LuCode
    },
    {
      path: SettingRoutePaths.SETTING_CHAT,
      label: String(t("settings.nav.chat", "\u5BF9\u8BDD")),
      Icon: LuMessageSquare
    },
    {
      path: SettingRoutePaths.SETTING_PRODUCTIVITY,
      label: String(t("settings.nav.productivity", "\u6548\u7387")),
      Icon: LuGauge
    },
    {
      path: SettingRoutePaths.SETTING_SECRETS,
      label: String(t("settings.nav.secrets", "\u5BC6\u94A5")),
      Icon: LuKey
    },
    {
      path: SettingRoutePaths.SETTING_MEMORY,
      label: String(t("settings.nav.memory", "\u4E2A\u6027\u5316\u8BBE\u7F6E")),
      Icon: LuBrain
    },
    {
      path: SettingRoutePaths.SETTING_DEVELOPER,
      label: String(t("settings.nav.developer", "\u5F00\u53D1\u8005")),
      Icon: LuBug
    },
    {
      path: SettingRoutePaths.SETTING_SYSTEM_SKILLS,
      label: String(t("settings.nav.systemSkills", "Agent \u80FD\u529B")),
      Icon: LuSparkles
    },
    {
      path: SettingRoutePaths.SETTING_MACHINES,
      label: String(t("settings.nav.machines", "\u7535\u8111")),
      Icon: LuLaptop
    }
  ];
  if (isDesktopApp) {
    items.push({
      path: SettingRoutePaths.SETTING_RUNTIME,
      label: String(t("settings.nav.runtime", "Runtime")),
      Icon: LuLaptop
    });
    items.push({
      path: SettingRoutePaths.SETTING_UPDATES,
      label: String(t("settings.nav.updates", "\u66F4\u65B0")),
      Icon: LuDownload
    });
  }
  return items;
};

// packages/app/settings/web/useSettingsStylesheet.ts
function useSettingsStylesheet() {
}

// packages/app/settings/web/SettingLayout.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime());
var SettingLayout = () => {
  useSettingsStylesheet();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state;
  const isMobile = useIsMobile(768);
  const navItems = (0, import_react.useMemo)(
    () => buildSettingNavItems(t),
    [t]
  );
  const activeKey = (0, import_react.useMemo)(() => {
    const match = navItems.find(
      (item) => location.pathname === item.path || location.pathname.endsWith(`/${item.path}`)
    );
    return match?.path ?? null;
  }, [navItems, location.pathname]);
  const handleTabChange = (0, import_react.useCallback)(
    (key) => {
      navigate(String(key), { state: location.state, replace: true });
    },
    [navigate, location.state]
  );
  const handleClose = (0, import_react.useCallback)(() => {
    const background = state?.backgroundLocation;
    if (background) {
      navigate(background, { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  }, [state, navigate]);
  const settingsContent = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "SettingsModal__container", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { className: "SettingsModal__header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "SettingsModal__title", children: t("settings.title", "\u8BBE\u7F6E") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "SettingsModal__subtitle", children: t("settings.subtitle", "\u504F\u597D\u4E0E\u8D26\u6237") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: "SettingsModal__closeBtn",
          onClick: handleClose,
          "aria-label": t("common.close", "\u5173\u95ED"),
          children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuX, { size: 16, "aria-hidden": "true" })
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "SettingsLayout", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("aside", { className: "SettingsLayout__sidebar", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        Tabs,
        {
          className: "react-aria-Tabs SettingsLayout__tabs",
          orientation: isMobile ? "horizontal" : "vertical",
          selectedKey: activeKey ?? void 0,
          onSelectionChange: handleTabChange,
          children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            TabList,
            {
              "aria-label": t("settings.title", "\u8BBE\u7F6E"),
              className: "react-aria-TabList SettingsLayout__nav",
              children: navItems.map(({ path, label, Icon }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                Tab,
                {
                  id: path,
                  className: "react-aria-Tab nav-list-item",
                  children: [
                    Icon && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nav-list-icon", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { size: 16, "aria-hidden": "true" }) }),
                    label
                  ]
                },
                path
              ))
            }
          )
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", { className: "SettingsLayout__content", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        import_react.Suspense,
        {
          fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "div",
            {
              style: {
                padding: 24,
                textAlign: "center",
                color: "var(--textSecondary)"
              },
              children: t("common.loading", "\u52A0\u8F7D\u4E2D...")
            }
          ),
          children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {})
        }
      ) })
    ] })
  ] });
  if (!state?.backgroundLocation) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "SettingsPage", children: settingsContent });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    BaseModal,
    {
      isOpen: true,
      onClose: handleClose,
      className: (
        // 桌面端窗口再窄也保持浮动弹窗，不切换成全屏移动态
        isDesktopApp ? "SettingsModal SettingsModal--floating" : "SettingsModal"
      ),
      children: settingsContent
    }
  );
};
var SettingLayout_default = SettingLayout;
export {
  SettingLayout_default as default
};
