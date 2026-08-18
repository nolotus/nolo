#!/usr/bin/env bun

import {
  parseUserIdFromAuthToken,
  resolveAuthToken,
} from "../helpers/authContext";

function getArg(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function deterministicId(prefix: string, seed: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index);
    hash = (hash * 0x01000193) >>> 0;
  }
  const suffix = hash.toString(36).toUpperCase().padStart(14, "0");
  return (prefix + suffix).slice(0, 26);
}

async function writeRecord(
  baseUrl: string,
  userId: string,
  authToken: string,
  customKey: string,
  data: Record<string, any>
) {
  const response = await fetch(`${baseUrl}/api/v1/db/write/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      data: { ...data, dbKey: customKey },
      customKey,
      userId,
    }),
  });
  if (!response.ok) {
    throw new Error(`write ${customKey} failed: HTTP ${response.status} ${await response.text()}`);
  }
}

async function runAgent(args: {
  baseUrl: string;
  authToken: string;
  agentKey: string;
  userInput: string;
}) {
  const response = await fetch(`${args.baseUrl}/api/agent/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.authToken}`,
    },
    body: JSON.stringify({
      agentKey: args.agentKey,
      userInput: args.userInput,
      runtimeContext: {
        surface: "server-script",
        host: "script",
        runtime: "bun",
        entrypoint: "scripts/verify/verifyMachineAgentRunE2E.ts",
        capabilities: ["non-interactive"],
      },
      stream: false,
      category: "machine-agent-e2e",
    }),
  });
  if (!response.ok) {
    throw new Error(`agent run failed: HTTP ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as { dialogId?: string; content?: string };
}

const server = getArg("--server") ?? "https://us.nolo.chat";
const machineIdArg = getArg("--machine-id");
const provider = (getArg("--provider") ?? "copilot").trim();
const agentRunEndpoint = "/api/agent/run";
const prompt =
  getArg("--msg") ??
  "Reply with the current working directory and list up to five files you can see.";

const capabilityByProvider: Record<string, string> = {
  codex: "codex-cli",
  copilot: "copilot-cli",
  claude: "claude-code",
  gemini: "gemini-cli",
  agy: "agy-cli",
  qoder: "qoder-cli",
  opencode: "opencode-cli",
  grok: "grok-cli",
};

const requiredCapability = capabilityByProvider[provider];
if (!requiredCapability) {
  throw new Error(`Unsupported provider: ${provider}`);
}

const authToken = resolveAuthToken({
  extraEnvKeys: ["NOLO_AUTH_TOKEN", "NOLO_TOKEN"],
  includeTestFallback: false,
});
if (!authToken) {
  throw new Error("Missing auth token. Set AUTH_TOKEN or NOLO_AUTH_TOKEN.");
}

const userId = parseUserIdFromAuthToken(authToken);
if (!userId) {
  throw new Error("Unable to parse userId from auth token.");
}

const machinesResponse = await fetch(`${server}/api/machines`, {
  headers: { Authorization: `Bearer ${authToken}` },
});
if (!machinesResponse.ok) {
  throw new Error(
    `machines request failed: HTTP ${machinesResponse.status} ${await machinesResponse.text()}`
  );
}

const machinesJson = (await machinesResponse.json()) as any;
const machines = Array.isArray(machinesJson?.machines) ? machinesJson.machines : [];
const candidateMachines = machines.filter(
  (item: any) =>
    (!machineIdArg || item?.machineId === machineIdArg) &&
    item?.status === "online" &&
    item?.connectorStatus === "connected" &&
    Array.isArray(item?.capabilities) &&
    item.capabilities.includes(requiredCapability)
);
const machine = candidateMachines[0];

if (!machine) {
  throw new Error(
    `No online connected machine with ${requiredCapability}. Available: ${JSON.stringify(
      machines.map((item: any) => ({
        machineId: item.machineId,
        name: item.name,
        status: item.status,
        connectorStatus: item.connectorStatus,
        capabilities: item.capabilities,
      })),
      null,
      2
    )}`
  );
}

const agentId = deterministicId("MACHINEE2E", `${userId}:${provider}:${machine.machineId}`);
const agentKey = `agent-${userId}-${agentId}`;
const now = new Date().toISOString();
const agentRecord = {
  type: "agent",
  id: agentId,
  dbKey: agentKey,
  userId,
  name: `${machine.name ?? machine.machineId} ${provider} E2E`,
  prompt: "You are a private Nolo CLI verification agent. Answer only from the machine CLI result.",
  apiSource: "cli",
  cliProvider: provider,
  isPublic: false,
  runtimeBinding: {
    machineId: machine.machineId,
    ownerUserId: userId,
  },
  createdAt: now,
  updatedAt: now,
};

await writeRecord(server, userId, authToken, agentKey, agentRecord);

const result = await runAgent({
  baseUrl: server,
  authToken,
  agentKey,
  userInput: prompt,
});

console.log(
  JSON.stringify(
    {
      ok: true,
      server,
      machine: {
        machineId: machine.machineId,
        name: machine.name,
        capabilities: machine.capabilities,
        connectorStatus: machine.connectorStatus,
      },
      agentKey,
      agentRunEndpoint,
      dialogId: result.dialogId ?? "",
      contentPreview: String(result.content ?? "").slice(0, 500),
    },
    null,
    2
  )
);
