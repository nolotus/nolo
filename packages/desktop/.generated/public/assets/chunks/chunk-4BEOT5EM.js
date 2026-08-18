import {
  isSystemAdmin,
  nolotusId
} from "/public/assets/chunks/chunk-RWWUEPWY.js";

// packages/auth/adminPermissions.ts
var ADMIN_PERMISSION_DEFINITIONS = [
  {
    key: "usageManagement",
    label: "\u7528\u91CF\u7BA1\u7406",
    shortLabel: "\u7528\u91CF",
    description: "\u67E5\u770B\u7528\u91CF\u62A5\u8868\u3001\u6A21\u578B\u4E0E\u63D0\u4F9B\u5546\u7528\u91CF\u76F8\u5173\u6570\u636E"
  },
  {
    key: "growthStats",
    label: "\u589E\u957F\u7EDF\u8BA1",
    shortLabel: "\u589E\u957F",
    description: "\u67E5\u770B 7 \u5929/30 \u5929\u6D3B\u8DC3\u3001\u65B0\u589E\u7528\u6237\u4E0E\u589E\u957F\u8D8B\u52BF"
  }
];
var ADMIN_PERMISSION_KEYS = new Set(
  ADMIN_PERMISSION_DEFINITIONS.map((definition) => definition.key)
);
var hasUsageManagementPermission = (value) => {
  return hasAdminPermission(value, "usageManagement");
};
var hasGrowthStatsPermission = (value) => {
  return hasAdminPermission(value, "growthStats");
};
var hasAdminPermission = (value, permissionKey) => {
  if (!value || typeof value !== "object") return false;
  const permissions = value.adminPermissions;
  return permissions?.[permissionKey] === true;
};

// packages/app/admin/adminPages.ts
var SYSTEM_ADMIN_USER_IDS = [nolotusId];
var ADMIN_PAGE_PATHS = {
  users: "/life/users",
  /** Standalone path — not a query on /life/users. */
  growthStats: "/life/users/growth",
  usageManagement: "/life/users/usage",
  email: "/life/users/email",
  providerHealth: "/life/users/provider-health",
  legacyEmail: "/admin/email"
};
var canAccessSystemAdminPage = (userId) => isSystemAdmin(userId);
var canAccessUsageManagementPage = (user) => {
  if (isSystemAdmin(user?.userId)) return true;
  return hasUsageManagementPermission(user);
};
var canAccessGrowthStatsPage = (user) => {
  if (isSystemAdmin(user?.userId)) return true;
  return hasGrowthStatsPermission(user);
};

export {
  ADMIN_PERMISSION_DEFINITIONS,
  SYSTEM_ADMIN_USER_IDS,
  ADMIN_PAGE_PATHS,
  canAccessSystemAdminPage,
  canAccessUsageManagementPage,
  canAccessGrowthStatsPage
};
