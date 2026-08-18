import "/public/assets/chunks/chunk-5IOWWQCJ.js";
import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import {
  useCurrentUser,
  useToken
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import "/public/assets/chunks/chunk-OOUNP25R.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import {
  NavLink,
  useNavigate,
  useSearchParams
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  authRoutes,
  selectCurrentServer
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuCircleAlert,
  LuCircleCheck,
  LuLogIn,
  LuUserPlus
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import "/public/assets/chunks/chunk-UWXJIOEO.js";
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
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/create/space/pages/SpaceInvite.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var pageStyle = {
  minHeight: "100%",
  padding: 24,
  background: "#f6f7fb",
  color: "#172033"
};
var panelStyle = {
  maxWidth: 560,
  margin: "64px auto",
  padding: 24,
  border: "1px solid #dde3ee",
  borderRadius: 8,
  background: "#fff",
  boxShadow: "0 14px 38px rgba(15, 23, 42, 0.08)"
};
var mutedStyle = {
  color: "#5f6f86",
  lineHeight: 1.6
};
var statusStyle = {
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
  marginTop: 16,
  padding: 12,
  borderRadius: 8,
  background: "#f3f6fb"
};
var actionRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  marginTop: 20
};
var readPayload = async (response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { rawText: text };
  }
};
var getErrorMessage = (payload, fallback) => payload?.error?.message || payload?.error || payload?.message || fallback;
function SpaceInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentServer = useAppSelector(selectCurrentServer);
  const token = useToken();
  const currentUser = useCurrentUser();
  const [invite, setInvite] = (0, import_react.useState)(null);
  const [error, setError] = (0, import_react.useState)(null);
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [accepting, setAccepting] = (0, import_react.useState)(false);
  const inviteToken = (0, import_react.useMemo)(
    () => searchParams.get("spaceInvite") || searchParams.get("token") || "",
    [searchParams]
  );
  const serverUrl = currentServer || (typeof window !== "undefined" ? window.location.origin : "");
  const returnTo = `${"/space/invite" /* SPACE_INVITE */}?spaceInvite=${encodeURIComponent(inviteToken)}`;
  (0, import_react.useEffect)(() => {
    let active = true;
    const loadInvite = async () => {
      if (!inviteToken) {
        setError("\u7F3A\u5C11\u7A7A\u95F4\u9080\u8BF7 token\u3002");
        setLoading(false);
        return;
      }
      if (!serverUrl) {
        setError("\u7F3A\u5C11\u5F53\u524D\u670D\u52A1\u5668\u5730\u5740\u3002");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const statusPath = `${authRoutes.users.spaceInviteStatus.createPath()}?token=${encodeURIComponent(inviteToken)}`;
        const response = await fetch(`${serverUrl}${statusPath}`, {
          method: authRoutes.users.spaceInviteStatus.method
        });
        const payload = await readPayload(response);
        if (!response.ok) {
          throw new Error(getErrorMessage(payload, `\u8BFB\u53D6\u9080\u8BF7\u5931\u8D25\uFF1AHTTP ${response.status}`));
        }
        if (active) {
          setInvite(payload);
          setError(null);
        }
      } catch (err) {
        if (active) setError(err?.message || "\u8BFB\u53D6\u9080\u8BF7\u5931\u8D25\u3002");
      } finally {
        if (active) setLoading(false);
      }
    };
    loadInvite();
    return () => {
      active = false;
    };
  }, [inviteToken, serverUrl]);
  const acceptInvite = (0, import_react.useCallback)(async () => {
    if (!token) {
      setError("\u8BF7\u5148\u767B\u5F55\u88AB\u9080\u8BF7\u90AE\u7BB1\u5BF9\u5E94\u7684\u8D26\u53F7\u3002");
      return;
    }
    if (!serverUrl || !inviteToken) return;
    try {
      setAccepting(true);
      const response = await fetch(`${serverUrl}${authRoutes.users.spaceInviteAccept.createPath()}`, {
        method: authRoutes.users.spaceInviteAccept.method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ token: inviteToken })
      });
      const payload = await readPayload(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, `\u63A5\u53D7\u9080\u8BF7\u5931\u8D25\uFF1AHTTP ${response.status}`));
      }
      navigate(`/space/${payload.spaceId}`);
    } catch (err) {
      setError(err?.message || "\u63A5\u53D7\u9080\u8BF7\u5931\u8D25\u3002");
    } finally {
      setAccepting(false);
    }
  }, [inviteToken, navigate, serverUrl, token]);
  const loginTo = `${"/login" /* LOGIN */}?returnTo=${encodeURIComponent(returnTo)}`;
  const signupTo = `${"/signup" /* SIGNUP */}?returnTo=${encodeURIComponent(returnTo)}`;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: pageStyle, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { style: panelStyle, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { style: { margin: 0, fontSize: 28 }, children: "\u7A7A\u95F4\u9080\u8BF7" }),
    loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: mutedStyle, children: "\u6B63\u5728\u8BFB\u53D6\u9080\u8BF7..." }) : invite ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { style: mutedStyle, children: [
        "\u4F60\u88AB\u9080\u8BF7\u52A0\u5165 ",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: invite.spaceName || invite.spaceId }),
        "\u3002"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: statusStyle, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuUserPlus, { size: 20, "aria-hidden": "true" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            "\u88AB\u9080\u8BF7\u90AE\u7BB1\uFF1A",
            invite.email
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: mutedStyle, children: "\u8BF7\u4F7F\u7528\u8FD9\u4E2A\u90AE\u7BB1\u5BF9\u5E94\u7684 Nolo \u8D26\u53F7\u767B\u5F55\u540E\u63A5\u53D7\u9080\u8BF7\u3002" })
        ] })
      ] }),
      invite.status !== "pending" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: statusStyle, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCircleCheck, { size: 20, "aria-hidden": "true" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          "\u8FD9\u4E2A\u9080\u8BF7\u5F53\u524D\u72B6\u6001\u662F ",
          invite.status,
          "\u3002"
        ] })
      ] }) : currentUser ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: actionRowStyle, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button_default, { variant: "primary", loading: accepting, disabled: accepting, onClick: acceptInvite, children: "\u63A5\u53D7\u9080\u8BF7" }) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: actionRowStyle, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button_default, { as: NavLink, to: loginTo, variant: "primary", icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuLogIn, { size: 18, "aria-hidden": "true" }), children: "\u767B\u5F55\u540E\u63A5\u53D7" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button_default, { as: NavLink, to: signupTo, variant: "secondary", children: "\u6CE8\u518C\u8D26\u53F7" })
      ] })
    ] }) : null,
    error ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { ...statusStyle, background: "#fff4f2", color: "#8f2a1d" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCircleAlert, { size: 20, "aria-hidden": "true" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: error })
    ] }) : null
  ] }) });
}
export {
  SpaceInvite as default
};
