import {
  buildAuthLoginLocaleCandidates
} from "/public/assets/chunks/chunk-5WJ7RXPI.js";
import "/public/assets/chunks/chunk-HWC2ZOVH.js";
import "/public/assets/chunks/chunk-5IOWWQCJ.js";
import {
  t
} from "/public/assets/chunks/chunk-THM65O3R.js";
import {
  useForm
} from "/public/assets/chunks/chunk-Q66XOYF3.js";
import {
  Input,
  PasswordInput
} from "/public/assets/chunks/chunk-XXYYZRCQ.js";
import "/public/assets/chunks/chunk-IOQKDOEC.js";
import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import "/public/assets/chunks/chunk-DIU2H7DW.js";
import "/public/assets/chunks/chunk-ZTDLGZ3X.js";
import "/public/assets/chunks/chunk-VELLRNIX.js";
import "/public/assets/chunks/chunk-I2UX5KHN.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import {
  NavLink,
  useNavigate,
  useSearchParams
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  useSelector
} from "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  SERVERS,
  addHostToCurrentServer,
  selectCurrentServer,
  signIn
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuLock,
  LuUser
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import "/public/assets/chunks/chunk-TBNFSVJC.js";
import "/public/assets/chunks/chunk-SM3EH4JD.js";
import "/public/assets/chunks/chunk-JOOBQBMM.js";
import "/public/assets/chunks/chunk-7OO56Y7L.js";
import "/public/assets/chunks/chunk-NKT4VBPJ.js";
import {
  esm_default
} from "/public/assets/chunks/chunk-LPS7IE46.js";
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

// packages/auth/web/Login.tsx
var import_react = __toESM(require_react(), 1);

