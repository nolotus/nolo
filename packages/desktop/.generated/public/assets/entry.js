import {
  legacySettingRoutes,
  setSSRPublicAgents,
  settingRoutes
} from "/public/assets/chunks/chunk-S5M4KRF7.js";
import {
  setSSRCommunityShares
} from "/public/assets/chunks/chunk-MFOH33JJ.js";
import "/public/assets/chunks/chunk-BZBR6J57.js";
import "/public/assets/chunks/chunk-YCIZFIEN.js";
import {
  getDb
} from "/public/assets/chunks/chunk-IHMA4QTO.js";
import "/public/assets/chunks/chunk-2IJLPAOU.js";
import {
  startDesktopLocalConnectorFromSession
} from "/public/assets/chunks/chunk-3Q6WLZLQ.js";
import "/public/assets/chunks/chunk-UTF6L3FT.js";
import "/public/assets/chunks/chunk-7MYCSSXH.js";
import {
  useAuth
} from "/public/assets/chunks/chunk-WT5G4HGZ.js";
import {
  useToken
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import "/public/assets/chunks/chunk-OOUNP25R.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import {
  RouterProvider,
  useLocation,
  useRoutes
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  createAppStore,
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  Provider_default
} from "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  require_client
} from "/public/assets/chunks/chunk-4N3VLX7A.js";
import {
  FONT_PRESET_STORAGE_KEY,
  MyToastRegion,
  SYSTEM_DARK_MEDIA_QUERY,
  addHostToCurrentServer,
  fetchSpace,
  fetchSpaceSidebarState,
  fetchUserSpaceMemberships,
  getSettings,
  initFavorites,
  initializeAuth,
  isSpaceMembershipRemoteUnavailableError,
  parseToken,
  readStoredFontPreset,
  readStoredThemeDensity,
  readStoredThemeName,
  registerDatabaseActionToast,
  resolveEffectiveSpaceActorId,
  resolveThemeModePreload,
  selectCurrentServer,
  selectCurrentSpaceId,
  selectDensity,
  selectFontPreset,
  selectIsDark,
  selectTheme,
  selectThemeMode,
  selectThemeName,
  setSettings,
  toast,
  useFavoritesInitialized
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  client_default
} from "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import {
  getIsDesktopApp,
  isDesktopApp,
  isProduction
} from "/public/assets/chunks/chunk-CILBJ2I2.js";
import "/public/assets/chunks/chunk-GQPLRP65.js";
import "/public/assets/chunks/chunk-UWXJIOEO.js";
import "/public/assets/chunks/chunk-TBNFSVJC.js";
import {
  asNonEmptyStringArray
} from "/public/assets/chunks/chunk-SM3EH4JD.js";
import {
  compactWhitespace
} from "/public/assets/chunks/chunk-JOOBQBMM.js";
import "/public/assets/chunks/chunk-7OO56Y7L.js";
import "/public/assets/chunks/chunk-NKT4VBPJ.js";
import "/public/assets/chunks/chunk-LPS7IE46.js";
import "/public/assets/chunks/chunk-RUG5F6GD.js";
import {
  normalizeServerOrigin
} from "/public/assets/chunks/chunk-XJRNNKKF.js";
import {
  isRecord
} from "/public/assets/chunks/chunk-IRTDRTXE.js";
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

// packages/web/entry.tsx
var import_react5 = __toESM(require_react(), 1);
var import_client2 = __toESM(require_client(), 1);

// packages/auth/types.ts
var safelyParseJSON = (jsonString) => {
  try {
    const parsed = JSON.parse(jsonString);
    return typeof parsed === "string" ? [parsed] : parsed;
  } catch {
    return [jsonString];
  }
};

// packages/auth/tokenCookie.ts
var WEB_AUTH_TOKEN_COOKIE = "nolo_auth_token";

