import {
  buildAgentEmailBindingSummary,
  formatDateValue
} from "/public/assets/chunks/chunk-CA74EWBF.js";
import "/public/assets/chunks/chunk-NLX7YQL6.js";
import {
  useFetchData
} from "/public/assets/chunks/chunk-EA4SLPRB.js";
import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import "/public/assets/chunks/chunk-5IJJ57JD.js";
import "/public/assets/chunks/chunk-VCSNZD3S.js";
import {
  PageLoading_default
} from "/public/assets/chunks/chunk-YCIZFIEN.js";
import "/public/assets/chunks/chunk-2IJLPAOU.js";
import {
  useToken
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import "/public/assets/chunks/chunk-OOUNP25R.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import {
  Link,
  useParams
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  selectById,
  selectCurrentServer
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import {
  asTrimmedString
} from "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuArrowLeft,
  LuInbox,
  LuMail,
  LuRefreshCw,
  LuX
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import "/public/assets/chunks/chunk-UWXJIOEO.js";
import "/public/assets/chunks/chunk-TBNFSVJC.js";
import {
  asOptionalTrimmedString
} from "/public/assets/chunks/chunk-SM3EH4JD.js";
import "/public/assets/chunks/chunk-JOOBQBMM.js";
import "/public/assets/chunks/chunk-7OO56Y7L.js";
import "/public/assets/chunks/chunk-NKT4VBPJ.js";
import "/public/assets/chunks/chunk-LPS7IE46.js";
import "/public/assets/chunks/chunk-RUG5F6GD.js";
import "/public/assets/chunks/chunk-XJRNNKKF.js";
import {
  isRecord
} from "/public/assets/chunks/chunk-IRTDRTXE.js";
import "/public/assets/chunks/chunk-XDKHKMJ3.js";
import "/public/assets/chunks/chunk-VCXOIOLL.js";
import "/public/assets/chunks/chunk-AHAP23JL.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  toErrorMessage
} from "/public/assets/chunks/chunk-3EHRYDZ6.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/ai/agent/web/AgentInboxPage.tsx
var import_react = __toESM(require_react());

// packages/app/email/agentEmailRpc.ts
async function postAuthorizedJsonRpc(serverOrigin, token, path, body) {
  const base = serverOrigin.replace(/\/+$/, "");
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { rawText: text };
  }
  if (!response.ok) {
    throw Object.assign(new Error(`HTTP ${response.status}`), { payload });
  }
  return payload;
}
async function listAgentInboxEmails(args) {
  return postAuthorizedJsonRpc(args.serverOrigin, args.token, "/rpc/listEmails", {
    ownerId: args.agentId,
    mailbox: "inbox",
    limit: args.limit ?? 50
  });
}

