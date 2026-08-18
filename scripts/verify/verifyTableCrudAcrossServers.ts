#!/usr/bin/env bun

import { LOCAL_SERVER_ORIGIN } from "../helpers/serverBases";
import { ulid } from "../testHelpers/authHelper";
import { loginDemoUser, registerDemoUser } from "../helpers/agentHelpers";
import { apiDelete, apiGet, apiPost } from "../helpers/apiHelpers";
import { SERVERS } from "../../packages/database/config";
import { normalizeServerOrigin } from "core/serverOrigin";

const LOCAL_BASE = normalizeServerOrigin(
  process.env.LOCAL_BASE ?? LOCAL_SERVER_ORIGIN,
);
const REMOTE_BASES = (process.env.REMOTE_BASES ?? `${SERVERS.US},${SERVERS.MAIN}`)
  .split(",")
  .map((value) => normalizeServerOrigin(value))
  .filter(Boolean);
const DEMO_SEED = process.env.AGENT_SEED ?? "nolo-platform-demo-account-v1";
const DEMO_USER = process.env.AGENT_USER ?? "platform-demo";
const DEMO_LOCALE = process.env.AGENT_LOCALE ?? "zh-CN";

type StepResult = {
  baseUrl: string;
  ok: boolean;
  status: number;
  detail: string;
};

