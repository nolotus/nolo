import type {
  AgentRuntimeMessageContent,
  DesktopAgentRuntimeAgentConfigSnapshot,
  DesktopAgentRuntimeDialogHistorySnapshot,
} from "agent-runtime";
import {
  parseDesktopAgentRuntimeAgentConfigSnapshot,
  parseDesktopAgentRuntimeDialogHistorySnapshot,
} from "agent-runtime";
import { parseToken } from "core/authToken";
const WEB_AUTH_TOKEN_COOKIE = "nolo_auth_token";
import { isRecord } from "core/isRecord";
import { asOptionalTrimmedString } from "core/optionalString";
import { isTrustedDesktopSameOriginRequest } from "../desktopRequestTrust";
import {
  createDesktopAgentRuntimeHybridRecordStoreFromDb,
  runDesktopAgentRuntimeTurn,
  type DesktopTextOnlyAgentRuntimeTurnInput,
} from "./desktopAgentRuntimeTurnService";
import type { DesktopAgentRuntimeRecordStore } from "./desktopAgentRuntimeAdapter";
import type { DesktopAgentRuntimeEnv } from "./desktopAgentRuntimeHostFacts";

/** Sanitized 403 for untrusted callers — never echo Origin/ref/snapshot details. */
const DESKTOP_TURN_FORBIDDEN_ERROR =
  "Forbidden: trusted desktop same-origin required";

type DesktopAgentRuntimeTurnBody = {
  agentRef: string;
  input: AgentRuntimeMessageContent;
  runtimeContext?: Record<string, any> | null;
  continueDialogId?: string;
  /** Exact parent dialog dbKey from the client; see DesktopAgentRuntimeTurnInput. */
  dialogKey?: string;
  cwd?: string;
  restrictShellToWorkspace?: boolean;
  workspaceToolsHint?: boolean;
  agentConfigSnapshot?: DesktopAgentRuntimeAgentConfigSnapshot;
  dialogHistorySnapshot?: DesktopAgentRuntimeDialogHistorySnapshot;
};

export type { DesktopAgentRuntimeTurnBody };

type ParseDesktopAgentRuntimeTurnBodyResult =
  | { ok: true; body: DesktopAgentRuntimeTurnBody }
  | { ok: false; error: string; status: number };

export type { ParseDesktopAgentRuntimeTurnBodyResult };

type DesktopAgentRuntimeTurnHandlerDeps = {
  env?: DesktopAgentRuntimeEnv;
  store?: DesktopAgentRuntimeRecordStore;
  fetchImpl?: typeof fetch;
  runTurn?: (input: DesktopTextOnlyAgentRuntimeTurnInput) => Promise<unknown>;
};

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
};

function jsonDesktopAgentRuntimeTurnResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

async function readDesktopAgentRuntimeTurnJson(req: Request) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

function normalizeDesktopAgentRuntimeTurnError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Failed to run desktop agent runtime turn";
}

