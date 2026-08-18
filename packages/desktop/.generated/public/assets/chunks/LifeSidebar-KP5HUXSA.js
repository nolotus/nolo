import {
  ADMIN_PAGE_PATHS,
  SYSTEM_ADMIN_USER_IDS,
  canAccessGrowthStatsPage,
  canAccessUsageManagementPage
} from "/public/assets/chunks/chunk-4BEOT5EM.js";
import "/public/assets/chunks/chunk-45KYWPDW.js";
import {
  NavListItem_default
} from "/public/assets/chunks/chunk-DGDV65E6.js";
import {
  useAuth
} from "/public/assets/chunks/chunk-WT5G4HGZ.js";
import "/public/assets/chunks/chunk-4C6PJRJA.js";
import "/public/assets/chunks/chunk-OOUNP25R.js";
import "/public/assets/chunks/chunk-BELEJNOF.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuActivity,
  LuChartBar,
  LuMail,
  LuShare2,
  LuTrash2,
  LuTrendingUp,
  LuUsers
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import "/public/assets/chunks/chunk-TBNFSVJC.js";
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
import "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/auth/navPermissions.tsx
var allowRule = (user, navItems) => {
  return user ? navItems.filter((item) => {
    if (!item.allow_users) {
      return true;
    }
    return item.allow_users.includes(user.userId);
  }) : navItems.filter((item) => !item.allow_users);
};

// packages/life/LifeSidebarContent.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var LifeSidebarContent = () => {
  const { t } = useTranslation();
  const auth = useAuth();
  const usageManagementAllowUsers = auth?.user && canAccessUsageManagementPage(auth.user) ? [auth.user.userId] : [];
  const growthStatsAllowUsers = auth?.user && canAccessGrowthStatsPage(auth.user) ? [auth.user.userId] : [];
  const links = [
    {
      path: "/life/usage",
      label: t("life.usage", "\u4F7F\u7528"),
      icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuTrendingUp, { size: 20, "aria-hidden": "true" })
    },
    {
      path: "/life/shares",
      label: t("space:myShares.title", "\u6211\u7684\u5206\u4EAB"),
      icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuShare2, { size: 20, "aria-hidden": "true" })
    },
    {
      path: "/life/trash",
      label: t("recycleBin.title", "\u56DE\u6536\u7AD9"),
      icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuTrash2, { size: 20, "aria-hidden": "true" })
    },
    {
      path: ADMIN_PAGE_PATHS.users,
      label: t("life.userAdmin", "\u7528\u6237\u7BA1\u7406"),
      icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuUsers, { size: 20, "aria-hidden": "true" }),
      allow_users: SYSTEM_ADMIN_USER_IDS,
      end: true
    },
    {
      path: ADMIN_PAGE_PATHS.growthStats,
      label: t("life.growthStats", "\u589E\u957F\u7EDF\u8BA1"),
      icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuTrendingUp, { size: 20, "aria-hidden": "true" }),
      allow_users: growthStatsAllowUsers,
      end: true
    },
    {
      path: ADMIN_PAGE_PATHS.usageManagement,
      label: t("life.usageManagement", "\u7528\u91CF\u7BA1\u7406"),
      icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuChartBar, { size: 20, "aria-hidden": "true" }),
      allow_users: usageManagementAllowUsers,
      end: true
    },
    {
      path: ADMIN_PAGE_PATHS.email,
      label: t("life.emailAdmin", "\u90AE\u4EF6\u7BA1\u7406"),
      icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuMail, { size: 20, "aria-hidden": "true" }),
      allow_users: SYSTEM_ADMIN_USER_IDS,
      end: true
    },
    {
      path: ADMIN_PAGE_PATHS.providerHealth,
      label: t("life.providerHealth", "\u6A21\u578B\u63D0\u4F9B\u5546"),
      icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuActivity, { size: 20, "aria-hidden": "true" }),
      allow_users: SYSTEM_ADMIN_USER_IDS,
      end: true
    }
  ];
  const allowedLinks = allowRule(auth?.user, links);
  const commonLinks = allowedLinks.filter((item) => !item.allow_users);
  const adminLinks = allowedLinks.filter((item) => item.allow_users);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "life-sidebar", children: [
    commonLinks.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", { className: "life-sidebar-section", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { className: "life-sidebar-list", children: commonLinks.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavListItem_default, { ...item }, item.path)) }) }),
    commonLinks.length > 0 && adminLinks.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "div",
      {
        style: {
          height: "1px",
          background: "var(--borderSubtle, #e1e4e8)",
          margin: "0 var(--space-3)",
          opacity: 0.3
        }
      }
    ),
    adminLinks.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "life-sidebar-section", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", { className: "life-sidebar-header", children: t("life.adminSection", "\u7BA1\u7406") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { className: "life-sidebar-list", children: adminLinks.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavListItem_default, { ...item }, item.path)) })
    ] })
  ] });
};
var LifeSidebarContent_default = LifeSidebarContent;

// packages/life/LifeSidebar.tsx
var import_jsx_runtime2 = __toESM(require_jsx_runtime(), 1);
var LifeSidebar = () => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "LifeSidebar", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "LifeSidebar__scroll", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LifeSidebarContent_default, {}) }) });
var LifeSidebar_default = LifeSidebar;
export {
  LifeSidebar_default as default
};
