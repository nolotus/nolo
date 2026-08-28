import { toErrorMessage } from "core/errorMessage";
import { AUTH_HEADERS, BASE as DEFAULT_BASE } from "../testUtils";
import { normalizeSpaceId } from "../../packages/create/space/spaceKeys";
import { parseUserIdFromAuthToken, resolveAuthToken } from "./authContext";
import {
  buildScriptServerCandidates,
  isLocalBaseUrl,
  normalizeBaseUrl,
} from "./serverBases";

export type DialogInput = {
  base: string;
  dialogId: string;
  userId: string;
  spaceId?: string;
};

export type ReadSource = "http" | "local-db-fallback";

export type HttpAttempt = {
  base: string;
  ok: boolean;
  status?: number;
  message?: string;
};

const DEFAULT_USER_ID = "392282c404";
const DIALOG_PATH_RE = /^\/dialog-(.+)-([0-9A-HJKMNP-TV-Z]{26})$/i;
const SPACE_DIALOG_PATH_RE =
  /^\/space\/([^/]+)\/dialog-(.+)-([0-9A-HJKMNP-TV-Z]{26})$/i;

function resolveDialogUserId(explicitUserId?: string) {
  if (explicitUserId?.trim()) return explicitUserId.trim();
  return parseUserIdFromAuthToken(resolveAuthToken()) ?? DEFAULT_USER_ID;
}

export function isDialogUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://");
}

export function parseDialogInput(rawInput: string): DialogInput {
  if (!isDialogUrl(rawInput)) {
    return {
      base: process.env.READ_DIALOG_BASE ?? DEFAULT_BASE,
      dialogId: rawInput,
      userId: resolveDialogUserId(process.env.USER_ID),
    };
  }

  const url = new URL(rawInput);
  const spaceMatch = url.pathname.match(SPACE_DIALOG_PATH_RE);
  if (spaceMatch) {
    const [, spaceIdFromPath, userIdFromPath, dialogId] = spaceMatch;
    return {
      base: process.env.READ_DIALOG_BASE ?? url.origin,
      dialogId,
      userId: resolveDialogUserId(process.env.USER_ID ?? userIdFromPath),
      spaceId: normalizeSpaceId(spaceIdFromPath),
    };
  }

  const match = url.pathname.match(DIALOG_PATH_RE);
  if (!match) {
    throw new Error(`Unsupported dialog URL path: ${url.pathname}`);
  }

  const [, userIdFromPath, dialogId] = match;
  return {
    base: process.env.READ_DIALOG_BASE ?? url.origin,
    dialogId,
    userId: resolveDialogUserId(process.env.USER_ID ?? userIdFromPath),
    spaceId: url.searchParams.get("spaceId") ?? undefined,
  };
}

export function canUseLocalDb(base: string) {
  return isLocalBaseUrl(base);
}

export function buildServerCandidates(preferredBase: string): string[] {
  return buildScriptServerCandidates(normalizeBaseUrl(preferredBase));
}

export async function readDialogOverHttp(args: {
  base: string;
  dialogKey: string;
  dialogId: string;
  limit: number;
  authToken: string;
}) {
  const authHeaders = {
    ...AUTH_HEADERS,
    Authorization: `Bearer ${args.authToken}`,
  };
  const readViaBridge = async () => {
    const bridgeRes = await fetch(`${args.base}/api/dialog-read`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        dialogKey: args.dialogKey,
        dialogId: args.dialogId,
        limit: args.limit,
      }),
    });
    if (!bridgeRes.ok) {
      throw Object.assign(new Error(`dialog read bridge failed: HTTP ${bridgeRes.status}`), {
        status: bridgeRes.status,
        base: args.base,
        stage: "bridge",
      });
    }
    const payload = await bridgeRes.json();
    if (!payload?.ok) {
      throw Object.assign(new Error(`dialog read bridge failed: ${payload?.error ?? "unknown error"}`), {
        status: 500,
        base: args.base,
        stage: "bridge",
      });
    }
    return {
      meta: payload.meta,
      msgs: payload.msgs,
      source: "http" as ReadSource,
    };
  };

  const metaRes = await fetch(
    `${args.base}/api/v1/db/read/${encodeURIComponent(args.dialogKey)}`,
    {
      headers: { Authorization: `Bearer ${args.authToken}` },
    }
  );

  if (!metaRes.ok) {
    if (metaRes.status === 401 || metaRes.status === 403) {
      return readViaBridge();
    }
    throw Object.assign(new Error(`read dialog meta failed: HTTP ${metaRes.status}`), {
      status: metaRes.status,
      base: args.base,
      stage: "meta",
    });
  }

  const meta = await metaRes.json();

  const msgsRes = await fetch(`${args.base}/rpc/getConvMsgs`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ dialogId: args.dialogId, limit: args.limit }),
  });

  if (!msgsRes.ok) {
    if (msgsRes.status === 401 || msgsRes.status === 403) {
      return readViaBridge();
    }
    throw Object.assign(new Error(`read dialog messages failed: HTTP ${msgsRes.status}`), {
      status: msgsRes.status,
      base: args.base,
      stage: "messages",
    });
  }

  const msgs = await msgsRes.json();
  return {
    meta,
    msgs,
    source: "http" as ReadSource,
  };
}

export async function tryHttpDialogCandidates(args: {
  bases: string[];
  dialogKey: string;
  dialogId: string;
  limit: number;
  authToken: string;
}) {
  const attempts: HttpAttempt[] = [];

  for (const base of args.bases) {
    try {
      const result = await readDialogOverHttp({
        base,
        dialogKey: args.dialogKey,
        dialogId: args.dialogId,
        limit: args.limit,
        authToken: args.authToken,
      });
      attempts.push({ base, ok: true });
      return { ...result, resolvedBase: base, attempts };
    } catch (error) {
      const status =
        typeof error === "object" && error !== null && "status" in error
          ? Number((error as any).status)
          : undefined;
      const message = toErrorMessage(error);
      attempts.push({ base, ok: false, status, message });
    }
  }

  throw Object.assign(new Error("All HTTP dialog reads failed"), { attempts });
}

export async function readDialogFromLocalDb(dialogKey: string, dialogId: string, limit: number) {
  const [{ default: serverDb, ensureServerDbOpen }, { fetchMessages }] = await Promise.all([
    import("../../packages/database-engine/db"),
    import("../../packages/chat/messages/fetchMessages"),
  ]);
  await ensureServerDbOpen();
  const meta = await serverDb.get(dialogKey);
  const msgs = await fetchMessages(serverDb, dialogId, { limit, throwOnError: true });
  return {
    meta,
    msgs,
    source: "local-db-fallback" as ReadSource,
  };
}
