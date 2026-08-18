#!/usr/bin/env bun

import {
  deleteRecord,
  runAgent,
  writeRecord,
} from "../helpers/agentHelpers";
import { readAgentRecord } from "../helpers/agentDataHelpers";
import {
  parseUserIdFromAuthToken,
  resolveAuthToken,
} from "../helpers/authContext";
import {
  buildPlaywrightAuthBootstrap,
  installPlaywrightAuthBootstrap,
} from "../helpers/playwrightAuth";
import { parsePositiveFiniteNumberOrFallback } from "core/positiveFiniteNumberOrFallback";
import { normalizeServerOrigin as normalizeBaseUrl } from "core/serverOrigin";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const DEFAULT_SERVER = "https://alpha-a.nolo.chat";
const DEFAULT_AGENT_ID = "WEBHOSTEDEXECPROBE20260613";
const MARKER = "hosted runtime ok";

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasFlag(name: string) {
  return process.argv.includes(name);
}

function jsonPreview(value: unknown, max = 800) {
  return JSON.stringify(value, null, 2).slice(0, max);
}

function readNumberArg(name: string, fallback: number) {
  return parsePositiveFiniteNumberOrFallback(readArg(name), fallback);
}

async function readDialog(args: {
  baseUrl: string;
  authToken: string;
  userId: string;
  dialogId: string;
}) {
  const dbKey = `dialog-${args.userId}-${args.dialogId}`;
  const dialogResponse = await fetch(
    `${args.baseUrl}/api/v1/db/read/${encodeURIComponent(dbKey)}`,
    {
      headers: { Authorization: `Bearer ${args.authToken}` },
    },
  );
  if (!dialogResponse.ok) {
    throw new Error(
      `read dialog failed: HTTP ${dialogResponse.status} ${await dialogResponse.text()}`,
    );
  }
  const dialogJson = await dialogResponse.json() as any;
  const dialog = dialogJson?.data ?? dialogJson;

  const messagesResponse = await fetch(`${args.baseUrl}/rpc/getConvMsgs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.authToken}`,
    },
    body: JSON.stringify({
      dialogId: args.dialogId,
      limit: 50,
    }),
  });
  if (!messagesResponse.ok) {
    throw new Error(
      `read dialog messages failed: HTTP ${messagesResponse.status} ${await messagesResponse.text()}`,
    );
  }
  const messagesJson = await messagesResponse.json() as any;
  const messages = Array.isArray(messagesJson)
    ? messagesJson
    : Array.isArray(messagesJson?.items)
    ? messagesJson.items.map((item: any) => item?.data ?? item).filter(Boolean)
    : Array.isArray(messagesJson?.data)
      ? messagesJson.data
      : [];

  return { dialog, messages };
}

