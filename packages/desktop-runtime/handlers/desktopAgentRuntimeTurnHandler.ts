import type { LocalAgentTurnInput } from "agent-runtime/localLoop";
import type {
  AgentRuntimeMessageContent,
  DesktopAgentRuntimeAgentConfigSnapshot,
  DesktopAgentRuntimeDialogHistorySnapshot,
} from "agent-runtime";
import {
  parseDesktopAgentRuntimeAgentConfigSnapshot,
  parseDesktopAgentRuntimeDialogHistorySnapshot,
} from "agent-runtime";
import type { LocalAgentActionGate, LocalAgentLoopEvent } from "agent-runtime/localLoop";
import type { AgentRuntimeToolResult } from "agent-runtime/hostAdapter";
import { randomUUID } from "node:crypto";
import { parseToken } from "core/authToken";
const WEB_AUTH_TOKEN_COOKIE = "nolo_auth_token";
import { isRecord } from "core/isRecord";
import { asOptionalTrimmedString } from "core/optionalString";
import { setSecret } from "core/secretsStore";
import { validateSecretRequestName } from "ai/tools/secretRequestTool";
import { isTrustedDesktopSameOriginRequest } from "../desktopRequestTrust";
import {
  createDesktopAgentRuntimeHybridRecordStoreFromDb,
  runDesktopAgentRuntimeTurn,
  type DesktopTextOnlyAgentRuntimeTurnInput,
} from "./desktopAgentRuntimeTurnService";
import {
  desktopActionGateRegistry,
  type DesktopActionGateRegistry,
} from "./desktopActionGateRegistry";
import type { DesktopAgentRuntimeRecordStore } from "./desktopAgentRuntimeAdapter";
import type { DesktopAgentRuntimeEnv } from "./desktopAgentRuntimeHostFacts";

/** Sanitized 403 for untrusted callers — never echo Origin/ref/snapshot details. */
const DESKTOP_TURN_FORBIDDEN_ERROR =
  "Forbidden: trusted desktop same-origin required";