// packages/auth/web/tokenManager.ts
var PERSISTENT_AUTH_TOKEN_COOKIE_MAX_AGE_SECONDS = 10 * 365 * 24 * 3600;
function writeAuthTokenCookie(token) {
  if (typeof document === "undefined") return;
  if (!token) {
    document.cookie = `${WEB_AUTH_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }
  document.cookie = `${WEB_AUTH_TOKEN_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${PERSISTENT_AUTH_TOKEN_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}
function syncWebAuthTokenCookie(tokens) {
  const firstToken = typeof tokens[0] === "string" && tokens[0] ? tokens[0] : null;
  writeAuthTokenCookie(firstToken);
}
function tokenUserId(token) {
  const parsed = parseToken(token);
  return typeof parsed?.userId === "string" ? parsed.userId : null;
}
function isDesktopWebView() {
  return typeof window !== "undefined" && window.__NOLO_DESKTOP__ === true;
}
async function readDesktopSessionTokens() {
  if (!isDesktopWebView() || typeof fetch !== "function") return [];
  try {
    const response = await fetch("/api/desktop/auth/session", {
      method: "GET",
      cache: "no-store"
    });
    if (!response.ok) return [];
    const data = await response.json().catch(() => ({}));
    return asNonEmptyStringArray(data?.tokens);
  } catch {
    return [];
  }
}
var webTokenManager = {
  async getTokens() {
    const stored = localStorage.getItem("tokens");
    if (!stored) return [];
    return safelyParseJSON(stored);
  },
  async storeToken(newToken) {
    const tokens = await this.getTokens();
    const newUserId = tokenUserId(newToken);
    const filtered = tokens.filter((token) => {
      if (token === newToken) return false;
      return !newUserId || tokenUserId(token) !== newUserId;
    });
    filtered.unshift(newToken);
    localStorage.setItem("tokens", JSON.stringify(filtered));
    syncWebAuthTokenCookie(filtered);
  },
  async removeToken(tokenToRemove) {
    const tokens = await this.getTokens();
    const filtered = tokens.filter((t) => t !== tokenToRemove);
    localStorage.setItem("tokens", JSON.stringify(filtered));
    syncWebAuthTokenCookie(filtered);
  },
  async initTokens() {
    let tokens = await this.getTokens();
    if (!tokens.length) {
      const desktopTokens = await readDesktopSessionTokens();
      if (desktopTokens.length) {
        localStorage.setItem("tokens", JSON.stringify(desktopTokens));
        tokens = desktopTokens;
      }
    }
    syncWebAuthTokenCookie(tokens);
    return tokens;
  }
};

// packages/auth/web/bootstrapAuthState.ts
var isUser = (value) => typeof value === "object" && value !== null && typeof value.userId === "string";
var getBootstrappedAuthState = (storedTokens) => {
  if (!storedTokens) return null;
  const tokens = safelyParseJSON(storedTokens).filter(
    (token) => typeof token === "string" && token.length > 0
  );
  if (!tokens.length) return null;
  const users = [];
  const seenUserIds = /* @__PURE__ */ new Set();
  let currentUser = null;
  let currentToken = null;
  for (const token of tokens) {
    const parsedUser = parseToken(token);
    if (!isUser(parsedUser)) continue;
    if (seenUserIds.has(parsedUser.userId)) continue;
    seenUserIds.add(parsedUser.userId);
    users.push(parsedUser);
    if (!currentUser) {
      currentUser = parsedUser;
      currentToken = token;
    }
  }
  if (!currentUser || !currentToken) return null;
  return {
    currentUser,
    users,
    isLoggedIn: true,
    currentToken,
    isLoading: false
  };
};
var readBootstrappedAuthState = (storage) => getBootstrappedAuthState(storage.getItem("tokens"));

// packages/app/web/App.tsx
var import_react4 = __toESM(require_react());

// packages/app/theme/useSystemTheme.ts
var import_react = __toESM(require_react());
var useSystemTheme = () => {
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector(selectThemeMode);
  (0, import_react.useEffect)(() => {
    if (themeMode !== "system") return;
    const mediaQuery = window.matchMedia(SYSTEM_DARK_MEDIA_QUERY);
    dispatch(setSettings({ isDark: mediaQuery.matches }));
    const handleChange = (e) => {
      dispatch(setSettings({ isDark: e.matches }));
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [themeMode, dispatch]);
};

// packages/app/theme/GlobalThemeController.tsx
var import_react2 = __toESM(require_react());
var STYLE_TAG_ID = "global-theme-variables";
var useIsomorphicLayoutEffect = typeof window !== "undefined" ? import_react2.useLayoutEffect : import_react2.useEffect;
var generateCssVariables = (obj, prefix = "") => Object.entries(obj).flatMap(([key, value]) => {
  const name = prefix ? `${prefix}-${key}` : key;
  if (isRecord(value))
    return generateCssVariables(value, name);
  return value != null ? [`--${name}:${value};`] : [];
});
var generateCssString = (theme) => `:root { ${generateCssVariables(theme).join(" ")} }`;
var GlobalThemeController = () => {
  const theme = useAppSelector(selectTheme);
  const isDark = useAppSelector(selectIsDark);
  const themeMode = useAppSelector(selectThemeMode);
  const density = useAppSelector(selectDensity);
  const themeName = useAppSelector(selectThemeName);
  const fontPreset = useAppSelector(selectFontPreset);
  const cssString = (0, import_react2.useMemo)(() => generateCssString(theme), [theme]);
  useIsomorphicLayoutEffect(() => {
    const existingTag = document.getElementById(STYLE_TAG_ID);
    const styleTag = existingTag instanceof HTMLStyleElement ? existingTag : document.createElement("style");
    if (styleTag.id !== STYLE_TAG_ID) {
      styleTag.id = STYLE_TAG_ID;
    }
    if (styleTag.parentNode !== document.head) {
      document.head.appendChild(styleTag);
    }
    styleTag.textContent = cssString;
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    document.documentElement.setAttribute("data-density", density);
    try {
      localStorage.setItem("nolo-theme-mode", themeMode);
      localStorage.setItem("nolo-theme-name", String(themeName));
      localStorage.setItem("nolo-density", density);
      localStorage.setItem(FONT_PRESET_STORAGE_KEY, fontPreset);
    } catch {
    }
  }, [cssString, isDark, themeMode, density, themeName, fontPreset]);
  return null;
};
var GlobalThemeController_default = GlobalThemeController;

// packages/app/theme/GlobalBaseStyles.tsx
var GlobalBaseStyles = () => null;
var GlobalBaseStyles_default = GlobalBaseStyles;

// packages/app/hooks/useDesktopLocalConnectorAutostart.ts
var import_react3 = __toESM(require_react());
function useDesktopLocalConnectorAutostart(options = {}) {
  const onResult = options.onResult;
  const currentToken = useToken();
  const currentServer = useAppSelector(selectCurrentServer);
  const serverBase = normalizeServerOrigin(currentServer) || (typeof window !== "undefined" ? window.location.origin : "");
  (0, import_react3.useEffect)(() => {
    if (!getIsDesktopApp() || !currentToken || !serverBase) return;
    let cancelled = false;
    void startDesktopLocalConnectorFromSession({
      serverUrl: serverBase,
      authToken: currentToken
    }).then((result) => {
      if (!cancelled) onResult?.(result);
    });
    return () => {
      cancelled = true;
    };
  }, [currentToken, onResult, serverBase]);
}

// packages/app/web/spaceInitGuard.ts
var decideSpaceInitialization = (currentInitializedUserId, userId) => {
  const effectiveActorId = resolveEffectiveSpaceActorId(userId);
  if (currentInitializedUserId === effectiveActorId) {
    return {
      shouldInitialize: false,
      nextInitializedUserId: currentInitializedUserId
    };
  }
  return {
    shouldInitialize: true,
    nextInitializedUserId: effectiveActorId
  };
};
var resolveSpaceBootActorId = (accountUserId) => resolveEffectiveSpaceActorId(accountUserId);

// packages/app/web/App.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime());
var dateUrl = "date.nolo.chat";
var crmUrl = "crm.nolo.chat";
var RECENT_SHARE_FOREGROUND_SYNC_SKIP_MS = 4e3;
function App({ hostname: hostname2, lng = "en", initialRoutes }) {
  const dispatch = useAppDispatch();
  const auth = useAuth();
  const initializedRef = (0, import_react4.useRef)(false);
  const spaceInitUserRef = (0, import_react4.useRef)(null);
  const readyForegroundSyncUserRef = (0, import_react4.useRef)(null);
  const lastForegroundSyncAt = (0, import_react4.useRef)(0);
  useSystemTheme();
  useDesktopLocalConnectorAutostart();
  const location = useLocation();
  const state = location.state;
  const favoritesInitialized = useFavoritesInitialized();
  const currentSpaceId = useAppSelector(selectCurrentSpaceId);
  const foregroundSyncRef = (0, import_react4.useRef)({ inFlight: false, lastStartedAt: 0 });
  const recentShareCreatedAtRef = (0, import_react4.useRef)(0);
  const runtimeOrigin = typeof window !== "undefined" && typeof window.location?.origin === "string" ? window.location.origin : hostname2;
  const mainElement = useRoutes(
    initialRoutes,
    state?.backgroundLocation || location
  );
  const modalRoutes = (0, import_react4.useMemo)(
    () => [settingRoutes, legacySettingRoutes, { path: "*", element: null }],
    []
  );
  const modalElement = useRoutes(modalRoutes, location);
  (0, import_react4.useEffect)(() => {
    if (lng) client_default.changeLanguage(lng);
    if (hostname2 === dateUrl || hostname2 === crmUrl) return;
    if (!initializedRef.current) {
      initializedRef.current = true;
      (async () => {
        try {
          if (!isDesktopApp) {
            dispatch(addHostToCurrentServer(runtimeOrigin));
          }
          await dispatch(initializeAuth()).unwrap();
        } catch (e) {
          console.error("\u7CFB\u7EDF\u521D\u59CB\u5316\u5931\u8D25:", e);
        }
      })();
    }
    const accountUserId = auth.user?.userId;
    const { shouldInitialize, nextInitializedUserId } = decideSpaceInitialization(spaceInitUserRef.current, accountUserId);
    const spaceActorId = nextInitializedUserId;
    spaceInitUserRef.current = spaceActorId;
    if (!shouldInitialize || !spaceActorId) return;
    (async () => {
      let __initPerf = null;
      if (typeof window !== "undefined" && localStorage.getItem("debugPerf") === "1") {
        const w = window;
        if (!w.__appInitPerf) {
          const marks = {};
          w.__appInitPerf = {
            start(l) {
              marks[l] = performance.now();
            },
            end(l) {
              const t = marks[l];
              if (t !== void 0) {
                console.debug(`[APP-INIT-PERF] ${l}: ${(performance.now() - t).toFixed(1)}ms`);
                delete marks[l];
              }
            }
          };
        }
        __initPerf = w.__appInitPerf;
      }
      __initPerf?.start("space_initialization");
      try {
        const [settingsResult, membershipResult] = await Promise.allSettled([
          dispatch(getSettings()).unwrap(),
          dispatch(fetchUserSpaceMemberships(spaceActorId)).unwrap()
        ]);
        if (settingsResult.status === "rejected") {
          throw settingsResult.reason;
        }
        if (membershipResult.status === "rejected") {
          if (!isSpaceMembershipRemoteUnavailableError(membershipResult.reason)) {
            throw membershipResult.reason;
          }
          console.warn(
            `[App] membership remote unavailable for ${spaceActorId}; continuing offline from local cache`
          );
        }
        __initPerf?.end("settings+memberships");
        if (spaceInitUserRef.current === spaceActorId) {
          readyForegroundSyncUserRef.current = spaceActorId;
        }
      } catch (e) {
        if (spaceInitUserRef.current === spaceActorId) {
          readyForegroundSyncUserRef.current = null;
          spaceInitUserRef.current = null;
        }
        console.error(`\u7528\u6237\u6570\u636E\u521D\u59CB\u5316\u5931\u8D25 for ${spaceActorId}:`, e);
      }
      __initPerf?.end("space_initialization");
    })();
  }, [dispatch, hostname2, lng, auth.user?.userId, runtimeOrigin]);
  (0, import_react4.useEffect)(() => {
    const userId = auth.user?.userId;
    if (!userId || favoritesInitialized) return;
    let __favPerf = null;
    if (typeof window !== "undefined") {
      __favPerf = window.__appInitPerf ?? null;
      if (__favPerf) __favPerf.start("favorites_initialization");
    }
    dispatch(initFavorites()).then(() => {
      __favPerf?.end("favorites_initialization");
    });
  }, [dispatch, auth.user?.userId, favoritesInitialized]);
  (0, import_react4.useEffect)(() => {
    if (hostname2 === dateUrl || hostname2 === crmUrl) return;
    const spaceActorId = resolveSpaceBootActorId(auth.user?.userId);
    if (readyForegroundSyncUserRef.current !== spaceActorId) return;
    const lastCompletedSyncAt = lastForegroundSyncAt;
    const refreshForegroundData = async (options) => {
      const syncState = foregroundSyncRef.current;
      const now = Date.now();
      if (options?.skipRecentShare && now - recentShareCreatedAtRef.current < RECENT_SHARE_FOREGROUND_SYNC_SKIP_MS) {
        return;
      }
      if (syncState.inFlight || now - syncState.lastStartedAt < 1e3) return;
      if (now - lastCompletedSyncAt.current < 3e4) return;
      syncState.inFlight = true;
      syncState.lastStartedAt = now;
      let __fgPerf = null;
      if (typeof window !== "undefined") {
        __fgPerf = window.__appInitPerf ?? null;
        if (__fgPerf) __fgPerf.start("foreground_sync");
      }
      try {
        const [settingsResult, membershipResult] = await Promise.allSettled([
          dispatch(getSettings()).unwrap(),
          dispatch(fetchUserSpaceMemberships(spaceActorId)).unwrap()
        ]);
        if (settingsResult.status === "rejected") {
          throw settingsResult.reason;
        }
        const membershipOffline = membershipResult.status === "rejected" && isSpaceMembershipRemoteUnavailableError(membershipResult.reason);
        if (membershipResult.status === "rejected" && !membershipOffline) {
          throw membershipResult.reason;
        }
        if (membershipOffline) {
          console.warn(
            `[App] foreground membership remote unavailable for ${spaceActorId}; continuing offline`
          );
        }
        __fgPerf?.end("fg_sync:settings+memberships");
        if (!currentSpaceId) {
          if (!membershipOffline) {
            lastCompletedSyncAt.current = Date.now();
          }
          return;
        }
        await Promise.allSettled([
          dispatch(
            fetchSpace({ spaceId: currentSpaceId, fresh: true })
          ).unwrap(),
          dispatch(fetchSpaceSidebarState(currentSpaceId)).unwrap()
        ]);
        __fgPerf?.end("fg_sync:refetch_space+sidebar");
        if (!membershipOffline) {
          lastCompletedSyncAt.current = Date.now();
        }
      } catch (e) {
        console.warn("[App] \u524D\u53F0\u6062\u590D\u540C\u6B65\u5931\u8D25:", e);
      } finally {
        syncState.inFlight = false;
        __fgPerf?.end("foreground_sync");
      }
    };
    const handleFocus = () => {
      void refreshForegroundData({ skipRecentShare: true });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshForegroundData({ skipRecentShare: true });
      }
    };
    const handleShareCreated = () => {
      recentShareCreatedAtRef.current = Date.now();
    };
    window.addEventListener("focus", handleFocus);
    window.addEventListener("nolo:share-created", handleShareCreated);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("nolo:share-created", handleShareCreated);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [dispatch, hostname2, auth.user?.userId, currentSpaceId]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GlobalThemeController_default, {}),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GlobalBaseStyles_default, {}),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MyToastRegion, {}),
    mainElement,
    state?.backgroundLocation && modalElement
  ] });
}

