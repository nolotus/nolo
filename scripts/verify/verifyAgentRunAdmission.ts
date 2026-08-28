#!/usr/bin/env bun

import {
  buildAgentThreadKey,
  buildAgentThreadByAgentStatusIndexKey,
} from "agent-runtime";
import {
  deleteRecord,
  deterministicId,
  writeRecord,
} from "../helpers/agentHelpers";
import { ensureDemoUserAccess } from "../helpers/agentFlowHelpers";
import { normalizePreviewBaseUrl } from "../helpers/previewAuth";

function getArg(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const baseUrl = normalizePreviewBaseUrl(
  getArg("--base") ?? process.env.LOCAL_BASE ?? "http://127.0.0.1:38123",
);
const seed = process.env.AGENT_SEED ?? "nolo-agent-run-admission-v0";
const username = process.env.AGENT_USER ?? "agent-run-admission";
const locale = process.env.AGENT_LOCALE ?? "zh-CN";

const credentials = await ensureDemoUserAccess({
  baseUrl,
  seed,
  username,
  locale,
});
const { authToken, userId } = credentials;
const agentId = deterministicId("ADMISSIONV0", `${userId}:${baseUrl}`);
const agentKey = `agent-${userId}-${agentId}`;
const agentRecord = {
  type: "agent",
  id: agentId,
  userId,
  name: "Agent Run Admission Verify",
  prompt: "This test agent should be rejected by admission before upstream execution.",
  apiSource: "custom",
  provider: "custom",
  model: "admission-smoke-model",
  customProviderUrl: "https://example.invalid/v1",
  apiKey: "sk-admission-smoke",
  isPublic: false,
  admission: { maxConcurrent: 1 },
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

async function postAgentRun(userInput: string) {
  const response = await fetch(`${baseUrl}/api/agent/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      agentKey,
      userInput,
      background: true,
      runtimeContext: {
        surface: "server-script",
        host: "script",
        runtime: "bun",
        entrypoint: "scripts/verify/verifyAgentRunAdmission.ts",
        capabilities: ["non-interactive"],
      },
    }),
  });
  const rawBody = await response.text();
  let body: any = null;
  try {
    body = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    body = rawBody;
  }
  return { response, rawBody, body };
}

const writtenKeys = [agentKey];
try {
  await writeRecord(baseUrl, userId, authToken, agentKey, agentRecord);

  const first = await postAgentRun("Start one background run for admission verification.");
  if (first.response.status !== 202 || typeof first.body?.dialogId !== "string") {
    throw new Error(
      `Expected first /api/agent/run to create a background run, got HTTP ${first.response.status}: ${first.rawBody.slice(0, 500)}`,
    );
  }
  const firstDialogId = first.body.dialogId;
  const firstThreadKey = buildAgentThreadKey({ userId, threadId: firstDialogId });
  const firstRunningIndexKey = buildAgentThreadByAgentStatusIndexKey({
    userId,
    primaryAgentKey: agentKey,
    status: "running",
    threadId: firstDialogId,
  });
  const firstPendingIndexKey = buildAgentThreadByAgentStatusIndexKey({
    userId,
    primaryAgentKey: agentKey,
    status: "pending",
    threadId: firstDialogId,
  });
  writtenKeys.push(
    firstRunningIndexKey,
    firstPendingIndexKey,
    firstThreadKey,
    `dialog-${userId}-${firstDialogId}`,
  );

  const { response, rawBody, body } = await postAgentRun(
    "This second request should be rejected before any model call.",
  );

  if (response.status !== 429) {
    throw new Error(
      `Expected /api/agent/run to return 429, got HTTP ${response.status}: ${rawBody.slice(0, 500)}`,
    );
  }
  if (body?.reason !== "max_concurrent_reached") {
    throw new Error(`Expected max_concurrent_reached reason, got: ${rawBody.slice(0, 500)}`);
  }
  if (body?.activeThreadCount !== 1 || body?.maxConcurrent !== 1) {
    throw new Error(`Unexpected admission metrics: ${rawBody.slice(0, 500)}`);
  }

  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    agentKey,
    firstDialogId,
    status: response.status,
    reason: body.reason,
    activeThreadCount: body.activeThreadCount,
    maxConcurrent: body.maxConcurrent,
  }, null, 2));
} finally {
  for (const key of writtenKeys.reverse()) {
    await deleteRecord(baseUrl, userId, authToken, key).catch(() => "missing");
  }
}
