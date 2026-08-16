import { ulid } from "ulid";

import { createKey } from "../../packages/database/keys";
import { DataType } from "../../packages/create/types";
import { apiPost } from "./apiHelpers";

export function extractTokenRecords(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

export async function createDialogForAgent(args: {
  baseUrl: string;
  authToken: string;
  userId: string;
  agentKey: string;
  title: string;
}) {
  const dialogId = ulid();
  const dialogKey = createKey(DataType.DIALOG, args.userId, dialogId);
  const now = new Date().toISOString();

  const response = await apiPost(
    `${args.baseUrl}/api/v1/db/write/`,
    {
      customKey: dialogKey,
      userId: args.userId,
      data: {
        id: dialogId,
        dbKey: dialogKey,
        cybots: [args.agentKey],
        title: args.title,
        type: DataType.DIALOG,
        createdAt: now,
        updatedAt: now,
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0,
      },
    },
    args.authToken
  );

  if (!response.ok) {
    throw new Error(
      `create dialog failed (${response.status}): ${JSON.stringify(response.data)}`
    );
  }

  return { dialogId, dialogKey, dialogUrl: `${args.baseUrl}/${dialogKey}` };
}

export async function waitForTokenRecord(args: {
  baseUrl: string;
  authToken: string;
  userId: string;
  dialogId: string;
  timeoutMs: number;
}) {
  const startedAt = Date.now();
  let lastCount = 0;

  while (Date.now() - startedAt < args.timeoutMs) {
    const response = await apiPost(
      `${args.baseUrl}/api/v1/db/query/${args.userId}?limit=200`,
      { type: "token" },
      args.authToken
    );
    if (!response.ok) {
      throw new Error(
        `query token records failed (${response.status}): ${JSON.stringify(response.data)}`
      );
    }

    const records = extractTokenRecords(response.data);
    lastCount = records.length;
    const match = records.find((record: any) => record?.dialogId === args.dialogId);
    if (match) return match;
    await Bun.sleep(2000);
  }

  throw new Error(
    `token record not found for dialog ${args.dialogId} after ${args.timeoutMs}ms (last token count=${lastCount})`
  );
}

export function formatProbeResult(result: {
  baseUrl: string;
  agentKey: string;
  dialogId: string;
  dialogKey: string;
  tokenRecord: any;
}) {
  return {
    baseUrl: result.baseUrl,
    agentKey: result.agentKey,
    dialogId: result.dialogId,
    dialogKey: result.dialogKey,
    tokenRecord: {
      model: result.tokenRecord?.model ?? null,
      cost: result.tokenRecord?.cost ?? null,
      input_tokens: result.tokenRecord?.input_tokens ?? null,
      output_tokens: result.tokenRecord?.output_tokens ?? null,
      image_generation_count: result.tokenRecord?.image_generation_count ?? null,
      createdAt: result.tokenRecord?.createdAt ?? null,
    },
  };
}