// packages/app/web/siteRoutes.tsx
var hostToSite = {
  "nolotus.local": "crm",
  "date.nolo.chat": "date",
  "crm.nolo.chat": "crm"
};
var detectSite = (hostname2) => hostToSite[hostname2] ?? "default";
async function loadRoutes(site, user) {
  if (site === "crm") {
    const { crmRoutes } = await import("/public/assets/chunks/crmRoutes-EIOOPVCG.js");
    return crmRoutes;
  }
  if (site === "date") {
    const { dateRoutes } = await import("/public/assets/chunks/dateRoutes-URGFLFWH.js");
    return dateRoutes;
  }
  const appRoutes = await import("/public/assets/chunks/routes-6QPMDYMM.js");
  return appRoutes.routes();
}

// packages/app/i18n/clientResources.ts
var supportedLanguages = /* @__PURE__ */ new Set([
  "en" /* EN */,
  "zh-CN" /* ZH_CN */,
  "zh-Hant" /* ZH_HANT */,
  "ja" /* JA */
]);
var loadedLanguages = /* @__PURE__ */ new Set();
var normalizeClientLanguage = (rawLanguage) => {
  const language = rawLanguage || "zh-CN" /* ZH_CN */;
  if (supportedLanguages.has(language)) return language;
  const lower = language.toLowerCase();
  if (lower.startsWith("zh-tw") || lower.startsWith("zh-hk") || lower.startsWith("zh-mo")) {
    return "zh-Hant" /* ZH_HANT */;
  }
  if (lower.startsWith("zh")) return "zh-CN" /* ZH_CN */;
  if (lower.startsWith("ja")) return "ja" /* JA */;
  return "en" /* EN */;
};
var fetchLanguageResources = async (language) => {
  const version = typeof window !== "undefined" ? window.__NOLO_ASSETS__?.timestamp : "";
  const versionQuery = version ? `?v=${encodeURIComponent(version)}` : "";
  const response = await fetch(`/public/locales/${encodeURIComponent(language)}.json${versionQuery}`, {
    credentials: "same-origin"
  });
  if (!response.ok) {
    throw new Error(`Failed to load ${language} locale: ${response.status}`);
  }
  return response.json();
};
var loadClientLanguage = async (i18n, rawLanguage) => {
  let language = normalizeClientLanguage(rawLanguage);
  if (!loadedLanguages.has(language)) {
    const resources = await fetchLanguageResources(language).catch(async (error) => {
      if (language === "zh-CN" /* ZH_CN */) throw error;
      console.warn("[i18n] Falling back to zh-CN locale", error);
      language = "zh-CN" /* ZH_CN */;
      return fetchLanguageResources("zh-CN" /* ZH_CN */);
    });
    for (const [namespace, bundle] of Object.entries(resources)) {
      i18n.addResourceBundle(language, namespace, bundle, true, true);
    }
    loadedLanguages.add(language);
  }
  if (i18n.language !== language) {
    await i18n.changeLanguage(language);
  }
  return language;
};

