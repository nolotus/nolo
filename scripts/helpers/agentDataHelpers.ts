import { normalizeAgentHandle } from "core/agentHandle";
import { toErrorMessage } from "core/errorMessage";
import { asOptionalTrimmedString } from "core/optionalString";
import { apiGet, apiPost } from "./apiHelpers";
import { parseUserIdFromAuthToken } from "./authContext";
import { buildScriptServerCandidates } from "./serverBases";

export function parseAgentKeyFromInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Agent key/url is empty.");
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const url = new URL(trimmed);
    const pathname = url.pathname.replace(/^\/+/, "");
    if (!pathname.startsWith("agent-") && !pathname.startsWith("agent-pub-")) {
      throw new Error(`Unsupported agent URL path: ${url.pathname}`);
    }
    return pathname;
  }
  return trimmed;
}

export function parseUserIdFromAgentKey(agentKey: string): string | undefined {
  const privateMatch = agentKey.match(/^agent-(.+)-([0-9A-Za-z]{26})$/i);
  if (privateMatch) return privateMatch[1];
  return undefined;
}

export function parseAgentIdFromKey(agentKey: string): string | undefined {
  const privateMatch = agentKey.match(/^agent-.+-([0-9A-Za-z]{26})$/i);
  if (privateMatch) return privateMatch[1];
  const publicMatch = agentKey.match(/^agent-pub-(.+)$/i);
  if (publicMatch) return publicMatch[1];
  return undefined;
}

export function normalizeAgentIdInput(raw: string): string {
  const parsed = parseAgentKeyFromInput(raw);
  const parsedId = parseAgentIdFromKey(parsed);
  if (parsedId) return parsedId;
  if (parsed.startsWith("agent-")) {
    throw new Error(`Unsupported agent key format: ${parsed}`);
  }
  return parsed;
}

export function buildAgentKeys(agentId: string, userId: string) {
  return {
    privateKey: `agent-${userId}-${agentId}`,
    publicKey: `agent-pub-${agentId}`,
  };
}

export type AgentReadAttempt = {
  base: string;
  ok: boolean;
  status?: number;
  message?: string;
};

export type AgentRecordCacheDb = {
  iterator(options: { gte: string; lte: string }): AsyncIterable<[string, unknown]>;
};

export function buildAgentServerCandidates(preferredBase: string) {
  return buildScriptServerCandidates(preferredBase);
}

export async function readAgentRecord(args: {
  baseUrl: string;
  agentKey: string;
  authToken?: string;
}) {
  const res = await apiGet<any>(
    `${args.baseUrl}/api/v1/db/read/${encodeURIComponent(args.agentKey)}`,
    args.authToken ?? ""
  );
  if (!res.ok) {
    throw new Error(`read agent failed (${res.status}): ${JSON.stringify(res.data)}`);
  }
  return (res.data as any)?.data ?? res.data;
}

export async function readAgentRecordAcrossBases(args: {
  bases: string[];
  agentKey: string;
  authToken?: string;
}) {
  const attempts: AgentReadAttempt[] = [];

  for (const base of args.bases) {
    try {
      const record = await readAgentRecord({
        baseUrl: base,
        agentKey: args.agentKey,
        authToken: args.authToken,
      });
      attempts.push({ base, ok: true });
      return {
        record,
        resolvedBase: base,
        attempts,
      };
    } catch (error) {
      const message = toErrorMessage(error);
      const statusMatch = message.match(/\((\d{3})\)/);
      attempts.push({
        base,
        ok: false,
        status: statusMatch ? Number(statusMatch[1]) : undefined,
        message,
      });
    }
  }

  throw Object.assign(new Error("All agent reads failed"), { attempts });
}

function recordHasAgentHandle(record: unknown, handle: string) {
  if (!record || typeof record !== "object") return false;
  const normalized = normalizeAgentHandle(handle);
  if (!normalized) return false;
  return normalizeAgentHandle((record as any).handle) === normalized;
}

function readRecordKey(record: unknown) {
  if (!record || typeof record !== "object") return "";
  const value = (record as any).dbKey ?? (record as any).key;
  return asOptionalTrimmedString(value) ?? "";
}

