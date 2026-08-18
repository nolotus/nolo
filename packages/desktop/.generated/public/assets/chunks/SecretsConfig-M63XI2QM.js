import {
  useToken
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import "/public/assets/chunks/chunk-OOUNP25R.js";
import {
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  selectRemoteServer,
  toast
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuEye,
  LuEyeOff,
  LuKey,
  LuPlus,
  LuRefreshCw,
  LuTrash2
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
import {
  asTrimmedLowercaseString
} from "/public/assets/chunks/chunk-VCXOIOLL.js";
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

// packages/app/settings/web/SecretsConfig.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var STORAGE_KEY = "nolo-local-secrets";
var WEREAD_SKILLS_URL = "https://weread.qq.com/r/weread-skills";
var WEREAD_SECRET_KEY = "WEREAD_API_KEY";
var PRESET_KEYS = [
  { key: "OPENAI_KEY", desc: "OpenAI API Key" },
  { key: "ANTHROPIC_API_KEY", desc: "Anthropic Claude API Key" },
  { key: "GOOGLE_API_KEY", desc: "Google / Gemini API Key" },
  { key: "GITHUB_TOKEN", desc: "GitHub Personal Access Token" },
  { key: WEREAD_SECRET_KEY, desc: "\u5FAE\u4FE1\u8BFB\u4E66 API Key" }
];
function loadLocalSecrets() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}
function getLocalSecret(key) {
  return loadLocalSecrets()[key] ?? null;
}
function SecretsConfig() {
  const { t } = useTranslation();
  const currentToken = useToken();
  const configuredServer = useAppSelector(selectRemoteServer);
  const currentServer = typeof window !== "undefined" && /^https?:\/\//.test(window.location.origin) ? window.location.origin.replace(/\/+$/, "") : configuredServer;
  const [secrets, setSecrets] = (0, import_react.useState)({});
  const [newKey, setNewKey] = (0, import_react.useState)("");
  const [newValue, setNewValue] = (0, import_react.useState)("");
  const [showValues, setShowValues] = (0, import_react.useState)({});
  const [loading, setLoading] = (0, import_react.useState)(false);
  const [setupSource, setSetupSource] = (0, import_react.useState)("");
  const authHeaders = (0, import_react.useCallback)(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${currentToken}`
  }), [currentToken]);
  const loadServerSecrets = (0, import_react.useCallback)(async () => {
    if (!currentToken || !currentServer) return;
    setLoading(true);
    try {
      const res = await fetch(`${currentServer}/api/user-secrets`, {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSecrets(data.secrets ?? {});
    } catch (e) {
      toast.error(t("settings.secrets.loadFailed", "\u52A0\u8F7D\u5BC6\u94A5\u5931\u8D25\uFF0C\u8BF7\u5237\u65B0\u91CD\u8BD5"));
    } finally {
      setLoading(false);
    }
  }, [currentToken, currentServer]);
  (0, import_react.useEffect)(() => {
    if (currentToken) {
      loadServerSecrets();
    } else {
      setSecrets(loadLocalSecrets());
    }
  }, [currentToken, loadServerSecrets]);
  (0, import_react.useEffect)(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const key = params.get("key")?.trim().toUpperCase();
    if (key && /^[A-Z0-9_]{1,64}$/.test(key)) {
      setNewKey(key);
    }
    setSetupSource(asTrimmedLowercaseString(params.get("source")));
  }, []);
  async function handleAdd() {
    if (!newKey || !newValue) return;
    const key = newKey.toUpperCase();
    if (!/^[A-Z0-9_]{1,64}$/.test(key)) {
      toast.error(t("settings.secrets.invalidKey", "Key \u53EA\u5141\u8BB8\u5927\u5199\u5B57\u6BCD\u3001\u6570\u5B57\u548C\u4E0B\u5212\u7EBF\uFF0C\u6700\u591A64\u4F4D"));
      return;
    }
    if (currentToken && currentServer) {
      try {
        const res = await fetch(`${currentServer}/api/user-secrets/set`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ key, value: newValue })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setSecrets((prev) => ({ ...prev, [key]: newValue }));
        setNewKey("");
        setNewValue("");
        toast.success(t("settings.secrets.saveSuccess", "\u5DF2\u4FDD\u5B58 {{key}}", { key }));
      } catch {
        toast.error(t("settings.secrets.saveFailed", "\u670D\u52A1\u5668\u4FDD\u5B58\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5"));
      }
    } else {
      const local = loadLocalSecrets();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...local, [key]: newValue }));
      setSecrets((prev) => ({ ...prev, [key]: newValue }));
      setNewKey("");
      setNewValue("");
      toast.success(t("settings.secrets.saveLocal", "\u5DF2\u4FDD\u5B58 {{key}}\uFF08\u4EC5\u672C\u8BBE\u5907\uFF09", { key }));
    }
  }
  async function handleDelete(key) {
    if (currentToken && currentServer) {
      try {
        const res = await fetch(`${currentServer}/api/user-secrets/delete`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ key })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        toast.success(t("settings.secrets.deleteSuccess", "\u5DF2\u5220\u9664 {{key}}", { key }));
      } catch {
        toast.error(t("settings.secrets.deleteFailed", "\u670D\u52A1\u5668\u5220\u9664\u5931\u8D25"));
        return;
      }
    } else {
      const local = { ...loadLocalSecrets() };
      delete local[key];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(local));
      toast.success(t("settings.secrets.deleteSuccess", "\u5DF2\u5220\u9664 {{key}}", { key }));
    }
    setSecrets((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }
  const keys = Object.keys(secrets);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "secrets-page", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { className: "secrets-page__header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", { className: "page-title", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuKey, { size: 18, "aria-hidden": "true" }),
        t("settings.secrets.title", "\u5BC6\u94A5\u7BA1\u7406")
      ] }),
      currentToken && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: "secret-btn",
          onClick: loadServerSecrets,
          disabled: loading,
          title: t("common.refresh", "\u5237\u65B0"),
          "aria-label": t("common.refresh", "\u5237\u65B0"),
          children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            LuRefreshCw,
            {
              size: 14,
              "aria-hidden": "true",
              style: loading ? { animation: "spin 1s linear infinite" } : {}
            }
          )
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "page-description", children: currentToken ? t(
      "settings.secrets.description_server",
      "\u5BC6\u94A5\u5728\u670D\u52A1\u5668\u7AEF AES-256-GCM \u52A0\u5BC6\u540E\u5B58\u50A8\uFF0C\u6570\u636E\u5E93\u6CC4\u9732\u4E5F\u65E0\u6CD5\u8FD8\u539F\u539F\u59CB\u503C\u3002\u767B\u5F55\u540E\u53EF\u8DE8\u8BBE\u5907\u5B89\u5168\u4F7F\u7528\u8FD9\u4E9B\u7B2C\u4E09\u65B9\u670D\u52A1\u51ED\u8BC1\u3002"
    ) : t(
      "settings.secrets.description_local",
      "\u767B\u5F55\u540E\u5BC6\u94A5\u5C06 AES-256-GCM \u52A0\u5BC6\u5B58\u50A8\u5728\u670D\u52A1\u5668\uFF0C\u53EF\u8DE8\u8BBE\u5907\u4F7F\u7528\uFF1B\u5F53\u524D\u672A\u767B\u5F55\uFF0C\u4EC5\u660E\u6587\u4FDD\u5B58\u5728\u672C\u8BBE\u5907\u6D4F\u89C8\u5668\u4E2D\u3002"
    ) }),
    (setupSource === "weread" || newKey === WEREAD_SECRET_KEY) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "secret-setup-card", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: t("settings.secrets.weread.title", "\u5FAE\u4FE1\u8BFB\u4E66 API Key") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("settings.secrets.weread.hint", "\u5148\u83B7\u53D6 Key\uFF0C\u518D\u7C98\u8D34\u5230\u4E0B\u65B9 value \u8F93\u5165\u6846\uFF1BKey \u540D\u5DF2\u9884\u586B\u4E3A {{key}}\u3002", { key: WEREAD_SECRET_KEY }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "a",
        {
          className: "secret-link-btn",
          href: WEREAD_SKILLS_URL,
          target: "_blank",
          rel: "noreferrer",
          children: t("settings.secrets.weread.getKey", "\u83B7\u53D6 Key")
        }
      )
    ] }),
    keys.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "empty-state", children: t("settings.secrets.empty", "\u8FD8\u6CA1\u6709\u4FDD\u5B58\u4EFB\u4F55\u5BC6\u94A5") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "secrets-list", children: keys.map((key) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "secret-row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "secret-key", children: key }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "secret-value", children: showValues[key] ? secrets[key] : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "secret-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: "secret-btn",
            onClick: () => setShowValues((v) => ({ ...v, [key]: !v[key] })),
            title: showValues[key] ? t("settings.secrets.hide", "\u9690\u85CF") : t("settings.secrets.show", "\u663E\u793A"),
            "aria-label": showValues[key] ? t("settings.secrets.hide", "\u9690\u85CF") : t("settings.secrets.show", "\u663E\u793A"),
            children: showValues[key] ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuEyeOff, { size: 14, "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuEye, { size: 14, "aria-hidden": "true" })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: "secret-btn danger",
            onClick: () => handleDelete(key),
            title: t("settings.secrets.delete", "\u5220\u9664"),
            "aria-label": t("settings.secrets.delete", "\u5220\u9664"),
            children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuTrash2, { size: 14, "aria-hidden": "true" })
          }
        )
      ] })
    ] }, key)) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "add-form", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          placeholder: t("settings.secrets.add.keyPlaceholder", "KEY_NAME"),
          value: newKey,
          onChange: (e) => setNewKey(e.target.value.toUpperCase()),
          onKeyDown: (e) => e.key === "Enter" && handleAdd()
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          type: "password",
          placeholder: t("settings.secrets.add.valuePlaceholder", "value..."),
          value: newValue,
          onChange: (e) => setNewValue(e.target.value),
          onKeyDown: (e) => e.key === "Enter" && handleAdd()
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { type: "button", className: "add-btn", onClick: handleAdd, disabled: !newKey || !newValue, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuPlus, { size: 14, "aria-hidden": "true" }),
        t("settings.secrets.add.button", "\u6DFB\u52A0")
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "preset-keys", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "preset-title", children: t("settings.secrets.presetTitle", "\u5E38\u7528 Key \u540D\u79F0\uFF08\u70B9\u51FB\u81EA\u52A8\u586B\u5165\uFF09\uFF1A") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "preset-list", children: PRESET_KEYS.map(({ key, desc }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: "preset-tag",
          title: desc,
          onClick: () => setNewKey(key),
          children: key
        },
        key
      )) })
    ] })
  ] });
}
export {
  SecretsConfig as default,
  getLocalSecret
};
