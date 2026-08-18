import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import {
  useCurrentUser,
  useToken
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import "/public/assets/chunks/chunk-OOUNP25R.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  selectCurrentServer
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuCheck,
  LuInbox,
  LuMail,
  LuRefreshCw,
  LuSend
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

// packages/app/email/AgentEmailE2EPage.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var pageStyle = {
  minHeight: "100%",
  padding: 24,
  background: "#f6f7fb",
  color: "#172033"
};
var shellStyle = {
  maxWidth: 1180,
  margin: "0 auto",
  display: "grid",
  gap: 16
};
var panelStyle = {
  background: "#fff",
  border: "1px solid #dde3ee",
  borderRadius: 8,
  padding: 16
};
var rowStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12
};
var inputStyle = {
  width: "100%",
  minHeight: 38,
  border: "1px solid #c7d0df",
  borderRadius: 6,
  padding: "8px 10px",
  fontSize: 14
};
var codeStyle = {
  margin: 0,
  padding: 12,
  background: "#111827",
  color: "#e5e7eb",
  borderRadius: 6,
  overflowX: "auto",
  fontSize: 12,
  lineHeight: 1.5
};
var buildAgentId = (userId, slot) => `agent-${userId}-emailE2E${slot.toUpperCase()}`;
var buildEmail = (localPart, domain) => `${localPart.trim()}@${domain.trim()}`.toLowerCase();
var nowIso = () => (/* @__PURE__ */ new Date()).toISOString();
function AgentEmailE2EPage() {
  const currentServer = useAppSelector(selectCurrentServer);
  const token = useToken();
  const currentUser = useCurrentUser();
  const [domain, setDomain] = (0, import_react.useState)("example.com");
  const [localA, setLocalA] = (0, import_react.useState)("agent-a");
  const [localB, setLocalB] = (0, import_react.useState)("agent-b");
  const [subject, setSubject] = (0, import_react.useState)("Agent email E2E ping");
  const [body, setBody] = (0, import_react.useState)("Hello from the agent email E2E page.");
  const [mockInbound, setMockInbound] = (0, import_react.useState)(true);
  const [logs, setLogs] = (0, import_react.useState)([]);
  const [busy, setBusy] = (0, import_react.useState)(false);
  const [lastAInbox, setLastAInbox] = (0, import_react.useState)([]);
  const [lastBInbox, setLastBInbox] = (0, import_react.useState)([]);
  const userId = currentUser?.userId || "";
  const agentA = (0, import_react.useMemo)(() => buildAgentId(userId || "unknown", "a"), [userId]);
  const agentB = (0, import_react.useMemo)(() => buildAgentId(userId || "unknown", "b"), [userId]);
  const emailA = (0, import_react.useMemo)(() => buildEmail(localA, domain), [localA, domain]);
  const emailB = (0, import_react.useMemo)(() => buildEmail(localB, domain), [localB, domain]);
  const addLog = (label, detail, ok = true) => {
    setLogs((items) => [{ at: nowIso(), label, detail, ok }, ...items].slice(0, 80));
  };
  const request = async (path, bodyValue) => {
    if (!currentServer) throw new Error("Missing current server");
    if (!token) throw new Error("Missing auth token");
    const response = await fetch(`${currentServer}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(bodyValue)
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
  };
  const writeAgent = async (agentId, name, emailAddress) => request("/api/v1/db/write/", {
    userId,
    customKey: agentId,
    data: {
      id: agentId.split("-").pop(),
      dbKey: agentId,
      type: "agent" /* AGENT */,
      userId,
      ownerId: userId,
      name,
      introduction: `${name} email E2E agent`,
      prompt: "You are an email E2E test agent.",
      tools: ["email_search", "email_read", "email_update_tags", "email_archive"],
      model: "gpt-4.1-mini",
      provider: "openai",
      isPublic: false,
      meta: {
        emailAddress,
        emailProvider: "cloudflare"
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  });
  const bindAgent = (agentId, emailAddress) => request("/rpc/bindAgentEmailIdentity", {
    agentId,
    emailAddress,
    provider: "cloudflare"
  });
  const setupAgents = async () => {
    if (!userId) throw new Error("Missing current user");
    await writeAgent(agentA, "Email E2E Agent A", emailA);
    await bindAgent(agentA, emailA);
    await writeAgent(agentB, "Email E2E Agent B", emailB);
    await bindAgent(agentB, emailB);
    addLog("agents_ready", { agentA, emailA, agentB, emailB });
  };
  const listInbox = async (ownerId) => request("/rpc/listEmails", {
    ownerId,
    mailbox: "inbox",
    limit: 20
  });
  const simulateInbound = async (to, from, messageSubject, messageText) => request("/api/email/inbound/cloudflare", {
    from,
    to,
    subject: messageSubject,
    text: messageText,
    messageId: `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    providerMessageId: `dev-provider-${Date.now()}`,
    providerReceivedAt: nowIso()
  });
  const send = async (fromAgentId, fromEmail, toEmail, messageSubject, messageText) => request("/rpc/sendEmail", {
    agentId: fromAgentId,
    from: { email: fromEmail },
    to: [{ email: toEmail }],
    subject: messageSubject,
    text: messageText
  });
  const refreshA = async () => {
    const rows = await listInbox(agentA);
    setLastAInbox(rows);
    addLog("a_inbox_refreshed", { count: rows.length, rows });
  };
  const refreshB = async () => {
    const rows = await listInbox(agentB);
    setLastBInbox(rows);
    addLog("b_inbox_refreshed", { count: rows.length, rows });
  };
  const runAB = async () => {
    setBusy(true);
    try {
      await setupAgents();
      const sent = await send(agentA, emailA, emailB, subject, body);
      addLog("a_sent_to_b", sent);
      if (mockInbound) {
        const inbound = await simulateInbound(emailB, emailA, subject, body);
        addLog("b_inbound_mocked", inbound);
      }
      await refreshB();
    } catch (error) {
      addLog("a_to_b_failed", error?.payload || error?.message || String(error), false);
    } finally {
      setBusy(false);
    }
  };
  const runBA = async () => {
    setBusy(true);
    try {
      await setupAgents();
      const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;
      const sent = await send(agentB, emailB, emailA, replySubject, `Reply: ${body}`);
      addLog("b_replied_to_a", sent);
      if (mockInbound) {
        const inbound = await simulateInbound(emailA, emailB, replySubject, `Reply: ${body}`);
        addLog("a_inbound_mocked", inbound);
      }
      await refreshA();
    } catch (error) {
      addLog("b_to_a_failed", error?.payload || error?.message || String(error), false);
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", { style: pageStyle, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: shellStyle, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { style: { margin: "0 0 6px", fontSize: 28 }, children: "Agent Email E2E" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { style: { margin: 0, color: "#5b6678" }, children: [
        currentServer || "no server",
        " \xB7 ",
        userId || "not signed in"
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { style: panelStyle, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: rowStyle, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Domain" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { style: inputStyle, value: domain, onChange: (event) => setDomain(event.target.value) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Agent A local" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { style: inputStyle, value: localA, onChange: (event) => setLocalA(event.target.value) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Agent B local" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { style: inputStyle, value: localB, onChange: (event) => setLocalB(event.target.value) })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { ...rowStyle, marginTop: 12 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Subject" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { style: inputStyle, value: subject, onChange: (event) => setSubject(event.target.value) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Body" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { style: inputStyle, value: body, onChange: (event) => setBody(event.target.value) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: { display: "flex", alignItems: "center", gap: 8, paddingTop: 22 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              type: "checkbox",
              checked: mockInbound,
              onChange: (event) => setMockInbound(event.target.checked)
            }
          ),
          "Mock inbound"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { style: { ...panelStyle, display: "grid", gap: 12 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: rowStyle, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Agent A" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { style: codeStyle, children: JSON.stringify({ agentId: agentA, email: emailA }, null, 2) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Agent B" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { style: codeStyle, children: JSON.stringify({ agentId: agentB, email: emailB }, null, 2) })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", flexWrap: "wrap", gap: 8 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button_default, { icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCheck, { size: 16 }), loading: busy, onClick: setupAgents, children: "Prepare agents" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button_default, { icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuSend, { size: 16 }), loading: busy, onClick: runAB, children: "A to B" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button_default, { icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuMail, { size: 16 }), loading: busy, onClick: runBA, children: "B reply A" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button_default, { variant: "secondary", icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuRefreshCw, { size: 16 }), onClick: refreshA, children: "Refresh A" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button_default, { variant: "secondary", icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuInbox, { size: 16 }), onClick: refreshB, children: "Refresh B" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { style: rowStyle, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: panelStyle, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "A inbox" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { style: codeStyle, children: JSON.stringify(lastAInbox, null, 2) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: panelStyle, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "B inbox" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { style: codeStyle, children: JSON.stringify(lastBInbox, null, 2) })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { style: panelStyle, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Run log" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { style: codeStyle, children: JSON.stringify(
        logs.map((item) => ({
          ...item,
          status: item.ok === false ? "failed" : "ok"
        })),
        null,
        2
      ) })
    ] })
  ] }) });
}
export {
  AgentEmailE2EPage as default
};
