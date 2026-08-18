#!/usr/bin/env bun

import { normalizeServerOrigin as normalizeBaseUrl } from "core/serverOrigin";
import { apiPost } from "../helpers/apiHelpers";
import { AGENT_EMAIL_REGISTRATION_E2E_PAGE_PATH } from "../../packages/server/handlers/agentEmailRegistrationE2ERoutes";
import {
  isLocalBaseUrl,
  listOwnedAgents,
  resolveAgentWorkspaceContext,
  type ListedAgent,
} from "../helpers/agentWorkspace";
import { runAgentEmailRegistrationE2E } from "../helpers/agentEmailRegistrationE2E";

const argv = process.argv.slice(2);
const getArg = (flag: string) => {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
};
const hasFlag = (flag: string) => argv.includes(flag);

if (hasFlag("--help") || hasFlag("-h")) {
  console.log(`
验证“agent 邮箱身份 + 自托管注册页 + 邮件验证码”整条链路。

用法：
  bun scripts/verifyAgentEmailRegistrationE2E.ts [--agent <agentKey|agentId>] [--server <url>] [--app-url <url>]

选项：
  --agent        指定 agent private key 或裸 agentId；省略时自动取最近更新的 owned agent
  --server       服务器地址；默认沿用现有脚本的 token-first server
  --app-url      注册页地址；默认 <server>/alpha-test/agent-email-registration-e2e
  --username     注册用户名；默认自动生成
  --password     注册密码；默认自动生成且仅本次进程内使用
  --timeout-ms   轮询超时；默认 60000
  --allow-local  允许在 localhost 上跑，仅用于页面/API 调试；真实 inbound 邮件验证默认要求公网 origin
`);
  process.exit(0);
}

function buildGeneratedSuffix() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function requirePublicOrigin(baseUrl: string, allowLocal: boolean) {
  if (allowLocal || !isLocalBaseUrl(baseUrl)) return;
  throw new Error(
    "Real inbound email verification requires a public server origin. Pass --allow-local only when you are debugging the page/API without Cloudflare inbound delivery."
  );
}

function resolveTargetAgent(agents: ListedAgent[], requested?: string) {
  if (!requested?.trim()) return agents[0] ?? null;
  const needle = requested.trim();
  return (
    agents.find((agent) =>
      agent.privateKey === needle ||
      agent.publicKey === needle ||
      agent.id === needle
    ) ?? null
  );
}

async function callRpc<T>(
  baseUrl: string,
  token: string,
  method: string,
  body: Record<string, unknown>
): Promise<T> {
  const response = await apiPost<T>(`${baseUrl}/rpc/${method}`, body, token);
  if (!response.ok) {
    throw new Error(
      `RPC ${method} failed (${response.status}): ${JSON.stringify(response.data)}`
    );
  }
  return response.data;
}

async function callBrowserTool<T>(
  baseUrl: string,
  token: string,
  toolName: string,
  params: Record<string, unknown>
): Promise<T> {
  const response = await apiPost<{ data?: T; error?: string }>(
    `${baseUrl}/api/browser-tool`,
    { toolName, params },
    token
  );
  if (!response.ok) {
    throw new Error(
      `browser tool ${toolName} failed (${response.status}): ${JSON.stringify(response.data)}`
    );
  }
  return response.data?.data as T;
}

async function main() {
  const requestedServer = getArg("--server");
  const requestedAppUrl = getArg("--app-url");
  const requestedAgent = getArg("--agent");
  const allowLocal = hasFlag("--allow-local");
  const timeoutMs = Number(getArg("--timeout-ms") ?? "60000");
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1000) {
    throw new Error("--timeout-ms must be >= 1000");
  }

  const suffix = buildGeneratedSuffix();
  const username = getArg("--username") ?? `agent-e2e-${suffix}`;
  const password = getArg("--password") ?? `AgentE2E-${suffix}-Pass123`;

  const workspace = resolveAgentWorkspaceContext();
  const baseUrl = normalizeBaseUrl(requestedServer || workspace.baseUrl);
  requirePublicOrigin(baseUrl, allowLocal);

  const agents = await listOwnedAgents({ ...workspace, baseUrl });
  if (agents.length === 0) {
    throw new Error("No owned agents found for the current auth token");
  }

  const targetAgent = resolveTargetAgent(agents, requestedAgent);
  if (!targetAgent) {
    throw new Error(
      `Unable to resolve agent ${requestedAgent}. Use --agent <privateKey|agentId> from nolo agent list --json`
    );
  }

  const appUrl =
    requestedAppUrl?.trim() ||
    `${baseUrl}${AGENT_EMAIL_REGISTRATION_E2E_PAGE_PATH}`;

  console.log(
    `[agent-email-e2e] start agent=${targetAgent.privateKey} app=${appUrl} user=${username}`
  );

  const result = await runAgentEmailRegistrationE2E(
    {
      provisionIdentity: async ({ agentId, purpose }) =>
        callRpc<{ emailAddress: string }>(
          baseUrl,
          workspace.authToken,
          "provisionAgentEmailIdentity",
          { agentId, purpose, makePrimary: true }
        ),
      openSession: async (url) => {
        const data = await callBrowserTool<{ sessionId: string }>(
          baseUrl,
          workspace.authToken,
          "browser_openSession",
          { url }
        );
        return data.sessionId;
      },
      typeText: async ({ sessionId, selector, text }) => {
        await callBrowserTool(
          baseUrl,
          workspace.authToken,
          "browser_typeText",
          { sessionId, selector, text }
        );
      },
      click: async ({ sessionId, selector }) => {
        await callBrowserTool(
          baseUrl,
          workspace.authToken,
          "browser_click",
          { sessionId, selector }
        );
      },
      readContent: async ({ sessionId, selector }) => {
        return await callBrowserTool<string>(
          baseUrl,
          workspace.authToken,
          "browser_readContent",
          { sessionId, selector }
        );
      },
      listEmails: async ({ ownerId, mailbox, limit }) =>
        callRpc<any[]>(
          baseUrl,
          workspace.authToken,
          "listEmails",
          { ownerId, mailbox, limit }
        ),
      sleep: Bun.sleep,
    },
    {
      agentId: targetAgent.privateKey,
      appUrl,
      username,
      password,
      timeoutMs,
    }
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        server: baseUrl,
        appUrl,
        agent: {
          id: targetAgent.id,
          privateKey: targetAgent.privateKey,
          name: targetAgent.name,
        },
        result: {
          emailAddress: result.emailAddress,
          registrationId: result.registrationId,
          verificationCode: result.verificationCode,
          verified: result.verified,
          username: result.username,
          verificationEmailKey: result.verificationEmail.dbKey,
        },
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.stack || error.message : String(error)
  );
  process.exit(1);
});
