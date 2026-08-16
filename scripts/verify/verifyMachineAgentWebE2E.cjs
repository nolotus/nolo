#!/usr/bin/env node

const { spawn } = require("node:child_process");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const {
  closeTarget,
  createCdpPage,
  fetchJson,
  navigate,
  openRawCdp,
  readCdpVersion,
  sleep,
  waitForHttpOk,
} = require("../probes/helpers/rawCdpClient.cjs");

const TEST_TOKEN =
  "eyJ1c2VySWQiOiJiMmUwNmY4MDFmIiwidXNlcm5hbWUiOiJwbGF0Zm9ybS1kZW1vIiwiZXhwIjoxODA2NjU0OTU0fQ==.FZN_V_kOlnYkQsuPT4v8B2OAD3n-tkhnbfO8mwGi3pq8ZsV8qvuRxCyC8YY3keNjrbhCtQe_A0t3UCrBa1G1Bg";

const LIVE_BASE = readArg("--server", process.env.MACHINE_AGENT_WEB_E2E_BASE || "https://us.nolo.chat").replace(/\/+$/, "");
const RUN_LIVE = process.env.RUN_MACHINE_AGENT_WEB_E2E === "1" || process.argv.includes("--live");
const TARGET_MACHINE_NAME = readArg("--machine-name", process.env.MACHINE_AGENT_WEB_E2E_MACHINE_NAME || "DESKTOP-RLLMCB9");
const TARGET_PROVIDER = readArg("--provider", process.env.MACHINE_AGENT_WEB_E2E_PROVIDER || "copilot");
const AUTH_TOKEN = process.env.AUTH_TOKEN || process.env.NOLO_AUTH_TOKEN || TEST_TOKEN;
const CHROME_PATH =
  readArg("--chrome", process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe");
const CDP_HTTP = readArg(
  "--cdp-http",
  process.env.MACHINE_AGENT_WEB_E2E_CDP_HTTP || `http://127.0.0.1:${49000 + Math.floor(Math.random() * 999)}`,
).replace(/\/+$/, "");
const PROVIDER_CAPABILITY = {
  copilot: "copilot-cli",
  codex: "codex-cli",
  claude: "claude-code",
  gemini: "gemini-cli",
};
const PROVIDER_LABEL = {
  copilot: "Copilot",
  codex: "Codex",
  claude: "Claude",
  gemini: "Gemini",
};

function readArg(name, fallback = "") {
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function assertLiveEnabled() {
  if (RUN_LIVE) return;
  throw new Error("Live browser E2E is disabled. Set RUN_MACHINE_AGENT_WEB_E2E=1 or pass --live.");
}

function parseToken(token) {
  try {
    const [payloadBase64] = token.split(".");
    return JSON.parse(Buffer.from(payloadBase64, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function requireUser() {
  const user = parseToken(AUTH_TOKEN);
  if (!user || typeof user.userId !== "string") {
    throw new Error("Unable to parse userId from AUTH_TOKEN.");
  }
  return user;
}

function createPrivateAgentKey(userId, agentId) {
  return `agent-${userId}-${agentId}`;
}

function extractCustomId(dbKey) {
  return String(dbKey || "").split("-").at(-1) || "";
}

async function apiGet(url) {
  const response = await fetchJson(url, {
    headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
  });
  if (!response.ok) {
    throw new Error(`GET ${url} failed: HTTP ${response.status} ${JSON.stringify(response.data)}`);
  }
  return response.data;
}

async function apiPost(url, body) {
  const response = await fetchJson(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`POST ${url} failed: HTTP ${response.status} ${JSON.stringify(response.data)}`);
  }
  return response.data;
}

async function queryOwnedAgents(userId) {
  const data = await apiPost(`${LIVE_BASE}/api/v1/db/query/${encodeURIComponent(userId)}`, { type: "agent" });
  return Array.isArray(data?.data?.data) ? data.data.data : [];
}

async function readMessages(dialogId) {
  const data = await apiPost(`${LIVE_BASE}/rpc/getConvMsgs`, { dialogId, limit: 30 });
  return Array.isArray(data) ? data : Array.isArray(data?.messages) ? data.messages : [];
}

async function ensureChromeCdp() {
  if (await waitForHttpOk(`${CDP_HTTP}/json/version`, 1000)) {
    return { stop: async () => undefined };
  }

  const port = new URL(CDP_HTTP).port;
  const profileDir = mkdtempSync(join(tmpdir(), "nolo-machine-agent-web-e2e-"));
  const child = spawn(
    CHROME_PATH,
    [
      "--remote-debugging-address=127.0.0.1",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profileDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--disable-background-networking",
      process.argv.includes("--headed") ? "" : "--headless=new",
      "about:blank",
    ].filter(Boolean),
    { detached: false, stdio: "ignore" },
  );

  const ready = await waitForHttpOk(`${CDP_HTTP}/json/version`, 30_000);
  if (!ready) {
    child.kill("SIGKILL");
    throw new Error(`Chrome CDP did not become ready at ${CDP_HTTP}`);
  }

  return {
    stop: async () => {
      child.kill("SIGKILL");
      await sleep(500);
      rmSync(profileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 250 });
    },
  };
}

async function evalPage(cdp, sessionId, expression, timeoutMs = 30_000) {
  const response = await cdp.send(
    "Runtime.evaluate",
    {
      expression,
      awaitPromise: true,
      returnByValue: true,
    },
    sessionId,
    timeoutMs,
  );
  const result = response.result || {};
  if (result.exceptionDetails) {
    throw new Error(`Runtime.evaluate failed: ${JSON.stringify(result.exceptionDetails)}`);
  }
  return result.result?.value;
}

async function waitFor(cdp, sessionId, expression, timeoutMs = 30_000) {
  const startedAt = Date.now();
  let lastValue = null;
  while (Date.now() - startedAt < timeoutMs) {
    lastValue = await evalPage(cdp, sessionId, `Boolean(${expression})`, timeoutMs).catch((error) => String(error));
    if (lastValue === true) return;
    await sleep(500);
  }
  throw new Error(`Timed out waiting for expression: ${expression}; last=${String(lastValue)}`);
}

async function navigateAndWait(cdp, sessionId, url) {
  await navigate(cdp, sessionId, url);
  await waitFor(cdp, sessionId, "document.readyState === 'complete' || document.readyState === 'interactive'", 30_000);
}

async function installAuth(cdp, sessionId, user) {
  await cdp.send(
    "Page.addScriptToEvaluateOnNewDocument",
    {
      source: `
        (() => {
          const token = ${JSON.stringify(AUTH_TOKEN)};
          const user = ${JSON.stringify(user)};
          const base = ${JSON.stringify(LIVE_BASE)};
          localStorage.setItem("tokens", JSON.stringify([token]));
          localStorage.setItem("nolo-theme-mode", "light");
          const prev = window.__PRELOADED_STATE__ || {};
          window.__PRELOADED_STATE__ = {
            ...prev,
            auth: {
              ...(prev.auth || {}),
              currentUser: user,
              users: [user],
              isLoggedIn: true,
              currentToken: token,
              isLoading: false,
            },
            settings: {
              ...(prev.settings || {}),
              currentServer: base,
              syncServers: [base],
            },
          };
        })();
      `,
    },
    sessionId,
  );
}

async function clickCreateAgentFromSettings(cdp, sessionId, machineName) {
  const providerLabelPattern = PROVIDER_LABEL[TARGET_PROVIDER] || TARGET_PROVIDER;
  await evalPage(
    cdp,
    sessionId,
    `
      (() => {
        const providerLabelPattern = new RegExp(${JSON.stringify(providerLabelPattern)}, "i");
        const card = [...document.querySelectorAll(".desktop-machine")]
          .find((node) => node.textContent && node.textContent.includes(${JSON.stringify(machineName)}));
        if (!card) throw new Error("machine card not found");
        const panel = [...card.querySelectorAll(".desktop-machine-agent")]
          .find((node) => providerLabelPattern.test(node.textContent || ""));
        if (!panel) throw new Error(${JSON.stringify(`${providerLabelPattern} panel not found`)});
        const button = [...panel.querySelectorAll("button")]
          .find((node) => /创建 AI|Create AI/i.test(node.textContent || ""));
        if (!button) throw new Error("create AI button not found");
        button.click();
        return true;
      })()
    `,
  );
}

function createAgentButtonExpression(machineName) {
  const providerLabelPattern = PROVIDER_LABEL[TARGET_PROVIDER] || TARGET_PROVIDER;
  return `
    (() => {
      const providerLabelPattern = new RegExp(${JSON.stringify(providerLabelPattern)}, "i");
      const card = [...document.querySelectorAll(".desktop-machine")]
        .find((node) => node.textContent && node.textContent.includes(${JSON.stringify(machineName)}));
      if (!card) return false;
      const panel = [...card.querySelectorAll(".desktop-machine-agent")]
        .find((node) => providerLabelPattern.test(node.textContent || ""));
      if (!panel) return false;
      return [...panel.querySelectorAll("button")]
        .some((node) => /创建 AI|Create AI/i.test(node.textContent || ""));
    })()
  `;
}

async function fillInput(cdp, sessionId, selector, value) {
  await evalPage(
    cdp,
    sessionId,
    `
      (() => {
        const input = document.querySelector(${JSON.stringify(selector)});
        if (!input) throw new Error("input not found: " + ${JSON.stringify(selector)});
        const setter = Object.getOwnPropertyDescriptor(input.constructor.prototype, "value")?.set
          || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
          || Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
        setter.call(input, ${JSON.stringify(value)});
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      })()
    `,
  );
}

async function clickSelector(cdp, sessionId, selector) {
  await evalPage(
    cdp,
    sessionId,
    `
      (() => {
        const element = document.querySelector(${JSON.stringify(selector)});
        if (!element) throw new Error("click target not found: " + ${JSON.stringify(selector)});
        element.click();
        return true;
      })()
    `,
  );
}

async function readCreateFormDiagnostics(cdp, sessionId) {
  return evalPage(
    cdp,
    sessionId,
    `(() => ({
      href: location.href,
      title: document.title,
      activeTab: document.querySelector(".tabs-nav .active, .tabs-nav .is-active")?.textContent || "",
      inputs: [...document.querySelectorAll(".create-agent-container input, .create-agent-container textarea, .create-agent-container select")]
        .map((node) => ({
          tag: node.tagName,
          type: node.getAttribute("type") || "",
          name: node.getAttribute("name") || "",
          value: node.value || "",
          disabled: Boolean(node.disabled),
          placeholder: node.getAttribute("placeholder") || "",
        })),
      buttons: [...document.querySelectorAll(".create-agent-container button")]
        .map((node) => ({
          type: node.getAttribute("type") || "",
          text: node.textContent?.trim() || "",
          disabled: Boolean(node.disabled),
          className: node.className || "",
        })),
      alerts: [...document.querySelectorAll('[role="alert"], .error, .input-helper.error')]
        .map((node) => node.textContent?.trim())
        .filter(Boolean),
      body: document.body?.innerText?.slice(0, 2000) || "",
    }))`,
  );
}

async function readDialogDiagnostics(cdp, sessionId, dialogId) {
  const raw = await evalPage(
    cdp,
    sessionId,
    `(() => JSON.stringify({
      href: location.href,
      title: document.title,
      input: (() => {
        const node = document.querySelector(".message-input__textarea");
        return node ? {
          value: node.value || "",
          disabled: Boolean(node.disabled),
          placeholder: node.getAttribute("placeholder") || "",
        } : null;
      })(),
      sendButton: (() => {
        const node = document.querySelector(".send-button.send-mode");
        return node ? {
          text: node.textContent?.trim() || "",
          disabled: Boolean(node.disabled),
          className: node.className || "",
        } : null;
      })(),
      bodyTail: (document.body?.innerText || "").slice(-3000),
    }))()`,
  );
  const page = JSON.parse(raw || "{}");
  const messages = await readMessages(dialogId).catch((error) => ({
    readMessagesError: error instanceof Error ? error.message : String(error),
  }));
  const interestingEvents = cdp.events
    .filter((event) => {
      const method = event?.method || "";
      const params = event?.params || {};
      const url = params?.request?.url || params?.response?.url || "";
      if (method === "Runtime.consoleAPICalled" || method === "Log.entryAdded") return true;
      if (method.startsWith("Network.") && /\/api\/agent\/run|\/api\/cli\/chat|\/rpc\/getConvMsgs|\/api\/v1\/db\//.test(url)) return true;
      return false;
    })
    .slice(-80)
    .map((event) => {
      const method = event?.method || "";
      const params = event?.params || {};
      if (method === "Runtime.consoleAPICalled") {
        return {
          method,
          type: params.type,
          args: (params.args || []).map((arg) => arg.value || arg.description || arg.className || arg.type),
        };
      }
      if (method === "Log.entryAdded") {
        return {
          method,
          level: params.entry?.level,
          text: params.entry?.text,
          url: params.entry?.url,
        };
      }
      return {
        method,
        requestId: params.requestId,
        url: params.request?.url || params.response?.url,
        status: params.response?.status,
        type: params.type,
      };
    });
  return { page, messages, cdpEvents: interestingEvents };
}

async function waitForCreatedBoundAgent({ userId, name, machineId }) {
  const startedAt = Date.now();
  let lastCount = 0;
  while (Date.now() - startedAt < 30_000) {
    const records = await queryOwnedAgents(userId);
    lastCount = records.length;
    const match = records.find(
      (record) =>
        record?.name === name &&
        record?.apiSource === "cli" &&
        record?.cliProvider === TARGET_PROVIDER &&
        record?.runtimeBinding?.machineId === machineId,
    );
    if (match?.id) return String(match.id);
    await sleep(1000);
  }
  throw new Error(`Created bound agent was not found after query; scanned agents=${lastCount}`);
}

async function waitForPersistedMachineResponse(dialogId) {
  const startedAt = Date.now();
  let lastMessages = [];
  while (Date.now() - startedAt < 30_000) {
    lastMessages = await readMessages(dialogId);
    const joined = JSON.stringify(lastMessages);
    if (/\.nolo\\\\daemon|machine-id|daemon\.pid/.test(joined)) return;
    await sleep(1000);
  }
  throw new Error(`Machine response was not persisted: ${JSON.stringify(lastMessages).slice(0, 1000)}`);
}

function messageText(message) {
  const content = message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (part && typeof part === "object" && typeof part.text === "string") return part.text;
      return JSON.stringify(part);
    }).join("\n");
  }
  return content == null ? "" : JSON.stringify(content);
}

async function assertPersistedDialogIntegrity(dialogId, marker) {
  const messages = await readMessages(dialogId);
  const roles = messages.map((message) => message?.role);
  const ids = messages.map((message) => message?.id || message?.dbKey).filter(Boolean);
  const uniqueIds = new Set(ids);
  const userMessages = messages.filter((message) => message?.role === "user");
  const assistantMessages = messages.filter((message) => message?.role === "assistant");
  const joined = messages.map(messageText).join("\n");

  if (messages.length !== 3 || userMessages.length !== 1 || assistantMessages.length !== 2) {
    throw new Error(`Unexpected persisted message roles: ${JSON.stringify({ count: messages.length, roles })}`);
  }
  if (ids.length !== uniqueIds.size) {
    throw new Error(`Duplicate persisted message ids: ${JSON.stringify(ids)}`);
  }
  if (!messageText(userMessages[0]).includes(marker)) {
    throw new Error(`Persisted user message lost marker ${marker}: ${JSON.stringify(userMessages[0])}`);
  }
  if (!/\.nolo\\\\daemon|machine-id|daemon\.pid/.test(joined)) {
    throw new Error(`Persisted assistant message does not contain machine response: ${JSON.stringify(messages).slice(0, 1000)}`);
  }

  return { count: messages.length, roles };
}

function assertMachineRunNetworkRouting(cdp) {
  const urls = cdp.events
    .filter((event) => String(event?.method || "").startsWith("Network."))
    .map((event) => event?.params?.request?.url || event?.params?.response?.url || "")
    .filter(Boolean);
  const sawAgentRun = urls.some((url) => url.includes("/api/agent/run"));
  const sawLegacyCliChat = urls.some((url) => url.includes("/api/cli/chat"));
  if (!sawAgentRun) {
    throw new Error(`Expected /api/agent/run request was not observed: ${JSON.stringify(urls.slice(-40))}`);
  }
  if (sawLegacyCliChat) {
    throw new Error(`Legacy /api/cli/chat request was observed: ${JSON.stringify(urls.filter((url) => url.includes("/api/cli/chat")))}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} mismatch: expected ${String(expected)}, got ${String(actual)}`);
  }
}

async function main() {
  assertLiveEnabled();
  const user = requireUser();
  const requiredCapability = PROVIDER_CAPABILITY[TARGET_PROVIDER];
  if (!requiredCapability) throw new Error(`Unsupported provider: ${TARGET_PROVIDER}`);

  const machinesJson = await apiGet(`${LIVE_BASE}/api/machines`);
  const machines = Array.isArray(machinesJson.machines) ? machinesJson.machines : [];
  const machine = machines.find(
    (item) =>
      item.name === TARGET_MACHINE_NAME &&
      item.status === "online" &&
      item.connectorStatus === "connected" &&
      Array.isArray(item.capabilities) &&
      item.capabilities.includes(requiredCapability),
  );
  if (!machine) {
    throw new Error(`No connected ${requiredCapability} machine named ${TARGET_MACHINE_NAME}. Available: ${JSON.stringify(machines)}`);
  }

  const chrome = await ensureChromeCdp();
  let cdp = null;
  let targetId = "";
  try {
    const { webSocketDebuggerUrl } = await readCdpVersion(CDP_HTTP);
    cdp = await openRawCdp(webSocketDebuggerUrl, { timeoutMs: 30_000 });
    const page = await createCdpPage(cdp, "about:blank");
    targetId = page.targetId;
    const { sessionId } = page;
    await cdp.send("Log.enable", {}, sessionId).catch(() => undefined);
    await cdp.send("Network.enable", {}, sessionId).catch(() => undefined);
    await installAuth(cdp, sessionId, user);

    await navigateAndWait(cdp, sessionId, `${LIVE_BASE}/setting/machines`);
    await waitFor(cdp, sessionId, "document.querySelector('.desktop-machines-page')");
    await waitFor(cdp, sessionId, `document.body.innerText.includes(${JSON.stringify(TARGET_MACHINE_NAME)})`);
    await waitFor(cdp, sessionId, createAgentButtonExpression(TARGET_MACHINE_NAME), 30_000);
    await clickCreateAgentFromSettings(cdp, sessionId, TARGET_MACHINE_NAME);
    await waitFor(cdp, sessionId, "location.pathname === '/create/agent' && location.search.includes('machineId=')");

    const createState = await evalPage(
      cdp,
      sessionId,
      `({
        apiSource: new URL(location.href).searchParams.get("apiSource"),
        cliProvider: new URL(location.href).searchParams.get("cliProvider"),
        machineId: new URL(location.href).searchParams.get("machineId"),
      })`,
    );
    assertEqual(createState.apiSource, "cli", "create apiSource");
    assertEqual(createState.cliProvider, TARGET_PROVIDER, "create cliProvider");
    assertEqual(createState.machineId, machine.machineId, "create machineId");

    const agentName = `PW ${TARGET_MACHINE_NAME} ${TARGET_PROVIDER} ${Date.now().toString(36)}`;
    await waitFor(cdp, sessionId, "document.querySelector('.create-agent-container input:not([type=file])')");
    await fillInput(cdp, sessionId, ".create-agent-container input:not([type='file'])", agentName);
    await clickSelector(cdp, sessionId, ".create-agent-container form button[type='submit']");
    try {
      await waitFor(cdp, sessionId, "location.pathname.split('/').some((part) => part.startsWith('dialog-'))", 45_000);
    } catch (error) {
      const diagnostics = await readCreateFormDiagnostics(cdp, sessionId).catch((diagError) => ({
        diagnosticError: diagError instanceof Error ? diagError.message : String(diagError),
      }));
      throw new Error(`${error.message}\ncreateFormDiagnostics=${JSON.stringify(diagnostics, null, 2)}`);
    }

    const createdDialogPath = await evalPage(cdp, sessionId, "location.pathname");
    const createdDialogKey = decodeURIComponent(createdDialogPath.split("/").filter(Boolean).at(-1) || "");
    const createdDialogId = extractCustomId(createdDialogKey);
    if (!createdDialogKey.startsWith("dialog-") || !createdDialogId) {
      throw new Error(`Unexpected dialog URL after agent creation: ${createdDialogPath}`);
    }

    const agentId = await waitForCreatedBoundAgent({
      userId: user.userId,
      name: agentName,
      machineId: machine.machineId,
    });
    const agentKey = createPrivateAgentKey(user.userId, agentId);

    await navigateAndWait(cdp, sessionId, `${LIVE_BASE}/${agentKey}`);
    await waitFor(cdp, sessionId, `document.body.innerText.includes(${JSON.stringify(agentName)})`);
    await waitFor(cdp, sessionId, "document.body.innerText.includes('远程电脑')");
    await waitFor(cdp, sessionId, `document.body.innerText.includes(${JSON.stringify(machine.machineId)})`);

    await navigateAndWait(cdp, sessionId, `${LIVE_BASE}/${createdDialogKey}`);

    const marker = Date.now().toString(36);
    const taskText = `请只用 JSON 返回当前工作目录 cwd 和最多 5 个文件名。marker=${marker}`;
    await waitFor(cdp, sessionId, "document.querySelector('.message-input__textarea')");
    await fillInput(cdp, sessionId, ".message-input__textarea", taskText);
    await clickSelector(cdp, sessionId, ".send-button.send-mode");
    try {
      await waitFor(cdp, sessionId, "/\\.nolo\\\\daemon|machine-id|daemon\\.pid/.test(document.body.innerText)", 120_000);
    } catch (error) {
      const diagnostics = await readDialogDiagnostics(cdp, sessionId, createdDialogId).catch((diagError) => ({
        diagnosticError: diagError instanceof Error ? diagError.message : String(diagError),
      }));
      throw new Error(`${error.message}\ndialogDiagnostics=${JSON.stringify(diagnostics, null, 2).slice(0, 20000)}`);
    }
    await waitForPersistedMachineResponse(createdDialogId);
    const finalPath = await evalPage(cdp, sessionId, "location.pathname");
    if (!finalPath.endsWith(`/${createdDialogKey}`)) {
      throw new Error(`Dialog changed during machine run: expected ${createdDialogKey}, got ${finalPath}`);
    }
    const messageIntegrity = await assertPersistedDialogIntegrity(createdDialogId, marker);
    assertMachineRunNetworkRouting(cdp);

    console.log(JSON.stringify({
      ok: true,
      server: LIVE_BASE,
      machine: {
        machineId: machine.machineId,
        name: machine.name,
        connectorStatus: machine.connectorStatus,
        capabilities: machine.capabilities,
      },
      agentKey,
      dialogId: createdDialogId,
      messageIntegrity,
    }, null, 2));
  } finally {
    if (cdp && targetId) await closeTarget(cdp, targetId).catch(() => undefined);
    cdp?.close?.();
    await chrome.stop();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
