#!/usr/bin/env bun

import { LOCAL_SERVER_ORIGIN } from "../helpers/serverBases";
import { ulid } from "../testHelpers/authHelper";
import { loginDemoUser, registerDemoUser, writeRecord } from "../helpers/agentHelpers";
import { apiDelete, apiGet } from "../helpers/apiHelpers";
import { readSpaceRecord } from "../helpers/spaceDataHelpers";
import { SERVERS } from "../../packages/database/config";
import { DataType } from "../../packages/create/types";
import { createSpaceKey } from "../../packages/create/space/spaceKeys";
import { MemberRole, SpaceVisibility, ContentType } from "../../packages/app/types";
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
const isTombstone = (record: any) => Boolean(record?.deletedAt);

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
    description: "Codex local-first file probe",
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

function buildFileMetadata(userId: string, dbKey: string, fileId: string, fileName: string, body: string) {
  const now = new Date().toISOString();
  return {
    id: fileId,
    originalName: fileName,
    fileName,
    filePath: "",
    size: body.length,
    type: "text/plain",
    dbKey,
    userId,
    createdAt: now,
    updatedAt: now,
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

async function uploadFile(
  baseUrl: string,
  authToken: string,
  userId: string,
  dbKey: string,
  fileId: string,
  fileName: string,
  body: string
) {
  const metadata = buildFileMetadata(userId, dbKey, fileId, fileName, body);
  const formData = new FormData();
  formData.append("file", new File([body], fileName, { type: "text/plain" }));
  formData.append("metadata", JSON.stringify(metadata));
  formData.append("customKey", dbKey);
  formData.append("userId", userId);

  const response = await fetch(`${baseUrl}/api/v1/db/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    body: formData,
  });

  let data: any = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  return { ok: response.ok, status: response.status, data };
}

async function readRecord(baseUrl: string, dbKey: string, authToken: string) {
  return apiGet<any>(`${baseUrl}/api/v1/db/read/${encodeURIComponent(dbKey)}`, authToken);
}

async function readServedFileMetadata(baseUrl: string, fileKey: string, authToken: string) {
  const response = await fetch(`${baseUrl}/api/v1/db/file/metadata/${encodeURIComponent(fileKey)}`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { ok: response.ok, status: response.status, data };
}

async function readFileContent(baseUrl: string, fileKey: string, authToken: string) {
  const response = await fetch(`${baseUrl}/api/v1/db/file/content/${encodeURIComponent(fileKey)}`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
  const text = await response.text();
  return { ok: response.ok, status: response.status, text };
}

async function ensureFileAttachedToSpace(params: {
  baseUrl: string;
  userId: string;
  authToken: string;
  spaceId: string;
  contentKey: string;
  title: string;
}) {
  const { baseUrl, userId, authToken, spaceId, contentKey, title } = params;
  const spaceKey = createSpaceKey.space(spaceId);
  const spaceRecord = await readSpaceRecord(baseUrl, authToken, spaceId);
  const now = Date.now();

  await writeRecord(baseUrl, userId, authToken, spaceKey, {
    ...spaceRecord,
    contents: {
      ...(spaceRecord.contents ?? {}),
      [contentKey]: {
        ...(spaceRecord.contents?.[contentKey] ?? {}),
        title,
        type: ContentType.FILE,
        contentKey,
        updatedAt: now,
        createdAt: spaceRecord.contents?.[contentKey]?.createdAt ?? now,
      },
    },
    updatedAt: now,
  });
}

async function removeContentFromSpace(params: {
  baseUrl: string;
  userId: string;
  authToken: string;
  spaceId: string;
  contentKey: string;
}) {
  const { baseUrl, userId, authToken, spaceId, contentKey } = params;
  const spaceKey = createSpaceKey.space(spaceId);
  const spaceRecord = await readSpaceRecord(baseUrl, authToken, spaceId);
  const nextContents = { ...(spaceRecord.contents ?? {}) } as Record<string, any>;
  delete nextContents[contentKey];

  await writeRecord(baseUrl, userId, authToken, spaceKey, {
    ...spaceRecord,
    contents: nextContents,
    updatedAt: Date.now(),
  });
}

async function cleanupFileRecord(baseUrl: string, dbKey: string, authToken: string) {
  await apiDelete(`${baseUrl}/api/v1/db/delete/${encodeURIComponent(dbKey)}`, authToken).catch(() => null);
}

async function main() {
  console.log(`[verify-file-flow] local=${LOCAL_BASE}`);
  console.log(`[verify-file-flow] demo=${DEMO_USER}`);

  const creds = await ensureDemoCredentials();
  const localCred = creds.find((item) => item.baseUrl === LOCAL_BASE);
  if (!localCred) throw new Error(`missing local credentials for ${LOCAL_BASE}`);

  const userId = localCred.userId;
  const probeId = ulid();
  const fileId = ulid();
  const dbKey = `file-${userId}-${probeId}`;
  const fileName = `tiny-probe-${probeId}.txt`;
  const fileBody = `tiny-file-probe ${probeId}\n`;
  const spaceId = ulid();
  const spaceKey = createSpaceKey.space(spaceId);
  const memberKey = createSpaceKey.member(userId, spaceId);
  const spaceName = `Codex File Probe ${spaceId}`;

  console.log(`[verify-file-flow] userId=${userId}`);
  console.log(`[verify-file-flow] fileKey=${dbKey}`);
  console.log(`[verify-file-flow] spaceKey=${spaceKey}`);

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
        memberKey,
        buildSpaceMemberRecord(spaceId, userId, spaceName)
      );
    }

    printSection("Phase A: localhost-only upload");
    const localUpload = await uploadFile(
      LOCAL_BASE,
      localCred.authToken,
      userId,
      dbKey,
      fileId,
      fileName,
      fileBody
    );
    if (!localUpload.ok) {
      throw new Error(`localhost upload failed (${localUpload.status}): ${JSON.stringify(localUpload.data)}`);
    }
    await sleep(600);

    const localOnlyResults: StepResult[] = [];
    for (const cred of creds) {
      const metadataRes = await readRecord(cred.baseUrl, dbKey, cred.authToken);
      const servedMetadataRes = await readServedFileMetadata(cred.baseUrl, dbKey, cred.authToken);
      const contentRes = await readFileContent(cred.baseUrl, dbKey, cred.authToken);
      const shouldExist = cred.baseUrl === LOCAL_BASE;
      localOnlyResults.push({
        baseUrl: cred.baseUrl,
        ok: shouldExist
          ? metadataRes.ok &&
            servedMetadataRes.ok &&
            contentRes.ok &&
            contentRes.text === fileBody
          : !metadataRes.ok && !servedMetadataRes.ok && !contentRes.ok,
        status: shouldExist ? contentRes.status : servedMetadataRes.status,
        detail: shouldExist
          ? `dbRecord=200 servedMetadata=200 content=${JSON.stringify(contentRes.text)}`
          : `dbRecord=${metadataRes.status} servedMetadata=${servedMetadataRes.status} contentStatus=${contentRes.status}`,
      });
    }
    printResults("after localhost-only upload", localOnlyResults);

    printSection("Phase B: explicit fan-out upload");
    const uploadResults: StepResult[] = [];
    for (const cred of creds) {
      const uploadRes = await uploadFile(
        cred.baseUrl,
        cred.authToken,
        userId,
        dbKey,
        fileId,
        fileName,
        fileBody
      );
      uploadResults.push({
        baseUrl: cred.baseUrl,
        ok: uploadRes.ok,
        status: uploadRes.status,
        detail: uploadRes.ok ? `fileId=${uploadRes.data?.fileId ?? ""}` : JSON.stringify(uploadRes.data),
      });
    }
    printResults("fan-out upload", uploadResults);

    const readAfterUpload: StepResult[] = [];
    for (const cred of creds) {
      const metadataRes = await readRecord(cred.baseUrl, dbKey, cred.authToken);
      const servedMetadataRes = await readServedFileMetadata(cred.baseUrl, dbKey, cred.authToken);
      const contentRes = await readFileContent(cred.baseUrl, dbKey, cred.authToken);
      readAfterUpload.push({
        baseUrl: cred.baseUrl,
        ok:
          metadataRes.ok &&
          metadataRes.data?.id === fileId &&
          servedMetadataRes.ok &&
          servedMetadataRes.data?.id === fileId &&
          contentRes.ok &&
          contentRes.text === fileBody,
        status: contentRes.status,
        detail: metadataRes.ok
          ? `dbRecordId=${metadataRes.data?.id} servedMetadataId=${servedMetadataRes.data?.id} content=${JSON.stringify(contentRes.text)}`
          : JSON.stringify(metadataRes.data),
      });
    }
    printResults("read after fan-out upload", readAfterUpload);

    printSection("Phase C: fan-out attach to space");
    for (const cred of creds) {
      await ensureFileAttachedToSpace({
        baseUrl: cred.baseUrl,
        userId,
        authToken: cred.authToken,
        spaceId,
        contentKey: dbKey,
        title: fileName,
      });
    }

    const mountResults: StepResult[] = [];
    for (const cred of creds) {
      const spaceRecord = await readSpaceRecord(cred.baseUrl, cred.authToken, spaceId);
      const content = spaceRecord.contents?.[dbKey] ?? null;
      mountResults.push({
        baseUrl: cred.baseUrl,
        ok: content?.contentKey === dbKey && content?.title === fileName,
        status: 200,
        detail: `spaceHasFile=${Boolean(content)} title=${JSON.stringify(content?.title ?? "")}`,
      });
    }
    printResults("space mount after fan-out upload", mountResults);

    printSection("Phase D: localhost-only remove reference + delete entity");
    await removeContentFromSpace({
      baseUrl: LOCAL_BASE,
      userId,
      authToken: localCred.authToken,
      spaceId,
      contentKey: dbKey,
    });
    await cleanupFileRecord(LOCAL_BASE, dbKey, localCred.authToken);
    await sleep(600);

    const localDeleteResults: StepResult[] = [];
    for (const cred of creds) {
      const spaceRecord = await readSpaceRecord(cred.baseUrl, cred.authToken, spaceId);
      const content = spaceRecord.contents?.[dbKey] ?? null;
      const metadataRes = await readRecord(cred.baseUrl, dbKey, cred.authToken);
      const servedMetadataRes = await readServedFileMetadata(cred.baseUrl, dbKey, cred.authToken);
      const contentRes = await readFileContent(cred.baseUrl, dbKey, cred.authToken);
      const shouldRemain = cred.baseUrl !== LOCAL_BASE;
      localDeleteResults.push({
        baseUrl: cred.baseUrl,
        ok: shouldRemain
          ? Boolean(content) && metadataRes.ok && servedMetadataRes.ok && contentRes.ok
          : !content &&
            metadataRes.ok &&
            isTombstone(metadataRes.data) &&
            !servedMetadataRes.ok &&
            !contentRes.ok,
        status: shouldRemain ? contentRes.status : servedMetadataRes.status,
        detail: shouldRemain
          ? `spaceHasFile=${Boolean(content)} dbRecord=${metadataRes.status} servedMetadata=${servedMetadataRes.status} contentStatus=${contentRes.status}`
          : `spaceHasFile=${Boolean(content)} dbTombstone=${isTombstone(metadataRes.data)} servedMetadata=${servedMetadataRes.status} contentStatus=${contentRes.status}`,
      });
    }
    printResults("after localhost-only remove/delete", localDeleteResults);

    printSection("Phase E: explicit fan-out remove reference + delete entity");
    for (const cred of creds) {
      await removeContentFromSpace({
        baseUrl: cred.baseUrl,
        userId,
        authToken: cred.authToken,
        spaceId,
        contentKey: dbKey,
      });
      await cleanupFileRecord(cred.baseUrl, dbKey, cred.authToken);
    }
    await sleep(600);

    const finalResults: StepResult[] = [];
    for (const cred of creds) {
      const spaceRecord = await readSpaceRecord(cred.baseUrl, cred.authToken, spaceId);
      const content = spaceRecord.contents?.[dbKey] ?? null;
      const metadataRes = await readRecord(cred.baseUrl, dbKey, cred.authToken);
      const servedMetadataRes = await readServedFileMetadata(cred.baseUrl, dbKey, cred.authToken);
      const contentRes = await readFileContent(cred.baseUrl, dbKey, cred.authToken);
      finalResults.push({
        baseUrl: cred.baseUrl,
        ok:
          !content &&
          metadataRes.ok &&
          isTombstone(metadataRes.data) &&
          !servedMetadataRes.ok &&
          !contentRes.ok,
        status: servedMetadataRes.status,
        detail: `spaceHasFile=${Boolean(content)} dbTombstone=${isTombstone(metadataRes.data)} servedMetadata=${servedMetadataRes.status} contentStatus=${contentRes.status}`,
      });
    }
    printResults("after fan-out remove/delete", finalResults);
  } finally {
    for (const cred of creds) {
      await cleanupFileRecord(cred.baseUrl, dbKey, cred.authToken).catch(() => null);
      await cleanupFileRecord(cred.baseUrl, spaceKey, cred.authToken).catch(() => null);
      await cleanupFileRecord(cred.baseUrl, memberKey, cred.authToken).catch(() => null);
    }
  }
}

main().catch((error) => {
  console.error("[verify-file-flow] failed", error);
  process.exit(1);
});