async function waitForDialogDone(args: {
  baseUrl: string;
  authToken: string;
  userId: string;
  dialogId: string;
  timeoutMs: number;
}) {
  const startedAt = Date.now();
  let last: Awaited<ReturnType<typeof readDialog>> | null = null;
  while (Date.now() - startedAt < args.timeoutMs) {
    last = await readDialog(args);
    const status = last.dialog?.runtimeCheckpoint?.status ?? last.dialog?.status;
    const workspaceLease =
      last.dialog?.runtimeCheckpoint?.runtimeBinding?.workspaceLease;
    if (status === "done" && workspaceLease?.source === "web-hosted") {
      return last;
    }
    if (status === "failed") {
      throw new Error(`background dialog failed: ${jsonPreview(last.dialog)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(
    `Timed out waiting for dialog ${args.dialogId} to finish. Last dialog: ${jsonPreview(last?.dialog)}`,
  );
}

async function waitForPageText(args: {
  page: import("playwright").Page;
  expected: string[];
  timeoutMs: number;
}) {
  const startedAt = Date.now();
  let lastText = "";
  while (Date.now() - startedAt < args.timeoutMs) {
    lastText = await args.page.locator("body").innerText().catch(() => "");
    if (args.expected.every((item) => lastText.includes(item))) return lastText;
    await args.page.waitForTimeout(500);
  }
  throw new Error(
    `AgentPage did not show expected evidence text: ${args.expected.join(", ")}. Body preview: ${lastText.slice(0, 1600)}`,
  );
}

async function captureAgentPageEvidence(args: {
  baseUrl: string;
  authToken: string;
  agentKey: string;
  screenshotPath: string;
  timeoutMs: number;
}) {
  const { chromium } = await import("playwright");
  await mkdir(dirname(args.screenshotPath), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    await installPlaywrightAuthBootstrap(
      page,
      buildPlaywrightAuthBootstrap(args.authToken, {
        currentServer: args.baseUrl,
        syncServers: [],
      }),
    );
    await page.goto(`${args.baseUrl}/${args.agentKey}`, {
      waitUntil: "domcontentloaded",
      timeout: args.timeoutMs,
    });
    await page.waitForLoadState("networkidle", { timeout: args.timeoutMs }).catch(() => {});
    await page
      .locator("details.agent-page__ability-proof-advanced")
      .waitFor({ state: "visible", timeout: args.timeoutMs });
    await page.locator("details.agent-page__ability-proof-advanced").evaluate((node) => {
      (node as HTMLDetailsElement).open = true;
    });
    const bodyText = await waitForPageText({
      page,
      timeoutMs: args.timeoutMs,
      expected: [
        "托管执行授权",
        "已允许 Alpha 托管临时工作区执行脚本/命令。",
        "运行证据",
        "托管临时工作区",
        "execShell",
        "查看完整对话证据",
      ],
    });
    await page.screenshot({ path: args.screenshotPath, fullPage: true });
    return {
      screenshotPath: args.screenshotPath,
      evidenceTextPreview: bodyText
        .split("\n")
        .filter((line) =>
          /托管执行授权|运行证据|托管临时工作区|execShell|查看完整对话证据/.test(line),
        )
        .slice(0, 12),
    };
  } finally {
    await browser.close();
  }
}

function parseToolContent(message: any) {
  const raw = typeof message?.content === "string"
    ? message.content
    : JSON.stringify(message?.content ?? null);
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function verifyPersistedHostedExecPolicy(persistedAgent: any) {
  const policy = persistedAgent.runtimeToolPolicy;
  if (!Array.isArray(policy?.runtimeTools) || !policy.runtimeTools.includes("execShell")) {
    throw new Error(
      `Expected persisted agent runtimeToolPolicy.runtimeTools to include execShell, got ${jsonPreview(policy)}`,
    );
  }
  if (policy?.workspace?.mode !== "lease") {
    throw new Error(
      `Expected persisted agent runtimeToolPolicy.workspace.mode=lease, got ${jsonPreview(policy)}`,
    );
  }
  return policy;
}

const baseUrl = normalizeBaseUrl(
  readArg("--server") ??
    readArg("--base") ??
    process.env.NOLO_SERVER ??
    process.env.BASE_URL ??
    DEFAULT_SERVER,
);
const agentId = readArg("--agent-id") ?? DEFAULT_AGENT_ID;
const keepAgent = hasFlag("--keep-agent");
const verifyAgentPage = hasFlag("--verify-agent-page");
const screenshotPath =
  readArg("--screenshot") ??
  "test-results/frontend-agent/web-hosted-exec-runtime-agent-page.png";
const timeoutMs = readNumberArg("--timeout-ms", 180_000);
const authToken = resolveAuthToken({
  extraEnvKeys: ["NOLO_AUTH_TOKEN", "NOLO_TOKEN"],
  includeTestFallback: false,
});

if (!authToken) {
  throw new Error("Missing auth token. Set AUTH_TOKEN, NOLO_AUTH_TOKEN, or login with the Nolo CLI profile.");
}

const userId = parseUserIdFromAuthToken(authToken);
if (!userId) {
  throw new Error("Unable to parse userId from auth token.");
}

const agentKey = `agent-${userId}-${agentId}`;
const now = new Date().toISOString();
const agentRecord = {
  type: "agent",
  id: agentId,
  dbKey: agentKey,
  userId,
  name: "Alpha Web Hosted Exec Probe",
  introduction: "Private alpha probe for web-hosted exec runtime.",
  prompt: [
    "You are an alpha hosted execution probe.",
    "For every user request, call execShell exactly once.",
    `Use bash to create hello.txt with the exact text ${MARKER}, then print pwd, print the file content, and stop.`,
    "Do not call any other tools.",
  ].join(" "),
  provider: "deepinfra",
  model: "moonshotai/Kimi-K2.6",
  isPublic: false,
  tools: ["execShell"],
  runtimeToolPolicy: {
    version: 1,
    runtimeTools: ["execShell"],
    workspace: { mode: "lease" },
    shell: { enabled: true, maxOutputBytes: 4000 },
  },
  createdAt: now,
  updatedAt: now,
};

try {
  await writeRecord(baseUrl, userId, authToken, agentKey, agentRecord);
  const persistedAgent = await readAgentRecord({
    baseUrl,
    agentKey,
    authToken,
  });
  const persistedPolicy = verifyPersistedHostedExecPolicy(persistedAgent);

  const run = await runAgent(
    baseUrl,
    authToken,
    agentKey,
    "Run the hosted execution probe now.",
    undefined,
    {
      category: "web-hosted-exec-runtime-probe",
      background: true,
    },
  );
  const evidenceBaseUrl = normalizeBaseUrl(run.serverBase ?? baseUrl);

  const { dialog, messages } = await waitForDialogDone({
    baseUrl: evidenceBaseUrl,
    authToken,
    userId,
    dialogId: run.dialogId,
    timeoutMs,
  });

  const runtimeBinding = dialog?.runtimeCheckpoint?.runtimeBinding ?? {};
  const workspaceLease = runtimeBinding.workspaceLease;
  const toolMessages = messages.filter(
    (message: any) => message?.role === "tool" || message?.type === "tool",
  );
  const execShellMessage = toolMessages.find(
    (message: any) => message?.name === "execShell" || message?.toolName === "execShell",
  ) ?? toolMessages[0];
  const toolContent = parseToolContent(execShellMessage);
  const toolOutput = typeof toolContent === "string"
    ? toolContent
    : typeof toolContent?.content === "string"
      ? toolContent.content
      : jsonPreview(toolContent);

  if (workspaceLease?.source !== "web-hosted") {
    throw new Error(
      `Expected workspaceLease.source=web-hosted, got ${jsonPreview(workspaceLease)}`,
    );
  }
  if (toolContent?.source !== "web-hosted") {
    throw new Error(`Expected execShell tool source=web-hosted, got ${jsonPreview(toolContent)}`);
  }
  if (toolContent?.ok !== true || toolContent?.exitCode !== 0) {
    throw new Error(`Expected successful execShell result, got ${jsonPreview(toolContent)}`);
  }
  if (!toolOutput.includes(MARKER)) {
    throw new Error(`Expected execShell output to include ${MARKER}, got ${toolOutput.slice(0, 500)}`);
  }

  const agentPageEvidence = verifyAgentPage
    ? await captureAgentPageEvidence({
        baseUrl: evidenceBaseUrl,
        authToken,
        agentKey,
        screenshotPath,
        timeoutMs: Math.min(timeoutMs, 60_000),
      })
    : null;

  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    evidenceBaseUrl,
    agentKey,
    dialogId: run.dialogId,
    persistedPolicy: {
      runtimeTools: persistedPolicy.runtimeTools,
      workspaceMode: persistedPolicy.workspace?.mode,
    },
    workspaceLease: {
      id: workspaceLease.id,
      source: workspaceLease.source,
      workspaceRoot: typeof workspaceLease.workspaceRoot === "string"
        ? workspaceLease.workspaceRoot.replace(/\/tmp\/nolo-hosted-workspaces\/[^/]+/, "/tmp/nolo-hosted-workspaces/<run>")
        : workspaceLease.workspaceRoot,
    },
    tool: {
      name: "execShell",
      source: toolContent.source,
      exitCode: toolContent.exitCode,
      markerDetected: true,
    },
    ...(agentPageEvidence ? { agentPageEvidence } : {}),
  }, null, 2));
} finally {
  if (!keepAgent) {
    await deleteRecord(baseUrl, userId, authToken, agentKey).catch(() => "missing");
  }
}