// packages/auth/web/loginPresentation.ts
var normalizeLoginError = (value, t2) => {
  const translate = (key, fallback) => fallback === void 0 ? t2(key) : t2(key, fallback);
  const message = typeof value === "string" ? value : value instanceof Error ? value.message : "";
  let parsedMessage = "";
  if (message.startsWith("{")) {
    try {
      const payload = JSON.parse(message);
      parsedMessage = typeof payload?.error?.message === "string" && payload.error.message || typeof payload?.message === "string" && payload.message || typeof payload?.error === "string" && payload.error || "";
    } catch {
      parsedMessage = "";
    }
  }
  const normalizedMessage = parsedMessage || message;
  if (normalizedMessage === "errors.dataNotFound") {
    return translate("errors.dataNotFound", "\u7528\u6237\u6570\u636E\u4E0D\u5B58\u5728");
  }
  if (normalizedMessage === "errors.wrongPassword") {
    return translate("errors.wrongPassword", "\u7528\u6237\u540D\u6216\u5BC6\u7801\u9519\u8BEF");
  }
  if (normalizedMessage.startsWith("errors.")) {
    return translate(normalizedMessage, "\u767B\u5F55\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u8D26\u53F7\u4FE1\u606F\u540E\u91CD\u8BD5\u3002");
  }
  return normalizedMessage || translate("networkError");
};
var formatLoginServerLabel = (server) => {
  try {
    const url = new URL(server);
    return url.host;
  } catch {
    return server.replace(/^https?:\/\//, "").replace(/\/+$/, "") || server;
  }
};
var shouldShowLoginTargetSwitcher = (runtimeOrigin) => {
  try {
    const { hostname } = new URL(runtimeOrigin);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "nolotus.local";
  } catch {
    return false;
  }
};

// packages/auth/web/Login.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const { t: t2, i18n } = useTranslation();
  const { isLoading } = useSelector((state) => state.auth);
  const currentServer = useAppSelector(selectCurrentServer);
  const [error, setError] = (0, import_react.useState)(null);
  const runtimeOrigin = typeof window !== "undefined" && typeof window.location?.origin === "string" ? window.location.origin : "";
  const loginServers = [
    ...runtimeOrigin ? [{ id: "local", label: "\u672C\u5730", value: runtimeOrigin }] : [],
    { id: "main", label: "nolo.chat", value: SERVERS.MAIN },
    { id: "us", label: "us.nolo.chat", value: SERVERS.US }
  ];
  const activeServer = currentServer || runtimeOrigin || SERVERS.MAIN;
  const showLoginTargetSwitcher = shouldShowLoginTargetSwitcher(runtimeOrigin);
  const returnTo = searchParams.get("returnTo") || "";
  const safeReturnTo = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: t(
      esm_default.object({
        username: esm_default.string().nonempty(t2("usernameRequired") || ""),
        password: esm_default.string().nonempty(t2("passwordRequired") || "")
      })
    )
  });
  const onSubmit = async (data) => {
    try {
      const localeCandidates = buildAuthLoginLocaleCandidates(navigator.language, [i18n.language]);
      const res = await dispatch(
        signIn({
          ...data,
          locale: localeCandidates[0] || navigator.language,
          localeCandidates
        })
      ).unwrap();
      if (res.token) navigate(safeReturnTo);
    } catch (err) {
      setError(
        normalizeLoginError(
          err,
          (key, fallback) => fallback === void 0 ? String(t2(key)) : String(t2(key, fallback))
        )
      );
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "login-container", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "auth-form-panel", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { onSubmit: handleSubmit(onSubmit), className: "login-form", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "login-title", children: t2("login") }),
    showLoginTargetSwitcher && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "auth-login-target", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "auth-login-target__header", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t2("authLoginTargetLabel", "\u5F53\u524D\u767B\u5F55\u73AF\u5883") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: formatLoginServerLabel(activeServer) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "div",
        {
          className: "auth-login-target__options",
          role: "group",
          "aria-label": t2("authLoginTargetLabel", "\u5F53\u524D\u767B\u5F55\u73AF\u5883"),
          children: loginServers.map((server) => {
            const isActive = activeServer.replace(/\/+$/, "") === server.value.replace(/\/+$/, "");
            return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                className: `auth-login-target__option${isActive ? " is-active" : ""}`,
                "aria-pressed": isActive,
                onClick: () => {
                  dispatch(addHostToCurrentServer(server.value));
                  setError(null);
                },
                children: server.label
              },
              server.id
            );
          })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "auth-login-target__hint", children: t2(
        "authLoginSwitchHint",
        "\u5982\u679C\u4F60\u662F\u5728\u522B\u7684\u670D\u52A1\u5668\u6216\u8BED\u8A00\u73AF\u5883\u6CE8\u518C\u7684\uFF0C\u8BF7\u5148\u5207\u6362\u540E\u518D\u767B\u5F55\u3002"
      ) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field-group", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        Input,
        {
          placeholder: t2("enterUsername"),
          ...register("username"),
          error: !!errors.username,
          icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuUser, { size: 20, "aria-hidden": "true" }),
          autoComplete: "username"
        }
      ),
      errors.username && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "error-message", children: errors.username.message })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field-group", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        PasswordInput,
        {
          placeholder: t2("enterPassword"),
          ...register("password"),
          error: !!errors.password,
          icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuLock, { size: 20, "aria-hidden": "true" }),
          autoComplete: "current-password"
        }
      ),
      errors.password && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "error-message", children: errors.password.message })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "forgot-wrapper", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavLink, { to: "/forgot-password", className: "forgot-link", children: t2("forgotPassword") }) }),
    error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "error-message", children: error }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "auth-form-footer", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        Button_default,
        {
          variant: "primary",
          size: "large",
          loading: isLoading,
          disabled: isLoading,
          style: { width: "100%" },
          type: "submit",
          children: isLoading ? t2("loading") : t2("login")
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "signup-section", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "link-text", children: t2("noAccount") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavLink, { to: "/signup" /* SIGNUP */, className: "signup-link", children: t2("signUpNow") })
      ] })
    ] })
  ] }) }) });
};
var Login_default = Login;
export {
  Login_default as default
};
