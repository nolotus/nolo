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

// packages/lab/date/pages/MatchPage.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
function MatchPage() {
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
  const demoUsers = [
    {
      id: 1,
      name: i18n.language === "zh" ? "\u5C0F\u660E" : "Xiao Ming",
      age: 25,
      location: i18n.language === "zh" ? "\u5317\u4EAC" : "Beijing",
      bio: i18n.language === "zh" ? "\u559C\u6B22\u65C5\u884C\u548C\u6444\u5F71\uFF0C\u671F\u5F85\u9047\u89C1\u6709\u8DA3\u7684\u4F60\u3002" : "Love traveling and photography. Looking for someone interesting.",
      img: "https://picsum.photos/seed/1/300/300"
    },
    {
      id: 2,
      name: i18n.language === "zh" ? "Emma" : "Emma",
      age: 27,
      location: i18n.language === "zh" ? "\u4F26\u6566" : "London",
      bio: i18n.language === "zh" ? "\u5496\u5561\u7231\u597D\u8005\uFF0C\u559C\u6B22\u6DF1\u5165\u4EA4\u6D41\u3002" : "Coffee lover. Looking for a deep conversation.",
      img: "https://picsum.photos/seed/2/300/300"
    },
    {
      id: 3,
      name: i18n.language === "zh" ? "\u5F20\u4F1F" : "Zhang Wei",
      age: 30,
      location: i18n.language === "zh" ? "\u4E0A\u6D77" : "Shanghai",
      bio: i18n.language === "zh" ? "\u70ED\u7231\u7F8E\u98DF\u548C\u97F3\u4E50\uFF0C\u60F3\u548C\u4F60\u4E00\u8D77\u73A9\u8F6C\u57CE\u5E02\u3002" : "Love food and music. Want to explore the city with you.",
      img: "https://picsum.photos/seed/3/300/300"
    }
  ];
  const [curIdx, setCurIdx] = (0, import_react.useState)(0);
  const [loading, setLoading] = (0, import_react.useState)(false);
  const [matched, setMatched] = (0, import_react.useState)(null);
  const MATCH_TARGET = 2;
  const goNext = (action) => {
    if (action === "like" && curIdx === MATCH_TARGET) {
      setMatched(demoUsers[curIdx]);
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setCurIdx((prev) => (prev + 1) % demoUsers.length);
    }, 500);
  };
  const startChat = () => {
    if (!matched) return;
    navigate(`/chat/${matched.id}`);
  };
  const user = demoUsers[curIdx];
  const toggleLanguage = () => {
    const newLang = i18n.language === "zh" ? "en" : "zh";
    i18n.changeLanguage(newLang);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.page, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", { style: styles.nav, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: { ...styles.tab, ...styles.activeTab }, children: t("match") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: styles.tab, onClick: () => navigate("/chat/1"), children: t("chat") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: styles.tab, onClick: () => navigate("/profile"), children: t("my") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: styles.langBtn, onClick: toggleLanguage, children: i18n.language === "zh" ? "EN" : "\u4E2D" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.cardContainer, children: matched ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.modalOverlay, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.modal, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { style: styles.modalTitle, children: t("match_success", { name: matched.name }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: styles.chatBtn, onClick: startChat, children: t("start_chat") })
    ] }) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.card, children: [
      loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.loader, children: t("loading") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", { src: user.img, alt: user.name, style: styles.avatar }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { style: styles.name, children: [
        user.name,
        "\uFF0C",
        user.age
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: styles.location, children: user.location }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: styles.bio, children: user.bio }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.actions, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            type: "button",
            style: { ...styles.actionBtn, ...styles.skipBtn },
            onClick: () => goNext("skip"),
            children: [
              "\u274C ",
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.actionLabel, children: t("skip") })
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            type: "button",
            style: { ...styles.actionBtn, ...styles.likeBtn },
            onClick: () => goNext("like"),
            children: [
              "\u2764\uFE0F ",
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.actionLabel, children: t("like") })
            ]
          }
        )
      ] })
    ] }) })
  ] });
}
var styles = {
  page: {
    fontFamily: `'Helvetica Neue', Helvetica, Arial, sans-serif`,
    maxWidth: "520px",
    // 桌面加宽
    margin: "40px auto",
    padding: "0 20px",
    // 桌面加大左右边距
    textAlign: "center",
    position: "relative"
  },
  nav: {
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: "24px",
    paddingBottom: "12px",
    borderBottom: "1px solid #ddd"
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
  cardContainer: { position: "relative", minHeight: "520px" },
  card: {
    border: "1px solid #eee",
    borderRadius: "12px",
    padding: "24px",
    backgroundColor: "#fff",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
  },
  avatar: {
    width: "100%",
    height: "auto",
    borderRadius: "12px",
    marginBottom: "16px"
  },
  name: { margin: "8px 0 6px", fontSize: "22px", color: "#222" },
  location: { margin: "0 0 10px", fontSize: "15px", color: "#777" },
  bio: {
    fontSize: "15px",
    color: "#555",
    marginBottom: "24px",
    lineHeight: "1.5"
  },
  actions: {
    display: "flex",
    justifyContent: "space-around",
    marginTop: "16px"
  },
  actionBtn: {
    flex: "1 1 40%",
    padding: "12px",
    fontSize: "17px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  likeBtn: { backgroundColor: "#e91e63", color: "#fff", marginLeft: "12px" },
  skipBtn: { backgroundColor: "#9e9e9e", color: "#fff", marginRight: "12px" },
  actionLabel: { marginLeft: "8px" },
  loader: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: "16px 28px",
    borderRadius: "10px",
    fontSize: "16px",
    color: "#333",
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    zIndex: 10
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999
  },
  modal: {
    backgroundColor: "#fff",
    padding: "32px",
    borderRadius: "12px",
    width: "90%",
    maxWidth: "400px",
    textAlign: "center",
    boxShadow: "0 6px 16px rgba(0,0,0,0.2)"
  },
  modalTitle: { fontSize: "20px", marginBottom: "24px", color: "#222" },
  chatBtn: {
    backgroundColor: "#28a745",
    color: "#fff",
    border: "none",
    padding: "12px 24px",
    fontSize: "17px",
    borderRadius: "8px",
    cursor: "pointer",
    width: "100%"
  }
};
export {
  MatchPage as default
};