// packages/web/chunkLoadRecovery.ts
var CHUNK_LOAD_RELOAD_STORAGE_PREFIX = "nolo:chunk-load-reload:";
var CHUNK_LOAD_CACHE_BUST_PARAM = "noloAssetCb";
var recoveredChunkSignatures = /* @__PURE__ */ new Set();
var CHUNK_LOAD_ERROR_PATTERNS = [
  /failed to fetch dynamically imported module/i,
  /importing a module script failed/i,
  /loading chunk [\w-]+ failed/i,
  /chunkloaderror/i
];
var readErrorMessage = (error) => {
  if (typeof error === "string") return error;
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (typeof error === "object" && error !== null) {
    const maybeError = error;
    if (typeof maybeError.message === "string") return maybeError.message;
    if (typeof maybeError.reason === "string") return maybeError.reason;
    if (maybeError.reason instanceof Error) {
      return `${maybeError.reason.name}: ${maybeError.reason.message}`;
    }
  }
  return "";
};
var createChunkErrorSignature = (error) => compactWhitespace(readErrorMessage(error)).slice(0, 300);
var isChunkLoadError = (error) => {
  const message = readErrorMessage(error);
  return CHUNK_LOAD_ERROR_PATTERNS.some((pattern) => pattern.test(message));
};
var buildChunkRecoveryHref = (location, nowMs = Date.now()) => {
  const params = new URLSearchParams(
    location.search.startsWith("?") ? location.search.slice(1) : location.search
  );
  params.set(CHUNK_LOAD_CACHE_BUST_PARAM, String(nowMs));
  const query = params.toString();
  return `${location.pathname}${query ? `?${query}` : ""}${location.hash || ""}`;
};
var maybeRecoverFromChunkLoadError = (error, env = {
  location: typeof window !== "undefined" ? window.location : void 0,
  sessionStorage: typeof window !== "undefined" ? window.sessionStorage : void 0
}) => {
  if (!isChunkLoadError(error)) return false;
  const signature = createChunkErrorSignature(error);
  if (!signature || !env.location) return false;
  const storageKey = `${CHUNK_LOAD_RELOAD_STORAGE_PREFIX}${signature}`;
  try {
    if (env.sessionStorage?.getItem(storageKey)) return false;
    env.sessionStorage?.setItem(storageKey, String(Date.now()));
  } catch {
    if (recoveredChunkSignatures.has(signature)) return false;
    recoveredChunkSignatures.add(signature);
  }
  try {
    const href = buildChunkRecoveryHref(env.location);
    if (typeof env.location.assign === "function") {
      env.location.assign(href);
    } else if (typeof env.location.reload === "function") {
      env.location.reload();
    } else {
      return false;
    }
  } catch {
    try {
      env.location.reload?.();
    } catch {
      return false;
    }
  }
  return true;
};
var installChunkLoadRecovery = (win = window) => {
  const recover = (error) => maybeRecoverFromChunkLoadError(error, {
    location: win.location,
    sessionStorage: win.sessionStorage
  });
  const onError = (event) => {
    const error = event.error ?? event.message;
    if (recover(error)) {
      event.preventDefault();
    }
  };
  const onUnhandledRejection = (event) => {
    if (recover(event.reason)) {
      event.preventDefault();
    }
  };
  win.addEventListener("error", onError);
  win.addEventListener("unhandledrejection", onUnhandledRejection);
  return () => {
    win.removeEventListener("error", onError);
    win.removeEventListener("unhandledrejection", onUnhandledRejection);
  };
};

