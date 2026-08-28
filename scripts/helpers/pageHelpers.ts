import { readFileSync } from "node:fs";
import { ulid } from "ulid";

import { deleteDbRecordOnTargets } from "../../packages/cli/globalRecordOperations";
import type { ServerDemoCredentials } from "./agentHelpers";
import { writeRecord } from "./agentHelpers";
import { ensurePageAttachedToSpace, removeContentFromSpace } from "./spaceDataHelpers";

export function getCliArg(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : undefined;
}

export function readBodyArg(args: string[], fallback = "") {
  const bodyFile = getCliArg(args, "--body-file");
  if (bodyFile !== undefined) {
    return readFileSync(bodyFile, "utf8");
  }
  return getCliArg(args, "--body") ?? fallback;
}

export function textToSlate(text: string) {
  return text.split("\n").map((line) => ({
    type: "paragraph",
    children: [{ text: line }],
  }));
}

export function createPageId() {
  return ulid();
}

export function buildPageKey(userId: string, pageId: string) {
  return `page-${userId}-${pageId}`;
}

export function buildPageRecord(args: {
  dbKey: string;
  pageId: string;
  title: string;
  spaceId: string | null;
  content: string;
  existing?: Record<string, any> | null;
  meta?: Record<string, any> | null;
  slateData?: Record<string, any>[] | null;
}) {
  const { dbKey, pageId, title, spaceId, content, existing, meta, slateData } = args;
  const now = Date.now();
  const createdAt =
    typeof existing?.createdAt === "number" ? existing.createdAt : now;
  const created =
    typeof existing?.created === "string"
      ? existing.created
      : new Date(createdAt).toISOString();

  const nextRecord: Record<string, any> = {
    ...(existing ?? {}),
    id: existing?.id ?? pageId,
    dbKey,
    type: "page",
    title,
    spaceId,
    content,
    updatedAt: now,
    createdAt,
    created,
  };

  if (meta !== undefined) {
    if (meta === null) {
      delete nextRecord.meta;
    } else {
      nextRecord.meta = meta;
    }
  }

  if (slateData !== undefined) {
    if (slateData === null) {
      delete nextRecord.slateData;
    } else {
      nextRecord.slateData = slateData;
    }
  } else if (!existing?.slateData) {
    nextRecord.slateData = textToSlate(content);
  }

  return nextRecord;
}

export async function writePageToServers(args: {
  serverEntries: ServerDemoCredentials[];
  dbKey: string;
  record: Record<string, any>;
  spaceId?: string | null;
  title: string;
  skillSummary?: Record<string, any> | null;
  quiet?: boolean;
}) {
  const { serverEntries, dbKey, record, spaceId, title, skillSummary, quiet } = args;
  const written: string[] = [];

  for (const entry of serverEntries) {
    await writeRecord(entry.baseUrl, entry.userId, entry.authToken, dbKey, record);
    if (spaceId) {
      await ensurePageAttachedToSpace({
        baseUrl: entry.baseUrl,
        userId: entry.userId,
        authToken: entry.authToken,
        spaceId,
        contentKey: dbKey,
        title,
        skillSummary,
      });
    }
    written.push(entry.baseUrl);
    if (!quiet) console.log(`  ✅ ${entry.baseUrl}`);
  }

  return written;
}

export async function deletePageFromServers(args: {
  serverEntries: ServerDemoCredentials[];
  dbKey: string;
  spaceId?: string | null;
}) {
  const { serverEntries, dbKey, spaceId } = args;

  for (const entry of serverEntries) {
    if (spaceId) {
      await removeContentFromSpace({
        baseUrl: entry.baseUrl,
        userId: entry.userId,
        authToken: entry.authToken,
        spaceId,
        contentKey: dbKey,
      }).catch(() => null);
    }
  }

  const deleteResults = await deleteDbRecordOnTargets({
    authToken: "",
    dbKey,
    fetchImpl: fetch,
    targets: serverEntries.map((entry) => ({
      serverUrl: entry.baseUrl,
      authToken: entry.authToken,
    })),
  });

  for (const result of deleteResults) {
    const message =
      result.ok && typeof result.result?.message === "string"
        ? result.result.message.toLowerCase()
        : "";
    const status = message.includes("not found") ? "missing" : result.ok ? "deleted" : "failed";
    console.log(`  ${result.ok ? "✅" : "❌"} ${result.serverUrl} ${status} ${dbKey}`);
  }

  const failed = deleteResults.filter((result) => !result.ok);
  if (failed.length) {
    throw new Error(
      `delete ${dbKey} failed on ${failed
        .map((result) => `${result.serverUrl}: ${result.error}`)
        .join("; ")}`
    );
  }
}
