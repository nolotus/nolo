import {
  getShareTypeLabel
} from "/public/assets/chunks/chunk-XCKMPAB4.js";
import {
  Avatar_default
} from "/public/assets/chunks/chunk-EOM4G5HF.js";
import {
  NavLink,
  useNavigate
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  formatShareTime,
  normalizeAuthorName,
  toTrimmedString
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  LuArrowRight,
  LuBot,
  LuClock3,
  LuFileText,
  LuLayoutDashboard,
  LuMessagesSquare,
  LuTable
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/pages/ShareCard.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime());
var ShareCard = ({ share, className = "" }) => {
  const navigate = useNavigate();
  const isPage = share.type === "page" /* DOC */;
  const isApp = share.type === "app" /* APP */;
  const isTable = share.type === "table" /* TABLE */;
  const displayAuthorName = normalizeAuthorName(share.authorName);
  const shouldShowAuthor = Boolean(displayAuthorName);
  const displayAgentName = toTrimmedString(share.agentName);
  const shouldShowAgent = Boolean(share.agentKey || displayAgentName);
  const coverImage = share.coverImage || share.coverImageUrl;
  const openShareDetail = () => {
    if (isApp && share.url) {
      window.open(share.url, "_blank", "noopener,noreferrer");
    } else {
      navigate(share.path);
    }
  };
  const iconClass = isPage ? "ShareCard__icon--page" : isTable ? "ShareCard__icon--table" : isApp ? "ShareCard__icon--app" : "ShareCard__icon--chat";
  const iconNode = isPage ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuFileText, { size: 20, "aria-hidden": "true" }) : isTable ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuTable, { size: 20, "aria-hidden": "true" }) : isApp ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuLayoutDashboard, { size: 20, "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuMessagesSquare, { size: 20, "aria-hidden": "true" });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "article",
    {
      role: "link",
      tabIndex: 0,
      className: `ShareCard ${className}`,
      onClick: openShareDetail,
      onKeyDown: (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openShareDetail();
        }
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ShareCard__header", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ShareCard__identity", children: [
            shouldShowAuthor && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ShareCard__userInfo", children: share.authorPath ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              NavLink,
              {
                to: share.authorPath,
                className: "ShareCard__identityLink",
                onClick: (event) => event.stopPropagation(),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    Avatar_default,
                    {
                      name: displayAuthorName,
                      src: share.authorAvatar,
                      size: "small",
                      className: "ShareCard__userAvatar"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ShareCard__userName", children: displayAuthorName })
                ]
              }
            ) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                Avatar_default,
                {
                  name: displayAuthorName,
                  src: share.authorAvatar,
                  size: "small",
                  className: "ShareCard__userAvatar"
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ShareCard__userName", children: displayAuthorName })
            ] }) }),
            shouldShowAgent && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ShareCard__agentInfo", children: share.agentPath ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              NavLink,
              {
                to: share.agentPath,
                className: "ShareCard__identityLink ShareCard__identityLink--agent",
                onClick: (event) => event.stopPropagation(),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuBot, { size: 14, "aria-hidden": "true" }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: displayAgentName || "\u6765\u6E90 Agent" })
                ]
              }
            ) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuBot, { size: 14, "aria-hidden": "true" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: displayAgentName || "\u6765\u6E90 Agent" })
            ] }) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ShareCard__badges", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ShareCard__badge", children: getShareTypeLabel(share.type) }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ShareCard__body", children: [
          coverImage && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ShareCard__cover", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", { src: coverImage, alt: "", loading: "lazy" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ShareCard__mainInfo", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `ShareCard__icon ${iconClass}`, "aria-hidden": "true", children: iconNode }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: "ShareCard__title", title: share.title, children: share.title })
          ] }),
          share.description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "ShareCard__desc", children: share.description })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ShareCard__footer", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "ShareCard__time", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuClock3, { size: 12, "aria-hidden": "true" }),
            formatShareTime(
              share.updatedAt && share.updatedAt > share.createdAt ? share.updatedAt : share.createdAt
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ShareCard__arrow", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuArrowRight, { size: 16, "aria-hidden": "true" }) })
        ] })
      ]
    }
  );
};

export {
  ShareCard
};