function extractDesktopRequestAuthToken(req: Request) {
  const authHeaderToken = req.headers.get("authorization")?.split(" ")[1]?.trim();
  if (authHeaderToken) return authHeaderToken;

  const cookieHeader = req.headers.get("cookie") ?? req.headers.get("Cookie") ?? "";
  const cookieToken = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${WEB_AUTH_TOKEN_COOKIE}=`))
    ?.slice(`${WEB_AUTH_TOKEN_COOKIE}=`.length);
  return cookieToken ? decodeURIComponent(cookieToken) : "";
}

function resolveDesktopTurnRequestEnv(req: Request, env: DesktopAgentRuntimeEnv): DesktopAgentRuntimeEnv {
  const authToken = extractDesktopRequestAuthToken(req);
  if (!authToken) return env;

  const parsed = parseToken(authToken);
  const parsedUserId = asOptionalTrimmedString(parsed?.userId);
  return {
    ...env,
    AUTH_TOKEN: env.AUTH_TOKEN || authToken,
    AUTH: env.AUTH || authToken,
    ...(parsedUserId && !env.NOLO_USER_ID ? { NOLO_USER_ID: parsedUserId } : {}),
  };
}

function isAgentRuntimeMessageContent(value: unknown): value is AgentRuntimeMessageContent {
  return typeof value === "string" || Array.isArray(value);
}

export function parseDesktopAgentRuntimeTurnBody(body: unknown): ParseDesktopAgentRuntimeTurnBodyResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "agentRef and input are required", status: 400 };
  }
  const record = body as Record<string, unknown>;
  if (typeof record.agentRef !== "string" || !record.agentRef.trim()) {
    return { ok: false, error: "agentRef and input are required", status: 400 };
  }
  if (!isAgentRuntimeMessageContent(record.input)) {
    return { ok: false, error: "agentRef and input are required", status: 400 };
  }

  const agentRef = record.agentRef.trim();
  const continueDialogId = asOptionalTrimmedString(record.continueDialogId);
  const dialogKey = asOptionalTrimmedString(record.dialogKey);
  const cwd = asOptionalTrimmedString(record.cwd);

  let agentConfigSnapshot: DesktopAgentRuntimeAgentConfigSnapshot | undefined;
  if (record.agentConfigSnapshot !== undefined && record.agentConfigSnapshot !== null) {
    const parsed = parseDesktopAgentRuntimeAgentConfigSnapshot(
      record.agentConfigSnapshot,
      agentRef,
    );
    if (!parsed.ok) {
      return { ok: false, error: parsed.error, status: 400 };
    }
    agentConfigSnapshot = parsed.snapshot;
  }

  let dialogHistorySnapshot: DesktopAgentRuntimeDialogHistorySnapshot | undefined;
  if (record.dialogHistorySnapshot !== undefined && record.dialogHistorySnapshot !== null) {
    const parsed = parseDesktopAgentRuntimeDialogHistorySnapshot(
      record.dialogHistorySnapshot,
      continueDialogId,
    );
    if (!parsed.ok) {
      return { ok: false, error: parsed.error, status: 400 };
    }
    dialogHistorySnapshot = parsed.snapshot;
  }

  return {
    ok: true,
    body: {
      agentRef,
      input: record.input,
      ...(isRecord(record.runtimeContext)
        ? { runtimeContext: record.runtimeContext as Record<string, any> }
        : {}),
      ...(continueDialogId ? { continueDialogId } : {}),
      ...(continueDialogId && dialogKey ? { dialogKey } : {}),
      ...(cwd ? { cwd } : {}),
      ...(record.restrictShellToWorkspace === true
        ? { restrictShellToWorkspace: true }
        : {}),
      ...(record.workspaceToolsHint === true
        ? { workspaceToolsHint: true }
        : {}),
      ...(agentConfigSnapshot ? { agentConfigSnapshot } : {}),
      ...(dialogHistorySnapshot ? { dialogHistorySnapshot } : {}),
    },
  };
}

async function resolveDesktopAgentRuntimeTurnStore(
  args: {
    injectedStore?: DesktopAgentRuntimeRecordStore;
    env: DesktopAgentRuntimeEnv;
    fetchImpl?: typeof fetch;
  }
) {
  if (args.injectedStore) return args.injectedStore;
  const dbModule = await import("database-engine/db");
  await dbModule.ensureServerDbOpen();
  return createDesktopAgentRuntimeHybridRecordStoreFromDb({
    db: dbModule.default,
    env: args.env,
    fetchImpl: args.fetchImpl,
  });
}

export async function handleDesktopAgentRuntimeTurnPost(
  req: Request,
  deps: DesktopAgentRuntimeTurnHandlerDeps = {}
) {
  const baseEnv = deps.env ?? process.env;
  // Process identity alone is not enough: reject bare curl / cross-origin
  // before parsing the body (snapshot may carry credentialRef for host broker).
  if (baseEnv.NOLO_DESKTOP !== "1") {
    return jsonDesktopAgentRuntimeTurnResponse({ error: "Desktop runtime only" }, 404);
  }
  if (!isTrustedDesktopSameOriginRequest(req, baseEnv)) {
    return jsonDesktopAgentRuntimeTurnResponse(
      { error: DESKTOP_TURN_FORBIDDEN_ERROR },
      403,
    );
  }

  const env = resolveDesktopTurnRequestEnv(req, baseEnv);

  const parsedBody = parseDesktopAgentRuntimeTurnBody(await readDesktopAgentRuntimeTurnJson(req));
  if (!parsedBody.ok) {
    return jsonDesktopAgentRuntimeTurnResponse({ error: parsedBody.error }, parsedBody.status);
  }
  const body = parsedBody.body;

  const store = await resolveDesktopAgentRuntimeTurnStore({
    injectedStore: deps.store,
    env,
    fetchImpl: deps.fetchImpl,
  });
  const runTurn = deps.runTurn ?? runDesktopAgentRuntimeTurn;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const enqueueEvent = (dataObj: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(dataObj)}\n\n`));
      };

      try {
        const result = await runTurn({
          env,
          store,
          agentRef: body.agentRef,
          input: body.input,
          runtimeContext: body.runtimeContext,
          continueDialogId: body.continueDialogId,
          dialogKey: body.dialogKey,
          cwd: body.cwd,
          restrictShellToWorkspace: body.restrictShellToWorkspace,
          workspaceToolsHint: body.workspaceToolsHint,
          agentConfigSnapshot: body.agentConfigSnapshot,
          dialogHistorySnapshot: body.dialogHistorySnapshot,
          fetchImpl: deps.fetchImpl,
          onTextDelta: (chunk) => {
            enqueueEvent({ type: "delta", text: chunk });
          },
          onToolEvent: (event) => {
            enqueueEvent({ type: "tool", event });
          },
          onReasoningDelta: (chunk) => {
            // 与 agentRun SSE 约定对齐（见 cli/client/agentRun.ts:1155 消费方式）：
            // 单独的 thinking 事件承载 reasoning 增量，不和文本 delta 混在一起，
            // 客户端可独立接到现有 thinkContent 渲染路径。
            enqueueEvent({ type: "thinking", content: chunk });
          },
        });

        enqueueEvent({ type: "done", result });
        controller.close();
      } catch (error) {
        enqueueEvent({
          type: "error",
          error: normalizeDesktopAgentRuntimeTurnError(error),
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
