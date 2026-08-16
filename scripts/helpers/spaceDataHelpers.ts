import { ContentType } from "../../packages/app/types";
import { createSpaceKey, normalizeSpaceId } from "../../packages/create/space/spaceKeys";
import { apiGet, apiPost } from "./apiHelpers";
import { writeRecord } from "./agentHelpers";

export function parseSpaceIdFromInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Space id/url is empty.");
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const url = new URL(trimmed);
    const fromQuery = url.searchParams.get("spaceId");
    if (fromQuery) {
      return normalizeSpaceId(fromQuery);
    }

    const parts = url.pathname.split("/").filter(Boolean);
    const spaceIndex = parts.findIndex((part) => part === "space");
    if (spaceIndex >= 0 && parts[spaceIndex + 1]) {
      return normalizeSpaceId(parts[spaceIndex + 1]);
    }

    throw new Error(`Unsupported space URL: ${trimmed}`);
  }

  return normalizeSpaceId(trimmed);
}

export async function readSpaceRecord(
  baseUrl: string,
  authToken: string,
  spaceId: string
) {
  const spaceKey = createSpaceKey.space(spaceId);
  const response = await apiGet<any>(
    `${baseUrl}/api/v1/db/read/${encodeURIComponent(spaceKey)}`,
    authToken
  );
  if (!response.ok) {
    throw new Error(`读取 Space 失败 (${response.status}): ${JSON.stringify(response.data)}`);
  }
  return ((response.data as any)?.data ?? response.data) as Record<string, any>;
}

export async function readDbRecord(
  baseUrl: string,
  authToken: string,
  dbKey: string
) {
  const response = await apiGet<any>(
    `${baseUrl}/api/v1/db/read/${encodeURIComponent(dbKey)}`,
    authToken
  );
  if (!response.ok) {
    throw new Error(`读取记录失败 (${response.status}): ${JSON.stringify(response.data)}`);
  }
  return ((response.data as any)?.data ?? response.data) as Record<string, any>;
}

export async function queryDbRecords(
  baseUrl: string,
  authToken: string,
  userId: string,
  options: {
    limit?: number;
    type?: string | string[];
    summary?: boolean;
    includeDeleted?: boolean;
    subjectRef?: { kind: string; id: string; role?: string };
  } = {}
) {
  const limit = Number.isFinite(options.limit) && Number(options.limit) > 0
    ? Math.floor(Number(options.limit))
    : undefined;
  const query = limit ? `?limit=${limit}` : "";
  const response = await apiPost<any>(
    `${baseUrl}/api/v1/db/query/${encodeURIComponent(userId)}${query}`,
    {
      ...(options.type ? { type: options.type } : {}),
      ...(options.subjectRef ? { subjectRef: options.subjectRef } : {}),
      ...(options.summary ? { summary: true } : {}),
      ...(options.includeDeleted ? { includeDeleted: true } : {}),
    },
    authToken
  );
  if (!response.ok) {
    throw new Error(`查询记录失败 (${response.status}): ${JSON.stringify(response.data)}`);
  }
  const data = response.data as any;
  return (Array.isArray(data?.data?.data)
    ? data.data.data
    : Array.isArray(data?.data)
      ? data.data
      : []) as Record<string, any>[];
}

export async function ensureAgentAttachedToSpace(params: {
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
        type: ContentType.AGENT,
        contentKey,
        updatedAt: now,
        createdAt: spaceRecord.contents?.[contentKey]?.createdAt ?? now,
      },
    },
    updatedAt: now,
  });
}

export async function ensurePageAttachedToSpace(params: {
  baseUrl: string;
  userId: string;
  authToken: string;
  spaceId: string;
  contentKey: string;
  title: string;
  skillSummary?: Record<string, any> | null;
}) {
  const { baseUrl, userId, authToken, spaceId, contentKey, title, skillSummary } = params;
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
        type: ContentType.DOC,
        contentKey,
        ...(skillSummary !== undefined ? { skillSummary } : {}),
        updatedAt: now,
        createdAt: spaceRecord.contents?.[contentKey]?.createdAt ?? now,
      },
    },
    updatedAt: now,
  });
}

export async function ensureDialogAttachedToSpace(params: {
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
        type: ContentType.DIALOG,
        contentKey,
        updatedAt: now,
        createdAt: spaceRecord.contents?.[contentKey]?.createdAt ?? now,
      },
    },
    updatedAt: now,
  });
}

export async function ensureTableAttachedToSpace(params: {
  baseUrl: string;
  userId: string;
  authToken: string;
  spaceId: string;
  contentKey: string;
  title: string;
  categoryId?: string;
}) {
  const { baseUrl, userId, authToken, spaceId, contentKey, title, categoryId } = params;
  const spaceKey = createSpaceKey.space(spaceId);
  const spaceRecord = await readSpaceRecord(baseUrl, authToken, spaceId);
  const now = Date.now();
  const categoryIdForStorage =
    categoryId && spaceRecord.categories?.[categoryId] ? categoryId : undefined;

  await writeRecord(baseUrl, userId, authToken, spaceKey, {
    ...spaceRecord,
    contents: {
      ...(spaceRecord.contents ?? {}),
      [contentKey]: {
        ...(spaceRecord.contents?.[contentKey] ?? {}),
        title,
        type: "table",
        contentKey,
        ...(categoryIdForStorage ? { categoryId: categoryIdForStorage } : {}),
        updatedAt: now,
        createdAt: spaceRecord.contents?.[contentKey]?.createdAt ?? now,
      },
    },
    updatedAt: now,
  });
}

export async function setSpaceContentCategory(params: {
  baseUrl: string;
  userId: string;
  authToken: string;
  spaceId: string;
  contentKey: string;
  categoryId?: string;
}) {
  const { baseUrl, userId, authToken, spaceId, contentKey, categoryId } = params;
  const spaceKey = createSpaceKey.space(spaceId);
  const spaceRecord = await readSpaceRecord(baseUrl, authToken, spaceId);
  const currentContent = spaceRecord.contents?.[contentKey];

  if (!currentContent || typeof currentContent !== "object") {
    throw new Error(`Space ${spaceId} 中不存在内容 ${contentKey}。`);
  }

  const categoryIdForStorage =
    categoryId && spaceRecord.categories?.[categoryId] ? categoryId : undefined;
  const now = Date.now();
  const nextContent = { ...(currentContent as Record<string, any>) };
  delete nextContent.categoryId;
  if (categoryIdForStorage) {
    nextContent.categoryId = categoryIdForStorage;
  }
  nextContent.updatedAt = now;

  await writeRecord(baseUrl, userId, authToken, spaceKey, {
    ...spaceRecord,
    contents: {
      ...(spaceRecord.contents ?? {}),
      [contentKey]: nextContent,
    },
    updatedAt: now,
  });
}

export async function removeContentFromSpace(params: {
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
