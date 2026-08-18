#!/usr/bin/env bun

import { LOCAL_SERVER_ORIGIN } from "../helpers/serverBases";
import { ulid } from "../testHelpers/authHelper";
import { loginDemoUser, registerDemoUser, writeRecord } from "../helpers/agentHelpers";
import { apiDelete, apiGet } from "../helpers/apiHelpers";
import {
  ensureDialogAttachedToSpace,
  readSpaceRecord,
  removeContentFromSpace,
} from "../helpers/spaceDataHelpers";
import { SERVERS } from "../../packages/database/config";
import { DataType } from "../../packages/create/types";
import { createSpaceKey } from "../../packages/create/space/spaceKeys";
import { MemberRole, SpaceVisibility } from "../../packages/app/types";
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

type Credential = {
  baseUrl: string;
  userId: string;
  authToken: string;
};

type StepResult = {
  baseUrl: string;
  ok: boolean;
  status: number;
  detail: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

function buildSpaceRecord(spaceId: string, userId: string, name: string) {
  const now = Date.now();
  return {
    id: spaceId,
    name,
    description: "Codex local-first space dialog probe",
    ownerId: userId,
    visibility: SpaceVisibility.PRIVATE,
    members: [userId],
    categories: {},
    contents: {},
    createdAt: now,
    updatedAt: now,
    type: DataType.SPACE,
  };
}

function buildSpaceMemberRecord(spaceId: string, userId: string, name: string) {
  const now = new Date().toISOString();
  return {
    dbKey: createSpaceKey.member(userId, spaceId),
    type: DataType.SPACE,
    userId,
    role: MemberRole.OWNER,
    joinedAt: Date.now(),
    spaceId,
    spaceName: name,
    ownerId: userId,
    visibility: SpaceVisibility.PRIVATE,
    createdAt: now,
    updatedAt: now,
  };
}

function buildDialogRecord(dialogKey: string, dialogId: string, spaceId: string, title: string) {
  const now = new Date().toISOString();
  return {
    id: dialogId,
    dbKey: dialogKey,
    cybots: [],
    title,
    type: DataType.DIALOG,
    createdAt: now,
    updatedAt: now,
    inputTokens: 0,
    outputTokens: 0,
    totalCost: 0,
    spaceId,
  };
}

async function ensureDemoCredentials(): Promise<Credential[]> {
  const bases = Array.from(new Set([LOCAL_BASE, ...REMOTE_BASES]));
  const results: Credential[] = [];

  for (const baseUrl of bases) {
    await registerDemoUser(baseUrl, DEMO_SEED, DEMO_USER, DEMO_LOCALE).catch(() => null);
    const auth = await loginDemoUser(baseUrl, DEMO_SEED, DEMO_USER, DEMO_LOCALE);
    results.push({ baseUrl, ...auth });
  }

  return results;
}

async function readRecord(baseUrl: string, dbKey: string, authToken: string) {
  return apiGet<any>(`${baseUrl}/api/v1/db/read/${encodeURIComponent(dbKey)}`, authToken);
}

async function cleanupRecord(baseUrl: string, dbKey: string, authToken: string, type?: string) {
  const suffix = type ? `?type=${encodeURIComponent(type)}` : "";
  await apiDelete(`${baseUrl}/api/v1/db/delete/${encodeURIComponent(dbKey)}${suffix}`, authToken).catch(() => null);
}

async function main() {
  console.log(`[verify-space-dialog] local=${LOCAL_BASE}`);
  console.log(`[verify-space-dialog] demo=${DEMO_USER}`);

  const creds = await ensureDemoCredentials();
  const localCred = creds.find((item) => item.baseUrl === LOCAL_BASE);
  if (!localCred) throw new Error(`missing local credentials for ${LOCAL_BASE}`);

  const userId = localCred.userId;
  const spaceId = ulid();
  const spaceKey = createSpaceKey.space(spaceId);
  const spaceMemberKey = createSpaceKey.member(userId, spaceId);
  const spaceName = `Codex Dialog Space ${spaceId}`;
  const dialogId = ulid();
  const dialogKey = `dialog-${userId}-${dialogId}`;
  const createTitle = `Codex Space Dialog ${dialogId}`;

  console.log(`[verify-space-dialog] userId=${userId}`);
  console.log(`[verify-space-dialog] spaceKey=${spaceKey}`);
  console.log(`[verify-space-dialog] dialogKey=${dialogKey}`);

  try {
    printSection("Phase 0: fan-out create space shell");
    for (const cred of creds) {
      await writeRecord(
        cred.baseUrl,
        userId,
        cred.authToken,
        spaceKey,
        buildSpaceRecord(spaceId, userId, spaceName)
      );
      await writeRecord(
        cred.baseUrl,
        userId,
        cred.authToken,
        spaceMemberKey,
        buildSpaceMemberRecord(spaceId, userId, spaceName)
      );
    }

    printSection("Phase A: localhost-only dialog create and attach");
    await writeRecord(
      LOCAL_BASE,
      userId,
      localCred.authToken,
      dialogKey,
      buildDialogRecord(dialogKey, dialogId, spaceId, createTitle)
    );
    await ensureDialogAttachedToSpace({
      baseUrl: LOCAL_BASE,
      userId,
      authToken: localCred.authToken,
      spaceId,
      contentKey: dialogKey,
      title: createTitle,
    });
    await sleep(800);

    const localhostOnlyResults: StepResult[] = [];
    for (const cred of creds) {
      const dialogRes = await readRecord(cred.baseUrl, dialogKey, cred.authToken);
      const spaceRecord = await readSpaceRecord(cred.baseUrl, cred.authToken, spaceId);
      const content = spaceRecord.contents?.[dialogKey] ?? null;
      const localShouldExist = cred.baseUrl === LOCAL_BASE;
      localhostOnlyResults.push({
        baseUrl: cred.baseUrl,
        ok: localShouldExist
          ? dialogRes.ok && content?.title === createTitle
          : !dialogRes.ok && !content,
        status: dialogRes.status,
        detail: localShouldExist
          ? `dialog ok, space title=${JSON.stringify(content?.title ?? "")}`
          : `dialogStatus=${dialogRes.status} spaceHasContent=${Boolean(content)}`,
      });
    }
    printResults("after localhost-only dialog create", localhostOnlyResults);

    printSection("Phase B: explicit fan-out create attach");
    for (const cred of creds) {
      await writeRecord(
        cred.baseUrl,
        userId,
        cred.authToken,
        dialogKey,
        buildDialogRecord(dialogKey, dialogId, spaceId, createTitle)
      );
      await ensureDialogAttachedToSpace({
        baseUrl: cred.baseUrl,
        userId,
        authToken: cred.authToken,
        spaceId,
        contentKey: dialogKey,
        title: createTitle,
      });
    }

    const fanoutCreateResults: StepResult[] = [];
    for (const cred of creds) {
      const dialogRes = await readRecord(cred.baseUrl, dialogKey, cred.authToken);
      const spaceRecord = await readSpaceRecord(cred.baseUrl, cred.authToken, spaceId);
      const content = spaceRecord.contents?.[dialogKey] ?? null;
      fanoutCreateResults.push({
        baseUrl: cred.baseUrl,
        ok: dialogRes.ok && dialogRes.data?.title === createTitle && content?.title === createTitle,
        status: dialogRes.status,
        detail: dialogRes.ok
          ? `dialogTitle=${JSON.stringify(dialogRes.data?.title ?? "")} spaceTitle=${JSON.stringify(content?.title ?? "")}`
          : JSON.stringify(dialogRes.data),
      });
    }
    printResults("fan-out dialog create attach", fanoutCreateResults);

    printSection("Phase C: local-first delete from space");
    await removeContentFromSpace({
      baseUrl: LOCAL_BASE,
      userId,
      authToken: localCred.authToken,
      spaceId,
      contentKey: dialogKey,
    });
    await cleanupRecord(LOCAL_BASE, dialogKey, localCred.authToken, "dialog");
    await sleep(800);

    const localDeleteResults: StepResult[] = [];
    for (const cred of creds) {
      const dialogRes = await readRecord(cred.baseUrl, dialogKey, cred.authToken);
      const spaceRecord = await readSpaceRecord(cred.baseUrl, cred.authToken, spaceId);
      const content = spaceRecord.contents?.[dialogKey] ?? null;
      const deletedAt = dialogRes.data?.deletedAt ?? null;
      const localShouldBeDeleted = cred.baseUrl === LOCAL_BASE;
      localDeleteResults.push({
        baseUrl: cred.baseUrl,
        ok: localShouldBeDeleted
          ? dialogRes.ok && Boolean(deletedAt) && !content
          : dialogRes.ok && !dialogRes.data?.deletedAt && Boolean(content),
        status: dialogRes.status,
        detail: localShouldBeDeleted
          ? `deletedAt=${JSON.stringify(deletedAt)} spaceHasContent=${Boolean(content)}`
          : `remoteDeleted=${Boolean(dialogRes.data?.deletedAt)} spaceHasContent=${Boolean(content)}`,
      });
    }
    printResults("after local-first delete only on localhost", localDeleteResults);

    printSection("Phase D: explicit fan-out delete convergence");
    for (const cred of creds.filter((item) => item.baseUrl !== LOCAL_BASE)) {
      await removeContentFromSpace({
        baseUrl: cred.baseUrl,
        userId,
        authToken: cred.authToken,
        spaceId,
        contentKey: dialogKey,
      });
      await cleanupRecord(cred.baseUrl, dialogKey, cred.authToken, "dialog");
    }

    const fanoutDeleteResults: StepResult[] = [];
    for (const cred of creds) {
      const dialogRes = await readRecord(cred.baseUrl, dialogKey, cred.authToken);
      const spaceRecord = await readSpaceRecord(cred.baseUrl, cred.authToken, spaceId);
      const content = spaceRecord.contents?.[dialogKey] ?? null;
      fanoutDeleteResults.push({
        baseUrl: cred.baseUrl,
        ok: dialogRes.ok && Boolean(dialogRes.data?.deletedAt) && !content,
        status: dialogRes.status,
        detail: dialogRes.ok
          ? `deletedAt=${JSON.stringify(dialogRes.data?.deletedAt ?? null)} spaceHasContent=${Boolean(content)}`
          : JSON.stringify(dialogRes.data),
      });
    }
    printResults("fan-out delete convergence", fanoutDeleteResults);
  } finally {
    for (const cred of creds) {
      await cleanupRecord(cred.baseUrl, dialogKey, cred.authToken, "dialog");
      await cleanupRecord(cred.baseUrl, spaceMemberKey, cred.authToken);
      await cleanupRecord(cred.baseUrl, spaceKey, cred.authToken);
    }
  }
}

await main();
