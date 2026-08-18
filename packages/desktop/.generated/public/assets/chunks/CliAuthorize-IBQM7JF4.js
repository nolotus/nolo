import "/public/assets/chunks/chunk-HWC2ZOVH.js";
import "/public/assets/chunks/chunk-5IOWWQCJ.js";
import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import {
  NavLink,
  useLocation
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  selectCurrentServer,
  selectCurrentToken,
  selectCurrentUser
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import "/public/assets/chunks/chunk-GQPLRP65.js";
import "/public/assets/chunks/chunk-UWXJIOEO.js";
import "/public/assets/chunks/chunk-TBNFSVJC.js";
import "/public/assets/chunks/chunk-SM3EH4JD.js";
import "/public/assets/chunks/chunk-JOOBQBMM.js";
import "/public/assets/chunks/chunk-7OO56Y7L.js";
import "/public/assets/chunks/chunk-NKT4VBPJ.js";
import "/public/assets/chunks/chunk-LPS7IE46.js";
import "/public/assets/chunks/chunk-RUG5F6GD.js";
import {
  normalizeServerOrigin
} from "/public/assets/chunks/chunk-XJRNNKKF.js";
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

// packages/auth/web/CliAuthorize.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var CliAuthorize = () => {
  const location = useLocation();
  const currentToken = useAppSelector(selectCurrentToken);
  const currentUser = useAppSelector(selectCurrentUser);
  const currentServer = useAppSelector(selectCurrentServer);
  const [status, setStatus] = (0, import_react.useState)("idle");
  const [error, setError] = (0, import_react.useState)(null);
  const userCode = (0, import_react.useMemo)(() => {
    const params = new URLSearchParams(location.search);
    return (params.get("code") || "").trim().toUpperCase();
  }, [location.search]);
  const serverBase = (0, import_react.useMemo)(() => {
    const configured = normalizeServerOrigin(currentServer);
    if (configured) return configured;
    return typeof window !== "undefined" ? window.location.origin : "";
  }, [currentServer]);
  const authorize = async () => {
    if (!currentToken || !userCode || !serverBase) return;
    setStatus("loading");
    setError(null);
    try {
      const response = await fetch(`${serverBase}/api/v1/users/cli-login/authorize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify({ userCode })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : "CLI \u6388\u6743\u5931\u8D25\uFF0C\u8BF7\u91CD\u65B0\u8FD0\u884C nolo login\u3002"
        );
      }
      setStatus("approved");
    } catch (authorizeError) {
      setStatus("error");
      setError(
        authorizeError instanceof Error ? authorizeError.message : "CLI \u6388\u6743\u5931\u8D25\uFF0C\u8BF7\u91CD\u65B0\u8FD0\u884C nolo login\u3002"
      );
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "login-container", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "auth-form-panel", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "login-form", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "login-title", children: "\u6388\u6743 nolo-cli" }),
    !currentToken ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "auth-form-footer", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "link-text", children: "\u8BF7\u5148\u767B\u5F55 Nolo\uFF0C\u7136\u540E\u56DE\u5230\u8FD9\u4E2A\u6388\u6743\u9875\u9762\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavLink, { to: "/login" /* LOGIN */, className: "signup-link", children: "\u53BB\u767B\u5F55" })
    ] }) : !userCode ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "error-message", children: "\u6388\u6743\u7801\u7F3A\u5931\u3002\u8BF7\u91CD\u65B0\u8FD0\u884C nolo login\u3002" }) : status === "approved" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "auth-form-footer", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "link-text", children: [
        "\u5DF2\u6388\u6743 ",
        currentUser?.username || "\u5F53\u524D\u8D26\u53F7",
        "\u3002"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "link-text", children: "\u53EF\u4EE5\u56DE\u5230\u7EC8\u7AEF\u7EE7\u7EED\u4F7F\u7528 nolo-cli\u3002" })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "auth-form-footer", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "link-text", children: "\u786E\u8BA4\u628A\u5F53\u524D\u8D26\u53F7\u6388\u6743\u7ED9\u7EC8\u7AEF\u91CC\u7684 nolo-cli\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "link-text", children: [
        "\u6388\u6743\u7801\uFF1A",
        userCode
      ] }),
      error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "error-message", children: error }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        Button_default,
        {
          variant: "primary",
          size: "large",
          loading: status === "loading",
          disabled: status === "loading",
          style: { width: "100%" },
          onClick: authorize,
          children: "\u6388\u6743 nolo-cli"
        }
      )
    ] })
  ] }) }) });
};
var CliAuthorize_default = CliAuthorize;
export {
  CliAuthorize_default as default
};