type TableRecord = {
  dbKey: string;
  tenantId: string;
  userId: string;
  tableId: string;
  type: "table";
  displayName: string;
  columns: Array<Record<string, unknown>>;
  createdAt: string;
  updatedAt: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function buildTableRecord(userId: string, dbKey: string, tableId: string, displayName: string): TableRecord {
  const now = new Date().toISOString();
  return {
    dbKey,
    tenantId: userId,
    userId,
    tableId,
    type: "table",
    displayName,
    columns: [
      {
        id: "title-col",
        name: "title",
        label: "标题",
        type: "text",
        isPrimary: true,
        required: true,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

async function patchRecord(
  baseUrl: string,
  dbKey: string,
  authToken: string,
  changes: Record<string, unknown>
) {
  const res = await fetch(`${baseUrl}/api/v1/db/patch/${encodeURIComponent(dbKey)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(changes),
  });
  let data: any = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  return { status: res.status, ok: res.ok, data };
}

async function readRecord(baseUrl: string, dbKey: string, authToken: string) {
  return apiGet<any>(`${baseUrl}/api/v1/db/read/${encodeURIComponent(dbKey)}`, authToken);
}

function printSection(title: string) {
  console.log(`\n=== ${title} ===`);
}

function printResults(label: string, results: StepResult[]) {
  console.log(`\n[${label}]`);
  for (const result of results) {
    const marker = result.ok ? "OK " : "ERR";
    console.log(`${marker} ${result.baseUrl} -> ${result.status} ${result.detail}`);
  }
}

async function main() {
  console.log(`[verify-table-crud] local=${LOCAL_BASE}`);
  console.log(`[verify-table-crud] demo=${DEMO_USER}`);

  const bases = Array.from(new Set([LOCAL_BASE, ...REMOTE_BASES]));
  const creds = [];
  for (const baseUrl of bases) {
    await registerDemoUser(baseUrl, DEMO_SEED, DEMO_USER, DEMO_LOCALE).catch(() => null);
    const auth = await loginDemoUser(baseUrl, DEMO_SEED, DEMO_USER, DEMO_LOCALE);
    creds.push({ baseUrl, ...auth });
  }

  const userId = creds[0]?.userId;
  if (!userId) throw new Error("failed to resolve demo userId");

  const tableId = ulid();
  const dbKey = `meta-${userId}-${tableId}`;
  const createName = `Codex Table Probe ${tableId}`;
  const updateName = `${createName} (updated)`;

  console.log(`[verify-table-crud] userId=${userId}`);
  console.log(`[verify-table-crud] dbKey=${dbKey}`);

  printSection("Phase A: localhost-only create");
  const localCreds = creds.find((item) => item.baseUrl === LOCAL_BASE);
  if (!localCreds) throw new Error(`missing local credentials for ${LOCAL_BASE}`);

  const localWrite = await apiPost(
    `${LOCAL_BASE}/api/v1/db/write/`,
    {
      data: buildTableRecord(userId, dbKey, tableId, createName),
      customKey: dbKey,
      userId,
    },
    localCreds.authToken
  );
  if (!localWrite.ok) {
    throw new Error(`localhost write failed (${localWrite.status}): ${JSON.stringify(localWrite.data)}`);
  }

  await sleep(800);

  const localhostOnlyReads: StepResult[] = [];
  for (const cred of creds) {
    const readRes = await readRecord(cred.baseUrl, dbKey, cred.authToken);
    localhostOnlyReads.push({
      baseUrl: cred.baseUrl,
      ok: readRes.ok,
      status: readRes.status,
      detail: readRes.ok
        ? `displayName=${JSON.stringify(readRes.data?.displayName ?? "")}`
        : JSON.stringify(readRes.data),
    });
  }
  printResults("after localhost-only create", localhostOnlyReads);

  printSection("Phase B: explicit fan-out create/update/delete");
  const createResults: StepResult[] = [];
  for (const cred of creds) {
    const writeRes = await apiPost(
      `${cred.baseUrl}/api/v1/db/write/`,
      {
        data: buildTableRecord(userId, dbKey, tableId, createName),
        customKey: dbKey,
        userId,
      },
      cred.authToken
    );
    createResults.push({
      baseUrl: cred.baseUrl,
      ok: writeRes.ok,
      status: writeRes.status,
      detail: writeRes.ok ? "write ok" : JSON.stringify(writeRes.data),
    });
  }
  printResults("fan-out create", createResults);

  const patchResults: StepResult[] = [];
  for (const cred of creds) {
    const patchRes = await patchRecord(cred.baseUrl, dbKey, cred.authToken, {
      displayName: updateName,
      updatedAt: new Date().toISOString(),
    });
    patchResults.push({
      baseUrl: cred.baseUrl,
      ok: patchRes.ok,
      status: patchRes.status,
      detail: patchRes.ok ? "patch ok" : JSON.stringify(patchRes.data),
    });
  }
  printResults("fan-out patch", patchResults);

  const readAfterPatch: StepResult[] = [];
  for (const cred of creds) {
    const readRes = await readRecord(cred.baseUrl, dbKey, cred.authToken);
    readAfterPatch.push({
      baseUrl: cred.baseUrl,
      ok: readRes.ok && readRes.data?.displayName === updateName,
      status: readRes.status,
      detail: readRes.ok
        ? `displayName=${JSON.stringify(readRes.data?.displayName ?? "")}`
        : JSON.stringify(readRes.data),
    });
  }
  printResults("read after fan-out patch", readAfterPatch);

  const deleteResults: StepResult[] = [];
  for (const cred of creds) {
    const deleteRes = await apiDelete(
      `${cred.baseUrl}/api/v1/db/delete/${encodeURIComponent(dbKey)}?type=table`,
      cred.authToken
    );
    deleteResults.push({
      baseUrl: cred.baseUrl,
      ok: deleteRes.ok,
      status: deleteRes.status,
      detail: deleteRes.ok ? "delete ok" : JSON.stringify(deleteRes.data),
    });
  }
  printResults("fan-out delete", deleteResults);

  const readAfterDelete: StepResult[] = [];
  for (const cred of creds) {
    const readRes = await readRecord(cred.baseUrl, dbKey, cred.authToken);
    readAfterDelete.push({
      baseUrl: cred.baseUrl,
      ok: !readRes.ok && readRes.status === 404,
      status: readRes.status,
      detail: readRes.ok ? JSON.stringify(readRes.data) : JSON.stringify(readRes.data),
    });
  }
  printResults("read after fan-out delete", readAfterDelete);
}

await main();
