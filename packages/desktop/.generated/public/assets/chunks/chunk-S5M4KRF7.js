import {
  PageLoading_default
} from "/public/assets/chunks/chunk-YCIZFIEN.js";
import {
  SettingRoutePaths
} from "/public/assets/chunks/chunk-UTF6L3FT.js";
import {
  Navigate,
  useLocation,
  useParams
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/settings/routes.tsx
var import_react = __toESM(require_react());

// packages/app/settings/legacySettingsPath.ts
var LEGACY_SETTINGS_PREFIX = `/${SettingRoutePaths.SETTING_LEGACY}`;
var CANONICAL_SETTINGS_PREFIX = `/${SettingRoutePaths.SETTING}`;
function resolveLegacySettingsRedirectPathFromParts(pathname, search = "", hash = "") {
  if (pathname !== LEGACY_SETTINGS_PREFIX && !pathname.startsWith(`${LEGACY_SETTINGS_PREFIX}/`)) {
    return null;
  }
  const legacySuffix = pathname.slice(LEGACY_SETTINGS_PREFIX.length);
  const canonicalSuffix = legacySuffix === "/" ? "" : legacySuffix;
  return `${CANONICAL_SETTINGS_PREFIX}${canonicalSuffix}${search}${hash}`;
}

// packages/app/settings/routes.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime());
var SettingLayout = (0, import_react.lazy)(() => import("/public/assets/chunks/SettingLayout-MFBGVE37.js"));
var Appearance = (0, import_react.lazy)(() => import("/public/assets/chunks/Appearance-NQUPLBNC.js"));
var UserProfile = (0, import_react.lazy)(() => import("/public/assets/chunks/UserProfile-XHN6JG3B.js"));
var SecuritySettings = (0, import_react.lazy)(() => import("/public/assets/chunks/SecuritySettings-PBUHKQTP.js"));
var EditorConfig = (0, import_react.lazy)(() => import("/public/assets/chunks/EditorConfig-VE2IYIAW.js"));
var ChatConfig = (0, import_react.lazy)(() => import("/public/assets/chunks/ChatConfig-LI4NVSM2.js"));
var Productivity = (0, import_react.lazy)(() => import("/public/assets/chunks/Productivity-XV4VCNVI.js"));
var SecretsConfig = (0, import_react.lazy)(() => import("/public/assets/chunks/SecretsConfig-M63XI2QM.js"));
var MemoryConfig = (0, import_react.lazy)(() => import("/public/assets/chunks/MemoryConfig-GB4QZS4E.js"));
var DesktopRuntime = (0, import_react.lazy)(() => import("/public/assets/chunks/DesktopRuntime-MG4L6GPS.js"));
var DesktopUpdates = (0, import_react.lazy)(() => import("/public/assets/chunks/DesktopUpdates-KSKRCO5L.js"));
var DesktopMachines = (0, import_react.lazy)(() => import("/public/assets/chunks/DesktopMachines-PT6XD3HC.js"));
var DeveloperConfig = (0, import_react.lazy)(() => import("/public/assets/chunks/DeveloperConfig-OJGQ2XO4.js"));
var SystemBuiltinSkills = (0, import_react.lazy)(() => import("/public/assets/chunks/SystemBuiltinSkills-6XTG7LZF.js"));
var SettingsFallback = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageLoading_default, { fullHeight: true, message: "\u8BBE\u7F6E\u52A0\u8F7D\u4E2D..." });
var withSuspense = (element) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, { fallback: SettingsFallback, children: element });
var SettingsIndexRedirect = () => {
  const location = useLocation();
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    Navigate,
    {
      to: SettingRoutePaths.SETTING_APPEARANCE,
      replace: true,
      state: location.state
    }
  );
};
var LegacySettingsRedirect = () => {
  const location = useLocation();
  const params = useParams();
  const legacyPath = params["*"] ? `/${params["*"]}` : "";
  const redirectPath = resolveLegacySettingsRedirectPathFromParts(location.pathname, location.search, location.hash) ?? `/${SettingRoutePaths.SETTING}${legacyPath}${location.search}${location.hash}`;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    Navigate,
    {
      to: redirectPath,
      replace: true,
      state: location.state
    }
  );
};
var settingRoutes = {
  path: SettingRoutePaths.SETTING,
  element: withSuspense(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingLayout, {})),
  children: [
    {
      index: true,
      element: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingsIndexRedirect, {})
    },
    {
      path: SettingRoutePaths.SETTING_APPEARANCE,
      element: withSuspense(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Appearance, {}))
    },
    { path: SettingRoutePaths.SETTING_ACCOUNT, element: withSuspense(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserProfile, {})) },
    {
      path: SettingRoutePaths.SETTING_SECURITY,
      element: withSuspense(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SecuritySettings, {}))
    },
    { path: SettingRoutePaths.SETTING_EDITOR, element: withSuspense(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EditorConfig, {})) },
    { path: SettingRoutePaths.SETTING_CHAT, element: withSuspense(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatConfig, {})) },
    {
      path: SettingRoutePaths.SETTING_PRODUCTIVITY,
      element: withSuspense(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Productivity, {}))
    },
    {
      path: SettingRoutePaths.SETTING_DEVELOPER,
      element: withSuspense(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DeveloperConfig, {}))
    },
    {
      path: SettingRoutePaths.SETTING_SYSTEM_SKILLS,
      element: withSuspense(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SystemBuiltinSkills, {}))
    },
    { path: SettingRoutePaths.SETTING_SECRETS, element: withSuspense(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SecretsConfig, {})) },
    { path: SettingRoutePaths.SETTING_MEMORY, element: withSuspense(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MemoryConfig, {})) },
    {
      path: SettingRoutePaths.SETTING_RUNTIME,
      element: withSuspense(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DesktopRuntime, {}))
    },
    {
      path: SettingRoutePaths.SETTING_MACHINES,
      element: withSuspense(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DesktopMachines, {}))
    },
    {
      path: SettingRoutePaths.SETTING_UPDATES,
      element: withSuspense(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DesktopUpdates, {}))
    }
  ]
};
var legacySettingRoutes = {
  path: `${SettingRoutePaths.SETTING_LEGACY}/*`,
  element: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LegacySettingsRedirect, {})
};

// packages/ai/agent/publicAgentsSSRStore.ts
var import_react2 = __toESM(require_react());
var createInitialState = () => ({
  loading: false,
  error: null,
  data: []
});
var clientState = createInitialState();
var ssrOverrideGetter = null;
var listeners = /* @__PURE__ */ new Set();
var notify = () => {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
    }
  }
};
var bump = () => {
  notify();
};
function getState() {
  if (ssrOverrideGetter) {
    const override = ssrOverrideGetter();
    if (override) return override;
  }
  return clientState;
}
function setSSRPublicAgents(data) {
  clientState = {
    loading: false,
    error: null,
    data: Array.isArray(data) ? data : []
  };
  bump();
}
function getSSRPublicAgents() {
  return getState().data;
}
function subscribe(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function getSnapshot() {
  const { data } = getState();
  return JSON.stringify({ len: data.length, ids: data.map((a) => a?.id ?? null) });
}
function useSSRPublicAgents() {
  (0, import_react2.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
  return getSSRPublicAgents();
}

export {
  settingRoutes,
  legacySettingRoutes,
  setSSRPublicAgents,
  useSSRPublicAgents
};
