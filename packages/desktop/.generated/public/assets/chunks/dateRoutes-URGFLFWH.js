import {
  Navigate,
  Outlet,
  useNavigate
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  client_default
} from "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-UWXJIOEO.js";
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

// packages/lab/date/dateRoutes.tsx
var import_react4 = __toESM(require_react(), 1);

// packages/lab/date/pages/LoginPage.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
function LoginPage() {
  const navigate = useNavigate();
  const [lang, setLang] = (0, import_react.useState)(client_default.language);
  const handleLogin = () => {
    localStorage.setItem("isLoggedIn", "true");
    navigate("/pay-prompt");
  };
  const toggleLanguage = () => {
    const newLang = lang === "zh" ? "en" : "zh";
    client_default.changeLanguage(newLang);
    setLang(newLang);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.page, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.card, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { style: styles.title, children: lang === "zh" ? "\u6B22\u8FCE\u6765\u5230\u7F18\u9047" : "Welcome to MatchLink" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: styles.desc, children: lang === "zh" ? "\u4F53\u9A8C\u667A\u80FD\u5339\u914D\uFF0C\u5F00\u542F\u4F60\u7684\u7F18\u5206\u4E4B\u65C5" : "Experience smart matching, start your journey" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: styles.loginBtn, onClick: handleLogin, children: lang === "zh" ? "\u6F14\u793A\u767B\u5F55 (\u4E00\u952E\u767B\u5F55)" : "Demo Login" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.langSwitch, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: lang === "zh" ? "\u8BED\u8A00\uFF1A" : "Language: " }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: styles.langBtn, onClick: toggleLanguage, children: lang === "zh" ? "English" : "\u4E2D\u6587" })
    ] })
  ] }) });
}
var styles = {
  page: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    backgroundColor: "#f0f2f5",
    fontFamily: `'Helvetica Neue', Arial, sans-serif`
  },
  card: {
    backgroundColor: "#fff",
    padding: "30px 20px",
    borderRadius: "8px",
    textAlign: "center",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    width: "90%",
    maxWidth: "360px"
  },
  title: {
    margin: "0 0 12px",
    fontSize: "22px",
    color: "#333"
  },
  desc: {
    margin: "0 0 20px",
    fontSize: "14px",
    color: "#666"
  },
  loginBtn: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#1877f2",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "16px",
    cursor: "pointer",
    marginBottom: "20px"
  },
  langSwitch: {
    fontSize: "14px",
    color: "#666"
  },
  langBtn: {
    background: "none",
    border: "none",
    color: "#1877f2",
    textDecoration: "underline",
    cursor: "pointer",
    marginLeft: "6px"
  }
};

