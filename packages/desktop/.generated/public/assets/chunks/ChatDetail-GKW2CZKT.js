import {
  useNavigate,
  useParams
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

// packages/lab/date/pages/ChatDetail.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
function ChatDetail() {
  const { partnerId } = useParams();
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
  const defaultPartner = {
    id: 0,
    name: t("demo_user"),
    img: "https://picsum.photos/seed/default/80/80"
  };
  const partner = partnerId ? {
    id: Number(partnerId),
    name: `${t("user")} #${partnerId}`,
    img: `https://picsum.photos/seed/${partnerId}/80/80`
  } : defaultPartner;
  const [messages, setMessages] = (0, import_react.useState)([
    { id: 1, from: "partner", text: t("hi_sample") },
    { id: 2, from: "partner", text: t("how_are_you") }
  ]);
  const [input, setInput] = (0, import_react.useState)("");
  const sendMessage = () => {
    if (!input.trim()) return;
    const newMsg = { id: Date.now(), from: "me", text: input.trim() };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    const replies = [
      t("got_it"),
      t("interesting"),
      t("sounds_good"),
      t("lets_continue")
    ];
    const reply = replies[Math.floor(Math.random() * replies.length)];
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, from: "partner", text: reply }
      ]);
    }, 1200);
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  const toggleLanguage = () => {
    const newLang = i18n.language === "zh" ? "en" : "zh";
    i18n.changeLanguage(newLang);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: style.page, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { style: style.header, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { type: "button", style: style.backBtn, onClick: () => navigate("/match"), children: [
        "\u2190 ",
        t("back_to_match")
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", { src: partner.img, alt: partner.name, style: style.avatar }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: style.partnerName, children: partner.name }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: style.langBtn, onClick: toggleLanguage, children: i18n.language === "zh" ? "EN" : "\u4E2D" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: style.chatArea, children: messages.map((msg) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "div",
      {
        style: {
          ...style.messageBubble,
          ...msg.from === "me" ? style.myBubble : style.partnerBubble
        },
        children: msg.text
      },
      msg.id
    )) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", { style: style.inputBar, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "textarea",
        {
          rows: 1,
          placeholder: t("send_message_placeholder"),
          value: input,
          onChange: (e) => setInput(e.target.value),
          onKeyDown: handleKeyDown,
          style: style.textInput
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: sendMessage, style: style.sendBtn, children: t("send") })
    ] })
  ] });
}
var style = {
  page: {
    fontFamily: `'Helvetica Neue', Helvetica, Arial, sans-serif`,
    display: "flex",
    flexDirection: "column",
    height: "calc(100vh - 40px)",
    maxWidth: "520px",
    margin: "20px auto",
    backgroundColor: "#f5f5f5",
    borderRadius: "12px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
    overflow: "hidden"
  },
  header: {
    display: "flex",
    alignItems: "center",
    padding: "12px 16px",
    backgroundColor: "#fff",
    borderBottom: "1px solid #ddd"
  },
  backBtn: {
    background: "none",
    border: "none",
    fontSize: "15px",
    cursor: "pointer",
    marginRight: "12px",
    color: "#007bff"
  },
  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    marginRight: "12px"
  },
  partnerName: {
    fontSize: "17px",
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    textAlign: "left"
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
  chatArea: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
    backgroundColor: "#eaeaea"
  },
  messageBubble: {
    maxWidth: "75%",
    padding: "10px 14px",
    margin: "8px 0",
    borderRadius: "16px",
    lineHeight: "1.5",
    wordBreak: "break-word",
    fontSize: "15px"
  },
  myBubble: {
    backgroundColor: "#0084ff",
    color: "#fff",
    alignSelf: "flex-end",
    borderTopRightRadius: "0"
  },
  partnerBubble: {
    backgroundColor: "#fff",
    color: "#000",
    alignSelf: "flex-start",
    borderTopLeftRadius: "0"
  },
  inputBar: {
    display: "flex",
    alignItems: "center",
    padding: "12px 16px",
    backgroundColor: "#fff",
    borderTop: "1px solid #ddd"
  },
  textInput: {
    flex: 1,
    resize: "none",
    border: "1px solid #ccc",
    borderRadius: "6px",
    padding: "10px 12px",
    fontSize: "15px",
    marginRight: "10px",
    outline: "none"
  },
  sendBtn: {
    backgroundColor: "#28a745",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "10px 16px",
    fontSize: "15px",
    cursor: "pointer"
  }
};
export {
  ChatDetail as default
};