// packages/web/entry.tsx
var import_jsx_runtime2 = __toESM(require_jsx_runtime(), 1);
registerDatabaseActionToast({
  success: (message) => toast.success(message),
  error: (message) => toast.error(message)
});
installChunkLoadRecovery();
var serverPreloadedState = window.__PRELOADED_STATE__ ?? {};
var shareBoot = serverPreloadedState?.share?.communityShares;
if (shareBoot && Array.isArray(shareBoot.data)) {
  setSSRCommunityShares({
    data: shareBoot.data,
    nextCursor: shareBoot.nextCursor
  });
}
var pubAgentsBoot = serverPreloadedState?.agent?.pubAgents;
if (pubAgentsBoot && Array.isArray(pubAgentsBoot.data)) {
  setSSRPublicAgents(pubAgentsBoot.data);
}
var {
  share: _omitShare,
  agent: _omitAgent,
  ...serverPreloadedWithoutShare
} = serverPreloadedState;
function consumeDevLoginParams() {
  if (isProduction) return {};
  if (!["127.0.0.1", "localhost", "nolotus.local"].includes(window.location.hostname)) {
    return {};
  }
  const params = new URLSearchParams(window.location.search);
  const devAuthToken = params.get("devAuthToken")?.trim();
  const devCurrentServer = params.get("devCurrentServer")?.trim();
  let changed = false;
  if (devAuthToken) {
    try {
      const existing = JSON.parse(window.localStorage.getItem("tokens") || "[]");
      const tokens = Array.isArray(existing) ? existing.filter((token) => typeof token === "string" && token !== devAuthToken) : [];
      tokens.unshift(devAuthToken);
      window.localStorage.setItem("tokens", JSON.stringify(tokens));
      syncWebAuthTokenCookie(tokens);
      params.delete("devAuthToken");
      changed = true;
    } catch {
    }
  }
  let normalizedDevCurrentServer;
  if (devCurrentServer) {
    try {
      normalizedDevCurrentServer = new URL(devCurrentServer).origin;
      params.delete("devCurrentServer");
      changed = true;
    } catch {
    }
  }
  if (!normalizedDevCurrentServer) {
    normalizedDevCurrentServer = window.location.origin;
  }
  if (changed) {
    const nextSearch = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`
    );
  }
  return { currentServer: normalizedDevCurrentServer };
}
var devLoginSettings = consumeDevLoginParams();
var bootstrappedAuthState = readBootstrappedAuthState(window.localStorage);
syncWebAuthTokenCookie(
  bootstrappedAuthState?.currentToken ? [bootstrappedAuthState.currentToken] : []
);
var themeModePreload = resolveThemeModePreload({
  storage: window.localStorage,
  systemPrefersDark: window.matchMedia(SYSTEM_DARK_MEDIA_QUERY).matches
});
var storedThemeName = readStoredThemeName(window.localStorage);
var storedThemeDensity = readStoredThemeDensity(window.localStorage);
var storedFontPreset = readStoredFontPreset(window.localStorage);
try {
  const rawStoredThemeName = window.localStorage.getItem("nolo-theme-name");
  const themeExplicit = window.localStorage.getItem("nolo-theme-name-explicit") === "1";
  if (!storedThemeName && rawStoredThemeName === "neutral" && !themeExplicit) {
    window.localStorage.removeItem("nolo-theme-name");
  }
} catch {
}
var preloadedState = bootstrappedAuthState ? {
  ...serverPreloadedWithoutShare,
  auth: {
    ...serverPreloadedWithoutShare.auth,
    ...bootstrappedAuthState
  },
  settings: {
    ...serverPreloadedWithoutShare.settings,
    ...themeModePreload,
    ...devLoginSettings,
    ...storedThemeName ? { themeName: storedThemeName } : {},
    ...storedThemeDensity ? { density: storedThemeDensity } : {},
    ...storedFontPreset ? { fontPreset: storedFontPreset } : {}
  }
} : {
  ...serverPreloadedWithoutShare,
  settings: {
    ...serverPreloadedWithoutShare.settings,
    ...themeModePreload,
    ...devLoginSettings,
    ...storedThemeName ? { themeName: storedThemeName } : {},
    ...storedThemeDensity ? { density: storedThemeDensity } : {},
    ...storedFontPreset ? { fontPreset: storedFontPreset } : {}
  }
};
var hostname = window.location.hostname;
var requestedLng = window.__SSR_LANG__ || window.navigator.language;
var desktopSearchParams = new URLSearchParams(window.location.search);
var isDesktopShell = window.__NOLO_DESKTOP__ === true || desktopSearchParams.get("noloDesktop") === "1";
var serializeDesktopDiagnosticValue = (value) => {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack
    };
  }
  if (typeof value === "object" && value !== null) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return String(value);
    }
  }
  return value;
};
if (isDesktopShell) {
  document.documentElement.dataset.noloDesktop = "1";
  window.__NOLO_DESKTOP__ = true;
  const sendToHost = window.__electrobunSendToHost;
  const sendDesktopDiagnostic = (event, payload = {}) => {
    if (typeof sendToHost !== "function") {
      return;
    }
    try {
      sendToHost({
        type: "nolo-desktop-diagnostic",
        event,
        payload: serializeDesktopDiagnosticValue(payload)
      });
    } catch {
    }
  };
  let lastInputDiagnosticAt = 0;
  let lastDesktopInputBreadcrumb = null;
  const readInputValueLength = (target) => {
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
      return target.value.length;
    }
    return void 0;
  };
  const createInputBreadcrumb = (event) => {
    const target = event.target instanceof Element ? event.target : document.activeElement;
    const inputEvent = typeof InputEvent !== "undefined" && event instanceof InputEvent ? event : null;
    return {
      eventType: event.type,
      inputType: inputEvent?.inputType,
      isComposing: inputEvent?.isComposing,
      inputValueLength: readInputValueLength(event.target),
      activeElementTag: target?.tagName?.toLowerCase() ?? null,
      activeElementRole: target?.getAttribute?.("role") ?? null,
      path: window.location.pathname,
      hash: window.location.hash,
      timestamp: Date.now()
    };
  };
  const sendInputDiagnostic = (event, force = false) => {
    lastDesktopInputBreadcrumb = createInputBreadcrumb(event);
    const now = Date.now();
    if (!force && now - lastInputDiagnosticAt < 500) {
      return;
    }
    lastInputDiagnosticAt = now;
    sendDesktopDiagnostic("renderer-input", lastDesktopInputBreadcrumb);
  };
  const installDesktopInputDiagnostics = () => {
    document.addEventListener("beforeinput", (event) => sendInputDiagnostic(event), true);
    document.addEventListener("input", (event) => sendInputDiagnostic(event), true);
    document.addEventListener("compositionstart", (event) => sendInputDiagnostic(event, true), true);
    document.addEventListener("compositionend", (event) => sendInputDiagnostic(event, true), true);
  };
  window.addEventListener("error", (event) => {
    sendDesktopDiagnostic("renderer-error", {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: serializeDesktopDiagnosticValue(event.error),
      lastInputBreadcrumb: lastDesktopInputBreadcrumb
    });
  });
  window.addEventListener("unhandledrejection", (event) => {
    sendDesktopDiagnostic("renderer-unhandledrejection", {
      reason: serializeDesktopDiagnosticValue(event.reason),
      lastInputBreadcrumb: lastDesktopInputBreadcrumb
    });
  });
  installDesktopInputDiagnostics();
  if (typeof sendToHost === "function") {
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      debug: console.debug
    };
    let pending = [];
    let flushScheduled = false;
    const MAX_ARG_CHARS = 2e3;
    const serializeArg = (arg) => {
      if (arg instanceof Error) {
        return { message: arg.message, stack: arg.stack, name: arg.name };
      }
      if (typeof arg === "object" && arg !== null) {
        try {
          const json = JSON.stringify(arg);
          if (json.length > MAX_ARG_CHARS) {
            return json.slice(0, MAX_ARG_CHARS) + "\u2026[truncated]";
          }
          return JSON.parse(json);
        } catch {
          return String(arg).slice(0, MAX_ARG_CHARS);
        }
      }
      if (typeof arg === "string" && arg.length > MAX_ARG_CHARS) {
        return arg.slice(0, MAX_ARG_CHARS) + "\u2026[truncated]";
      }
      return arg;
    };
    const flush = () => {
      flushScheduled = false;
      if (pending.length === 0) return;
      const batch = pending;
      pending = [];
      try {
        sendToHost({
          type: "nolo-desktop-console-batch",
          messages: batch
        });
      } catch {
      }
    };
    const scheduleFlush = () => {
      if (flushScheduled) return;
      flushScheduled = true;
      setTimeout(flush, 0);
    };
    const wrapConsole = (level) => {
      return (...args) => {
        originalConsole[level].apply(console, args);
        try {
          pending.push({ level, args: args.map(serializeArg) });
          scheduleFlush();
        } catch {
        }
      };
    };
    console.log = wrapConsole("log");
    console.warn = wrapConsole("warn");
    console.error = wrapConsole("error");
    console.debug = wrapConsole("debug");
  }
  let titlebarMode = desktopSearchParams.get("noloDesktopTitlebar");
  if (!titlebarMode) {
    try {
      titlebarMode = window.sessionStorage.getItem("noloDesktopTitlebar");
    } catch {
    }
  }
  if (titlebarMode) {
    document.documentElement.dataset.noloDesktopTitlebar = titlebarMode;
    desktopSearchParams.delete("noloDesktopTitlebar");
    try {
      window.sessionStorage.setItem("noloDesktopTitlebar", titlebarMode);
    } catch {
    }
  }
  desktopSearchParams.delete("noloDesktop");
  const nextSearch = desktopSearchParams.toString();
  const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
  window.history.replaceState(window.history.state, "", nextUrl);
}
var browserStore = createAppStore({
  dbInstance: getDb(),
  tokenManager: webTokenManager,
  preloadedState
});
delete window.__PRELOADED_STATE__;
var domNode = document.getElementById("root");
(async () => {
  const lng = await loadClientLanguage(client_default, requestedLng);
  const siteId = window.__SITE_ID__ || detectSite(hostname);
  const initialRoutes = await loadRoutes(siteId, void 0);
  const AppRoot = () => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_react5.default.StrictMode, { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Provider_default, { store: browserStore, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(RouterProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(App, { hostname, lng, initialRoutes }) }) }) });
  if (domNode.hasChildNodes()) {
    (0, import_client2.hydrateRoot)(domNode, /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(AppRoot, {}));
  } else {
    (0, import_client2.createRoot)(domNode).render(/* @__PURE__ */ (0, import_jsx_runtime2.jsx)(AppRoot, {}));
  }
})();