type DesktopAgentRuntimeTurnBody = {
  agentRef: string;
  input: AgentRuntimeMessageContent;
  userMessages?: LocalAgentTurnInput["userMessages"];
  /**
   * Request-scoped context blocks (project context, browse context…). Applied as
   * turn-scope system-prompt layers by the turn service; never appended to
   * `input`, so they are never persisted as the user message.
   */
  contextBlocks?: string[];
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
  /** 注入点（测试用）；默认用进程内单例 desktopActionGateRegistry。 */
  gateRegistry?: DesktopActionGateRegistry;
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

  if (record.userMessages !== undefined && (
    !Array.isArray(record.userMessages) || record.userMessages.length === 0 ||
    record.userMessages.some((message: any) => !isRecord(message) || message.role !== "user" ||
      typeof message.cliMessageId !== "string" || !message.cliMessageId.trim() ||
      !isAgentRuntimeMessageContent(message.content)) ||
    new Set(record.userMessages.map((message: any) => message.cliMessageId)).size !== record.userMessages.length
  )) return { ok: false, error: "invalid userMessages", status: 400 };

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
      ...(Array.isArray(record.userMessages) ? { userMessages: record.userMessages.map((message: any) => ({ role: "user" as const, content: message.content, cliMessageId: message.cliMessageId })) } : {}),
      ...(isRecord(record.runtimeContext)
        ? { runtimeContext: record.runtimeContext as Record<string, any> }
        : {}),
      ...(continueDialogId ? { continueDialogId } : {}),
      ...(continueDialogId && dialogKey ? { dialogKey } : {}),
      ...(cwd ? { cwd } : {}),
      ...(record.restrictShellToWorkspace === true
        ? { restrictShellToWorkspace: true }
        : {}),
      ...(Array.isArray(record.contextBlocks)
        ? {
            contextBlocks: record.contextBlocks.filter(
              (block): block is string => typeof block === "string" && block.trim().length > 0
            ),
          }
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

  // Turn-scoped abort: a client disconnect (webview stop / torn-down SSE) must
  // cancel the runtime turn (compaction + provider call), not merely close the
  // response. Wired to both the request signal and the stream `cancel` below.
  const turnAbort = new AbortController();
  // Block 3a：本 turn 的 action gate 待决作用域。turn 结束/abort 时统一取消，
  // pending 不泄漏、turn 也不挂在 gate 上。
  const turnScope = randomUUID();
  const gateRegistry = deps.gateRegistry ?? desktopActionGateRegistry;
  const cancelPendingGatesForTurn = (reason: string) => {
    gateRegistry.cancelAllForTurn(turnScope, reason);
  };
  const onRequestAbort = () => turnAbort.abort(req.signal.reason);
  if (req.signal) {
    if (req.signal.aborted) turnAbort.abort(req.signal.reason);
    else req.signal.addEventListener("abort", onRequestAbort, { once: true });
  }

  const encoder = new TextEncoder();
  let streamClosed = false;
  const stream = new ReadableStream({
    start(controller) {
      const enqueueEvent = (dataObj: object) => {
        if (streamClosed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(dataObj)}\n\n`));
        } catch {
          // Stream cancelled/closed mid-write — a late phase frame after the
          // client disconnected must not crash the producer.
        }
      };
      const closeStream = () => {
        if (streamClosed) return;
        streamClosed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      void (async () => {
        try {
          const result = await runTurn({
            env,
            store,
            agentRef: body.agentRef,
            input: body.input,
            userMessages: body.userMessages,
            runtimeContext: body.runtimeContext,
            continueDialogId: body.continueDialogId,
            dialogKey: body.dialogKey,
            cwd: body.cwd,
            restrictShellToWorkspace: body.restrictShellToWorkspace,
            workspaceToolsHint: body.workspaceToolsHint,
            contextBlocks: body.contextBlocks,
            agentConfigSnapshot: body.agentConfigSnapshot,
            dialogHistorySnapshot: body.dialogHistorySnapshot,
            fetchImpl: deps.fetchImpl,
            signal: turnAbort.signal,
            onActionGate: async (gate): Promise<AgentRuntimeToolResult> => {
              // Block 3a：把 gate 推给 webview（SSE `action_gate` 帧），登记进
              // 进程内待决表并等待用户决定 / TTL / turn 取消。事件里只有
              // id/kind/title/body/payload，永不包含任何凭据明文。
              enqueueEvent({
                type: "action_gate",
                gate: {
                  id: gate.id,
                  kind: gate.kind,
                  title: gate.title,
                  ...(gate.body ? { body: gate.body } : {}),
                  ...(gate.payload !== undefined ? { payload: gate.payload } : {}),
                },
              });
              try {
                return await gateRegistry.register(gate, turnScope);
              } catch (error) {
                return {
                  content: `action gate 登记失败：${error instanceof Error ? error.message : String(error)}`,
                  metadata: {
                    cancelled: true,
                    actionGateResult: { gateId: gate.id, status: "failed" },
                  },
                };
              }
            },
            onTextDelta: (chunk) => {
              enqueueEvent({ type: "delta", text: chunk });
            },
            onToolEvent: (event) => {
              enqueueEvent({ type: "tool", event });
            },
            onToolExecutionLocation: (location) => {
              // F2：本机实际执行位置（已收敛的 ToolExecutionLocation），
              // 先于任何 tool 事件到达客户端；unknown 也如实下发，不补猜。
              enqueueEvent({ type: "execution_location", location });
            },
            onReasoningDelta: (chunk) => {
              // 与 agentRun SSE 约定对齐（见 cli/client/agentRun.ts:1155 消费方式）：
              // 单独的 thinking 事件承载 reasoning 增量，不和文本 delta 混在一起，
              // 客户端可独立接到现有 thinkContent 渲染路径。
              enqueueEvent({ type: "thinking", content: chunk });
            },
            onLoopEvent: (event: LocalAgentLoopEvent) => {
              // Surface the pre-delta turn phase over SSE so the desktop UI
              // shows validating / compacting / waiting-provider before the
              // first delta — the silent-no-feedback window this fix targets.
              // A runtime `turn-phase` observation maps 1:1 onto the status
              // frame's phase + scope; other observation kinds stay on the
              // runtime trace and are not forwarded.
              if (event.kind === "turn-phase") {
                enqueueEvent({
                  type: "status",
                  phase: event.phase,
                  scope: event.compactionScope ?? "in-loop",
                });
              }
            },
          });

          enqueueEvent({ type: "done", result });
          closeStream();
        } catch (error) {
          enqueueEvent({
            type: "error",
            error: normalizeDesktopAgentRuntimeTurnError(error),
          });
          closeStream();
        } finally {
          // turn 结束（无论成败）都收掉本 turn 的 pending gate，防止泄漏。
          cancelPendingGatesForTurn("turn 已结束");
        }
      })();
    },
    cancel() {
      // Consumer cancelled (client disconnected): stop the runtime turn and
      // detach the request-abort listener. Pending gates for this turn are
      // cancelled immediately so the SSE teardown never leaves decisions hanging.
      cancelPendingGatesForTurn("turn 已被客户端取消");
      if (!streamClosed) {
        streamClosed = true;
        turnAbort.abort();
      }
      if (req.signal) req.signal.removeEventListener("abort", onRequestAbort);
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

// ---------------------------------------------------------------------------
// Block 3a：action gate 决定回传路由
// POST /api/desktop/agent-runtime/action-gate/:gateId
// body: { decision: "approve" | "cancel", value?: string }
// 安全不变量：`value` 只作为 setSecret 的实参出现，响应体与日志永不包含它。
// ---------------------------------------------------------------------------

type DesktopAgentRuntimeActionGatePostDeps = {
  env?: DesktopAgentRuntimeEnv;
  registry?: DesktopActionGateRegistry;
  /** 注入点（测试用）；默认 core/secretsStore.setSecret（与 `nolo secret run --with` 同一存储）。 */
  setSecretImpl?: typeof setSecret;
};

type DesktopActionGatePostBody = {
  decision?: unknown;
  value?: unknown;
};

function readActionGatePostBody(value: unknown): DesktopActionGatePostBody | null {
  if (!isRecord(value)) return null;
  return { decision: value.decision, value: value.value };
}

function readActionGateId(req: Request): string | null {
  const pathname = new URL(req.url).pathname;
  const match = pathname.match(/\/api\/desktop\/agent-runtime\/action-gate\/([^/?#]+)/);
  const id = match?.[1];
  return id ? decodeURIComponent(id) : null;
}

function completedGateResult(gateId: string, content: string, extraMetadata?: Record<string, unknown>): AgentRuntimeToolResult {
  return {
    content,
    metadata: {
      ...extraMetadata,
      actionGateResult: { gateId, status: "completed" as const },
    },
  };
}

function failedGateResult(gateId: string, content: string): AgentRuntimeToolResult {
  return {
    content,
    metadata: {
      actionGateResult: { gateId, status: "failed" as const },
    },
  };
}

export async function handleDesktopAgentRuntimeActionGatePost(
  req: Request,
  deps: DesktopAgentRuntimeActionGatePostDeps = {},
) {
  const env = deps.env ?? process.env;
  if (env.NOLO_DESKTOP !== "1") {
    return jsonDesktopAgentRuntimeTurnResponse({ error: "Desktop runtime only" }, 404);
  }
  if (!isTrustedDesktopSameOriginRequest(req, env)) {
    return jsonDesktopAgentRuntimeTurnResponse(
      { error: DESKTOP_TURN_FORBIDDEN_ERROR },
      403,
    );
  }

  const gateId = readActionGateId(req);
  if (!gateId) {
    return jsonDesktopAgentRuntimeTurnResponse({ error: "gateId is required" }, 400);
  }

  const body = readActionGatePostBody(await readDesktopAgentRuntimeTurnJson(req));
  if (!body || (body.decision !== "approve" && body.decision !== "cancel")) {
    return jsonDesktopAgentRuntimeTurnResponse(
      { error: 'decision must be "approve" or "cancel"' },
      400,
    );
  }

  const registry = deps.registry ?? desktopActionGateRegistry;
  const outcome = registry.resolve(gateId, body.decision);
  if (!outcome.ok) {
    // 未知 / 已决 / 已过期：结构化错误，不创建任何决议。
    return jsonDesktopAgentRuntimeTurnResponse(
      { error: outcome.error, gateId },
      404,
    );
  }

  const gate = outcome.gate;

  if (body.decision === "cancel") {
    outcome.complete({
      content: "已取消。",
      metadata: {
        cancelled: true,
        actionGateResult: { gateId, status: "cancelled" },
      },
    });
    return jsonDesktopAgentRuntimeTurnResponse({ ok: true, gateId, status: "cancelled" });
  }

  // approve
  if (gate.kind === "input" && isRecord(gate.payload) && gate.payload.action === "secret_request") {
    const name = typeof gate.payload.name === "string" ? gate.payload.name : "";
    const nameError = validateSecretRequestName(name);
    if (nameError) {
      // 名字非法：不写 store，gate 决议为 failed（说明原因），turn 不挂死。
      const content = `凭据保存被拒绝：${nameError}`;
      outcome.complete(failedGateResult(gateId, content));
      return jsonDesktopAgentRuntimeTurnResponse({ error: nameError, gateId }, 400);
    }
    const value = typeof body.value === "string" ? body.value : "";
    if (!value.trim()) {
      // 空值：拒绝并说明，绝不把空串写进 store；gate 决议为 failed。
      const content = "凭据保存被拒绝：未提供有效的凭据值。";
      outcome.complete(failedGateResult(gateId, content));
      return jsonDesktopAgentRuntimeTurnResponse(
        { error: "secret value is required", gateId },
        400,
      );
    }
    const setSecretFn = deps.setSecretImpl ?? setSecret;
    setSecretFn(name, value);
    outcome.complete(
      completedGateResult(gateId, `已保存凭据 ${name}`, { stored: true, name }),
    );
    // 响应只回 name，不回 value。
    return jsonDesktopAgentRuntimeTurnResponse({ ok: true, gateId, status: "completed", name });
  }

  // confirm / handoff 的 approve：标记完成，宿主按原路径继续执行。
  outcome.complete(completedGateResult(gateId, "已批准。"));
  return jsonDesktopAgentRuntimeTurnResponse({ ok: true, gateId, status: "completed" });
}