// packages/lab/date/pages/PaymentPromptPage.tsx
var import_react2 = __toESM(require_react(), 1);
var import_jsx_runtime2 = __toESM(require_jsx_runtime(), 1);
function PaymentPromptPage() {
  const navigate = useNavigate();
  const [lang, setLang] = (0, import_react2.useState)(client_default.language);
  const handlePay = () => {
    localStorage.setItem("isPaid", "true");
    alert(lang === "zh" ? "\u652F\u4ED8\u6210\u529F\uFF01" : "Payment successful!");
    navigate("/match");
  };
  const toggleLanguage = () => {
    const newLang = lang === "zh" ? "en" : "zh";
    client_default.changeLanguage(newLang);
    setLang(newLang);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: styles2.page, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: styles2.card, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { style: styles2.title, children: lang === "zh" ? "\u5F00\u901A\u4F1A\u5458" : "Activate Membership" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { style: styles2.desc, children: lang === "zh" ? "\u5F00\u901A\u4F1A\u5458\u5373\u53EF\u89E3\u9501\u65E0\u9650\u914D\u5BF9\u548C\u804A\u5929\u529F\u80FD" : "Unlock unlimited matches and chat" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: styles2.priceBox, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: styles2.price, children: "$9.99" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: styles2.unit, children: lang === "zh" ? "/ \u6708" : "/ month" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", style: styles2.payBtn, onClick: handlePay, children: lang === "zh" ? "\u7ACB\u5373\u5F00\u901A" : "Activate Now" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: styles2.langSwitch, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: lang === "zh" ? "\u8BED\u8A00\uFF1A" : "Language: " }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", style: styles2.langBtn, onClick: toggleLanguage, children: lang === "zh" ? "English" : "\u4E2D\u6587" })
    ] })
  ] }) });
}
var styles2 = {
  page: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    backgroundColor: "#f0f2f5",
    fontFamily: `'Helvetica Neue', Arial, sans-serif`
  },
  card: {
    backgroundColor: "#fff",
    padding: "30px 20px",
    borderRadius: "8px",
    textAlign: "center",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    width: "90%",
    maxWidth: "360px"
  },
  title: {
    margin: "0 0 12px",
    fontSize: "20px",
    color: "#333"
  },
  desc: {
    margin: "0 0 20px",
    fontSize: "14px",
    color: "#666"
  },
  priceBox: {
    margin: "20px 0"
  },
  price: {
    fontSize: "32px",
    fontWeight: "bold",
    color: "#333"
  },
  unit: {
    fontSize: "14px",
    color: "#777",
    marginLeft: "4px"
  },
  payBtn: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#42b549",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "16px",
    cursor: "pointer",
    marginBottom: "20px"
  },
  langSwitch: {
    fontSize: "14px",
    color: "#666"
  },
  langBtn: {
    background: "none",
    border: "none",
    color: "#1877f2",
    textDecoration: "underline",
    cursor: "pointer",
    marginLeft: "6px"
  }
};

// packages/lab/date/guards/authGuard.tsx
var import_react3 = __toESM(require_react(), 1);
var import_jsx_runtime3 = __toESM(require_jsx_runtime(), 1);
var RequireAuthAndPayment = ({
  children
}) => {
  const navigate = useNavigate();
  (0, import_react3.useEffect)(() => {
    const isLoggedIn2 = localStorage.getItem("isLoggedIn") === "true";
    const isPaid2 = localStorage.getItem("isPaid") === "true";
    if (!isLoggedIn2) {
      navigate("/login");
    } else if (!isPaid2) {
      navigate("/pay-prompt");
    }
  }, [navigate]);
  if (typeof window === "undefined") {
    return null;
  }
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const isPaid = localStorage.getItem("isPaid") === "true";
  if (!isLoggedIn) {
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Navigate, { to: "/login", replace: true });
  }
  if (!isPaid) {
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Navigate, { to: "/pay-prompt", replace: true });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_jsx_runtime3.Fragment, { children: children || /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Outlet, {}) });
};

// packages/lab/date/dateRoutes.tsx
var import_jsx_runtime4 = __toESM(require_jsx_runtime(), 1);
var MatchPage = (0, import_react4.lazy)(() => import("/public/assets/chunks/MatchPage-4PLXX746.js"));
var ChatDetail = (0, import_react4.lazy)(() => import("/public/assets/chunks/ChatDetail-GKW2CZKT.js"));
var MyProfile = (0, import_react4.lazy)(() => import("/public/assets/chunks/MyProfile-L4BIZULN.js"));
var SuspenseFallback = () => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { padding: "40px", textAlign: "center" }, children: "Loading..." });
var dateRoutes = [
  {
    path: "/",
    element: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(RequireAuthAndPayment, { children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Outlet, {}) }),
    children: [
      {
        index: true,
        element: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react4.Suspense, { fallback: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(SuspenseFallback, {}), children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(MatchPage, {}) })
      },
      {
        path: "match",
        element: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react4.Suspense, { fallback: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(SuspenseFallback, {}), children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(MatchPage, {}) })
      },
      {
        path: "chat/:partnerId",
        element: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react4.Suspense, { fallback: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(SuspenseFallback, {}), children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(ChatDetail, {}) })
      },
      {
        path: "profile",
        element: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react4.Suspense, { fallback: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(SuspenseFallback, {}), children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(MyProfile, {}) })
      }
    ]
  },
  { path: "/login", element: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(LoginPage, {}) },
  { path: "/pay-prompt", element: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(PaymentPromptPage, {}) }
];
export {
  dateRoutes
};
