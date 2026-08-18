import {
  useNavigate
} from "/public/assets/chunks/chunk-BELEJNOF.js";
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

// packages/lab/date/pages/MyProfile.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
function MyProfile() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  (0, import_react.useEffect)(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const isPaid = localStorage.getItem("isPaid") === "true";
    if (!isLoggedIn) {
      navigate("/login");
    } else if (!isPaid) {
      navigate("/pay-prompt");
    }
  }, [navigate]);
  const [loggedOut, setLoggedOut] = (0, import_react.useState)(false);
  const demoUser = {
    avatar: "https://picsum.photos/seed/profile/150/150",
    name: i18n.language === "zh" ? "Demo \u5C0F\u7EA2" : "Demo Xiaohong",
    age: 26,
    location: i18n.language === "zh" ? "\u4E0A\u6D77" : "Shanghai",
    bio: i18n.language === "zh" ? "\u70ED\u7231\u65C5\u6E38\u3001\u9605\u8BFB\u548C\u97F3\u4E50\uFF0C\u5BFB\u627E\u5FD7\u540C\u9053\u5408\u7684\u670B\u53CB\u3002" : "Love traveling, reading, and music. Looking for like-minded friends."
  };
  const handleEdit = () => {
    alert(t("edit_profile_demo"));
  };
  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("isPaid");
    setLoggedOut(true);
  };
  const toggleLanguage = () => {
    const newLang = i18n.language === "zh" ? "en" : "zh";
    i18n.changeLanguage(newLang);
  };
  if (loggedOut) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: style.welcome, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: t("welcome_title") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("please_relogin") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          style: style.loginBtn,
          onClick: () => {
            navigate("/login");
          },
          children: t("back_to_home")
        }
      )
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: style.page, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", { style: style.nav, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: style.tab, onClick: () => navigate("/match"), children: t("match") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: style.tab, onClick: () => navigate("/chat/1"), children: t("chat") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: { ...style.tab, ...style.activeTab }, children: t("my") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: style.langBtn, onClick: toggleLanguage, children: i18n.language === "zh" ? "EN" : "\u4E2D" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: style.profileBox, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", { src: demoUser.avatar, alt: "\u5934\u50CF", style: style.avatar }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", { style: style.name, children: [
        demoUser.name,
        "\uFF0C",
        demoUser.age
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { style: style.location, children: [
        t("location_label"),
        "\uFF1A",
        demoUser.location
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { style: style.bio, children: [
        t("bio_label"),
        "\uFF1A",
        demoUser.bio
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: style.actions, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: style.editBtn, onClick: handleEdit, children: t("edit_profile") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: style.logoutBtn, onClick: handleLogout, children: t("logout") })
      ] })
    ] })
  ] });
}
var style = {
  page: {
    fontFamily: `'Helvetica Neue', Helvetica, Arial, sans-serif`,
    maxWidth: "520px",
    margin: "40px auto",
    padding: "0 20px",
    backgroundColor: "#f5f5f5",
    minHeight: "100vh"
  },
  nav: {
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    padding: "12px 0",
    backgroundColor: "#fff",
    borderBottom: "1px solid #ddd",
    borderRadius: "12px 12px 0 0"
  },
  tab: {
    background: "none",
    border: "none",
    fontSize: "16px",
    color: "#555",
    cursor: "pointer",
    padding: "6px 12px"
  },
  activeTab: {
    color: "#007bff",
    fontWeight: "bold",
    borderBottom: "2px solid #007bff"
  },
  langBtn: {
    background: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    padding: "4px 10px",
    fontSize: "14px",
    cursor: "pointer"
  },
  profileBox: {
    backgroundColor: "#fff",
    borderRadius: "0 0 12px 12px",
    padding: "30px 20px",
    marginTop: "0",
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
    textAlign: "center"
  },
  avatar: {
    width: "120px",
    height: "120px",
    borderRadius: "50%",
    objectFit: "cover",
    marginBottom: "16px",
    border: "3px solid #eee"
  },
  name: {
    margin: "10px 0",
    fontSize: "24px",
    color: "#222"
  },
  location: {
    margin: "6px 0",
    fontSize: "15px",
    color: "#777"
  },
  bio: {
    margin: "16px 0",
    fontSize: "15px",
    color: "#555",
    lineHeight: "1.5"
  },
  actions: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginTop: "24px"
  },
  editBtn: {
    backgroundColor: "#6c757d",
    color: "#fff",
    border: "none",
    padding: "12px",
    fontSize: "16px",
    borderRadius: "8px",
    cursor: "pointer"
  },
  logoutBtn: {
    backgroundColor: "#dc3545",
    color: "#fff",
    border: "none",
    padding: "12px",
    fontSize: "16px",
    borderRadius: "8px",
    cursor: "pointer"
  },
  welcome: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    fontFamily: `'Helvetica Neue', Helvetica, Arial, sans-serif`,
    backgroundColor: "#f0f8ff",
    textAlign: "center",
    padding: "20px"
  },
  loginBtn: {
    marginTop: "24px",
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    padding: "12px 24px",
    borderRadius: "8px",
    fontSize: "16px",
    cursor: "pointer"
  }
};
export {
  MyProfile as default
};