async function resolveCachedAgentRecordByHandle(args: {
  handle: string;
  localDb?: AgentRecordCacheDb;
}) {
  const normalized = normalizeAgentHandle(args.handle);
  if (!normalized || !args.localDb) return null;
  try {
    const iterator = args.localDb.iterator({ gte: "agent-", lte: "agent-\uffff" });
    for await (const [key, record] of iterator) {
      if (!recordHasAgentHandle(record, normalized)) continue;
      const agentKey = readRecordKey(record) || key;
      if (!agentKey) continue;
      const resolvedBase = typeof (record as any)?.serverOrigin === "string"
        ? (record as any).serverOrigin
        : "";
      return {
        agentKey,
        record: { ...(record as any), dbKey: agentKey },
        resolvedBase,
        attempts: [] as AgentReadAttempt[],
      };
    }
  } catch {
    // local cache unavailable
  }
  return null;
}

export async function queryAgentRecords(args: {
  baseUrl: string;
  authToken: string;
  userId?: string;
  limit?: number;
}) {
  const userId = args.userId ?? parseUserIdFromAuthToken(args.authToken);
  if (!userId) throw new Error("Cannot query agent records without a userId.");
  const limit = args.limit ?? 200;
  const res = await apiPost<any>(
    `${args.baseUrl}/api/v1/db/query/${encodeURIComponent(userId)}?limit=${limit}`,
    { type: "agent" },
    args.authToken,
  );
  if (!res.ok) {
    throw new Error(`query agents failed (${res.status}): ${JSON.stringify(res.data)}`);
  }
  const data = Array.isArray(res.data?.data)
    ? res.data.data
    : Array.isArray(res.data?.items)
      ? res.data.items
      : Array.isArray(res.data)
        ? res.data
        : [];
  return data;
}

export async function resolveAgentRecordByHandleAcrossBases(args: {
  bases: string[];
  handle: string;
  authToken: string;
  userId?: string;
}) {
  const attempts: AgentReadAttempt[] = [];
  for (const base of args.bases) {
    try {
      const records = await queryAgentRecords({
        baseUrl: base,
        authToken: args.authToken,
        userId: args.userId,
      });
      const record = records.find((item: unknown) => recordHasAgentHandle(item, args.handle));
      const agentKey = readRecordKey(record);
      if (!record || !agentKey) {
        attempts.push({ base, ok: false, status: 404, message: `handle ${args.handle} not found` });
        continue;
      }
      attempts.push({ base, ok: true });
      return {
        agentKey,
        record: { ...record, dbKey: agentKey },
        resolvedBase: base,
        attempts,
      };
    } catch (error) {
      const message = toErrorMessage(error);
      const statusMatch = message.match(/\((\d{3})\)/);
      attempts.push({
        base,
        ok: false,
        status: statusMatch ? Number(statusMatch[1]) : undefined,
        message,
      });
    }
  }
  throw Object.assign(new Error(`Agent handle not found: ${args.handle}`), { attempts });
}

export async function resolveAgentRecordInputAcrossBases(args: {
  bases: string[];
  agentInput: string;
  authToken: string;
  localDb?: AgentRecordCacheDb;
}) {
  const parsed = parseAgentKeyFromInput(args.agentInput);
  if (/^(agent|cybot)(-pub)?-/.test(parsed)) {
    const read = await readAgentRecordAcrossBases({
      bases: args.bases,
      agentKey: parsed,
      authToken: args.authToken,
    });
    return {
      agentKey: parsed,
      record: read.record,
      resolvedBase: read.resolvedBase,
      attempts: read.attempts,
    };
  }
  const cached = await resolveCachedAgentRecordByHandle({
    handle: parsed,
    localDb: args.localDb,
  });
  if (cached) {
    return {
      ...cached,
      resolvedBase: cached.resolvedBase || args.bases[0],
    };
  }
  return resolveAgentRecordByHandleAcrossBases({
    bases: args.bases,
    handle: parsed,
    authToken: args.authToken,
  });
}