// packages/ai/agent/web/AgentInboxPage.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime());
var formatParticipant = (value) => {
  const email = asTrimmedString(value?.email);
  const name = asTrimmedString(value?.name);
  if (name && email) return `${name} <${email}>`;
  return email || name || "\u2014";
};
var isEmailRecord = (value) => isRecord(value) && typeof value.subject === "string";
var AgentInboxPage = ({ agentKey: agentKeyProp }) => {
  const params = useParams();
  const agentPageKey = params.agentPageKey;
  const agentKey = asOptionalTrimmedString(agentKeyProp) ?? asOptionalTrimmedString(agentPageKey) ?? "";
  const server = useAppSelector(selectCurrentServer);
  const token = useToken();
  const item = useAppSelector((state) => selectById(state, agentKey));
  const { isLoading: isAgentLoading } = useFetchData(agentKey);
  const agentAuthorityServer = item?.authorityServer || item?.originServer || server || "";
  const emailBinding = (0, import_react.useMemo)(
    () => buildAgentEmailBindingSummary(
      item
    ),
    [item]
  );
  const primaryMailbox = emailBinding.primaryEmail || emailBinding.identities[0]?.emailAddress;
  const [emails, setEmails] = (0, import_react.useState)([]);
  const [inboxError, setInboxError] = (0, import_react.useState)(null);
  const [inboxLoading, setInboxLoading] = (0, import_react.useState)(false);
  const [selectedEmail, setSelectedEmail] = (0, import_react.useState)(null);
  const loadInbox = (0, import_react.useCallback)(async () => {
    if (!primaryMailbox) return;
    if (!agentAuthorityServer || !token) {
      setInboxError("\u8BF7\u5148\u767B\u5F55\u540E\u518D\u67E5\u770B\u6536\u4EF6\u7BB1\u3002");
      return;
    }
    setInboxLoading(true);
    setInboxError(null);
    try {
      const payload = await listAgentInboxEmails({
        serverOrigin: agentAuthorityServer,
        token,
        agentId: agentKey,
        limit: 50
      });
      const rows = Array.isArray(payload) ? payload.filter(isEmailRecord) : [];
      setEmails(rows);
    } catch (error) {
      setInboxError(toErrorMessage(error));
      setEmails([]);
    } finally {
      setInboxLoading(false);
    }
  }, [agentAuthorityServer, agentKey, primaryMailbox, token]);
  (0, import_react.useEffect)(() => {
    if (!primaryMailbox) return;
    void loadInbox();
  }, [loadInbox, primaryMailbox]);
  if (!agentKey) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "agent-inbox-page", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "agent-inbox-page__container", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "\u65E0\u6548\u7684 Agent \u94FE\u63A5\u3002" }) }) });
  }
  if (isAgentLoading && !item) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "agent-inbox-page", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageLoading_default, {}) });
  }
  const agentName = asOptionalTrimmedString(item?.name) ?? agentKey;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "agent-inbox-page", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "agent-inbox-page__container", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { className: "agent-inbox-page__header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, { to: `/${agentKey}`, className: "agent-inbox-page__back", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuArrowLeft, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u8FD4\u56DE Agent" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "agent-inbox-page__title-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuInbox, { size: 20, "aria-hidden": "true" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", { className: "agent-inbox-page__title", children: [
            agentName,
            " \xB7 \u6536\u4EF6\u7BB1"
          ] }),
          primaryMailbox ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "agent-inbox-page__mailbox", children: primaryMailbox }) : null
        ] })
      ] }),
      primaryMailbox ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        Button_default,
        {
          variant: "secondary",
          size: "small",
          onClick: () => void loadInbox(),
          disabled: inboxLoading,
          icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuRefreshCw, { size: 14 }),
          children: inboxLoading ? "\u5237\u65B0\u4E2D\u2026" : "\u5237\u65B0"
        }
      ) : null
    ] }),
    !primaryMailbox ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "agent-inbox-page__empty", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuMail, { size: 28, "aria-hidden": "true" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "\u8BE5 Agent \u5C1A\u672A\u7ED1\u5B9A\u53D7\u63A7\u57DF\u540D\u90AE\u7BB1\uFF0C\u7ED1\u5B9A\u540E\u624D\u4F1A\u51FA\u73B0\u6536\u4EF6\u7BB1\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, { to: `/${agentKey}`, children: "\u56DE\u5230 Agent \u8BE6\u60C5\u67E5\u770B\u90AE\u7BB1\u7ED1\u5B9A" })
    ] }) : inboxError ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "agent-inbox-page__empty agent-inbox-page__empty--error", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: inboxError }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button_default, { variant: "secondary", size: "small", onClick: () => void loadInbox(), children: "\u91CD\u8BD5" })
    ] }) : inboxLoading && emails.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageLoading_default, {}) : emails.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", { className: "agent-inbox-page__empty", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "\u6536\u4EF6\u7BB1\u6682\u65E0\u90AE\u4EF6\u3002" }) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { className: "agent-inbox-page__list", children: emails.map((mail) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "button",
      {
        type: "button",
        className: "agent-inbox-page__item agent-inbox-page__item--clickable",
        onClick: () => setSelectedEmail(mail),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "agent-inbox-page__item-head", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "agent-inbox-page__subject", children: asOptionalTrimmedString(mail.subject) ?? "\uFF08\u65E0\u4E3B\u9898\uFF09" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("time", { className: "agent-inbox-page__time", children: formatDateValue(mail.updatedAt || mail.createdAt, "MM-dd HH:mm") })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "agent-inbox-page__from", children: [
            "\u6765\u81EA ",
            formatParticipant(mail.from)
          ] }),
          mail.text?.trim() ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "agent-inbox-page__preview", children: mail.text.trim() }) : mail.html?.trim() ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "agent-inbox-page__preview", children: "\uFF08HTML \u90AE\u4EF6\uFF09" }) : null
        ]
      }
    ) }, mail.dbKey)) }),
    selectedEmail ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "agent-inbox-page__detail", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "agent-inbox-page__detail-toolbar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            type: "button",
            className: "agent-inbox-page__back",
            onClick: () => setSelectedEmail(null),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuArrowLeft, { size: 16, "aria-hidden": "true" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u8FD4\u56DE\u5217\u8868" })
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: "agent-inbox-page__detail-close",
            onClick: () => setSelectedEmail(null),
            "aria-label": "\u5173\u95ED\u8BE6\u60C5",
            children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuX, { size: 18, "aria-hidden": "true" })
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "agent-inbox-page__detail-head", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "agent-inbox-page__detail-subject", children: asOptionalTrimmedString(selectedEmail.subject) ?? "\uFF08\u65E0\u4E3B\u9898\uFF09" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "agent-inbox-page__detail-meta", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "agent-inbox-page__detail-from", children: [
            "\u6765\u81EA ",
            formatParticipant(selectedEmail.from)
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("time", { className: "agent-inbox-page__detail-time", children: formatDateValue(selectedEmail.updatedAt || selectedEmail.createdAt, "yyyy-MM-dd HH:mm") })
        ] }),
        selectedEmail.to?.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "agent-inbox-page__detail-to", children: [
          "\u6536\u4EF6\u4EBA ",
          selectedEmail.to.map(formatParticipant).join(", ")
        ] }) : null
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "agent-inbox-page__detail-body", children: selectedEmail.text?.trim() ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { className: "agent-inbox-page__detail-text", children: selectedEmail.text }) : selectedEmail.html?.trim() ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "iframe",
        {
          className: "agent-inbox-page__detail-html",
          title: asOptionalTrimmedString(selectedEmail.subject) ?? "\u90AE\u4EF6\u6B63\u6587",
          sandbox: "",
          srcDoc: selectedEmail.html,
          referrerPolicy: "no-referrer"
        }
      ) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "agent-inbox-page__detail-empty", children: "\uFF08\u65E0\u6B63\u6587\u5185\u5BB9\uFF09" }) })
    ] }) : null
  ] }) });
};
var AgentInboxPage_default = AgentInboxPage;
export {
  AgentInboxPage_default as default
};
