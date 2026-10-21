/**
 * Server platform tool executors for CLI local runtime.
 *
 * Extracted from localRuntimeAdapter.ts. Builds executors that bridge CLI
 * local tool calls (table CRUD, web access) to the nolo server API.
 *
 * Direct imports replace lazy ensureHeavyCliLocalRuntimeModules indirection.
 */
import type { EnvLike } from "./localRuntimeHelpers";
import {
  resolveRuntimeServerUrl,
  resolveRuntimeAuthToken,
} from "./localRuntimeHelpers";
import type { CliFetchImpl } from "../cliFetch";
import { inferCaptureIntent } from "../../ai/policy/runtimePolicy";
import { parseNoloWorkspaceToolArguments } from "../../agent-runtime/noloWorkspaceTools";
import {
  LOCAL_SERVER_TABLE_TOOL_NAMES,
  LOCAL_SERVER_WEB_TOOL_NAMES,
} from "./cliToolClassification";
import {
  classifyFetchWebpageUrl,
  fetchWebpageLocally,
} from "./fetchWebpageContent";
import { fetchWithTransientRetry } from "./localRuntimeFetchRetry";

export function buildServerPlatformToolExecutors(args: {
  env: EnvLike;
  fetchImpl: CliFetchImpl;
  /**
   * Current agent key, used to scope written memories to this agent's subject
   * (mirrors the web tool's behavior). Absent for adapters built before an
   * agent is resolved; the server then falls back to owner-level scoping.
   */
  agentKey?: string | null;
}) {
  const postServer = async (
    path: string,
    body: object,
    opts?: { retryTransient?: boolean },
  ) => {
    const serverUrl = resolveRuntimeServerUrl(args.env);
    const authToken = resolveRuntimeAuthToken(args.env);
    if (!serverUrl)
      throw new Error(
        "server platform tools require NOLO_SERVER_URL, NOLO_SERVER, or BASE_URL.",
      );
    if (!authToken)
      throw new Error(
        "server platform tools require AUTH_TOKEN or NOLO_MACHINE_API_KEY.",
      );
    const url = `${serverUrl}${path}`;
    const init = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    };
    // Table and web tools surface their failure to the user, who can retry by
    // asking again. A dropped memory write is silent — nobody learns it was
    // lost — so it is the one bridge that retries. Only 429/503 are retried
    // (the upstream saying "not accepted"), so this cannot double-write.
    const response = opts?.retryTransient
      ? await fetchWithTransientRetry(args.fetchImpl, url, init)
      : await args.fetchImpl(url, init);
    const text = await response.text().catch(() => "");
    if (!response.ok) {
      throw new Error(
        `server platform tool bridge failed: HTTP ${response.status} ${text.slice(0, 500)}`,
      );
    }
    return text;
  };

  const guardExplicitTableCapture = (call: any) => {
    if (inferCaptureIntent(String(call.userInput ?? "")) === "strong")
      return null;
    return JSON.stringify({
      error: "knowledge_capture_requires_confirmation",
      message:
        "当前本地运行不允许自动写入表格。只有当用户在当前请求里明确要求保存、建表、写入 table 或做成数据集时，才能继续；否则请先询问用户。",
      policy: {
        capability: "knowledge_capture",
        target: "table",
        mode: "explicit-only-local",
      },
    });
  };

  const tableExecutors = Object.fromEntries(
    LOCAL_SERVER_TABLE_TOOL_NAMES.map((toolName) => [
      toolName,
      async (call: any) => {
        const blocked = guardExplicitTableCapture(call);
        if (blocked) {
          return {
            content: blocked,
            metadata: { serverPlatformTool: true, tableWriteBlocked: true },
          };
        }
        const parsed = parseNoloWorkspaceToolArguments(call.arguments);
        const path =
          toolName === "createTable"
            ? "/api/table/create"
            : toolName === "addTableRow"
              ? "/api/table/add-row"
              : toolName === "addTableRows"
                ? "/api/table/add-rows"
                : toolName === "updateTableRow"
                  ? "/api/table/update-row"
                  : "/api/table/update-rows";
        const content = await postServer(path, parsed);
        return {
          content,
          metadata: { serverPlatformTool: true, tableWrite: true },
        };
      },
    ]),
  );

  // Web access tools (fetchWebpage / exa_search) bridge to the same server
  // routes the desktop runtime uses. The CLI holds no local API keys, so these
  // only work when NOLO_SERVER_URL + auth are configured.
  //
  // Exception: private/loopback fetchWebpage targets must stay on-box. Bridging
  // them to the server hits the server's own SSRF guard (correctly) and would
  // never reach the user's machine. Public URLs still bridge for billing/UA.
  const webExecutors = Object.fromEntries(
    LOCAL_SERVER_WEB_TOOL_NAMES.map((toolName) => [
      toolName,
      async (call: any) => {
        const parsed = parseNoloWorkspaceToolArguments(call.arguments);
        if (toolName === "fetchWebpage") {
          const route = classifyFetchWebpageUrl(parsed.url);
          if (route.kind === "reject") {
            throw new Error(route.error);
          }
          if (route.kind === "local") {
            const content = await fetchWebpageLocally({
              url: route.url,
              fetchImpl: args.fetchImpl,
            });
            return {
              content,
              metadata: {
                serverPlatformTool: true,
                webTool: toolName,
                url: parsed.url,
                localFetch: true,
              },
            };
          }
          const content = await postServer("/api/fetch-webpage", {
            url: route.url,
          });
          return {
            content,
            metadata: {
              serverPlatformTool: true,
              webTool: toolName,
              url: parsed.url,
            },
          };
        }

        // 与 exaSearchFunc 镜像同一份 body（plan 第 3 节契约）：
        // intent 原样转发，没给就不带这个键，由服务端按场景定档；
        // useAutoprompt 已废弃不转发；type 不再补默认值（服务端按 plan 定档）。
        const body: Record<string, any> = {
          query: parsed.query,
          ...(parsed.numResults !== undefined ? { numResults: parsed.numResults } : {}),
        };
        if (typeof parsed.intent === "string" && parsed.intent) {
          body.intent = parsed.intent;
        }
        if (typeof parsed.category === "string" && parsed.category) {
          body.category = parsed.category;
        }
        if (typeof parsed.timeRange === "string" && parsed.timeRange) {
          body.timeRange = parsed.timeRange;
        }
        if (Array.isArray(parsed.includeDomains) && parsed.includeDomains.length > 0) {
          body.includeDomains = parsed.includeDomains;
        }
        if (Array.isArray(parsed.excludeDomains) && parsed.excludeDomains.length > 0) {
          body.excludeDomains = parsed.excludeDomains;
        }
        // legacy：includeContent 只作兼容映射透传（服务端映射为 detail），不补默认值。
        if (typeof parsed.includeContent === "boolean") {
          body.includeContent = parsed.includeContent;
        }
        // 定档信号：CLI 手里没有 dialog 消息历史（无 Redux store），
        // priorSearches / lastResultCount 拿不到就**不发**——服务端对缺失键跳过
        // 对应规则。origin 由 agent-runtime 从 turn 输入推导后随 call 注入
        // （toolCallTransaction → AgentRuntimeToolCallInput.origin），有才发。
        if (call?.origin) body.origin = call.origin;
        const content = await postServer("/api/exa-search", body);
        return {
          content,
          metadata: {
            serverPlatformTool: true,
            webTool: toolName,
            query: parsed.query,
          },
        };
      },
    ]),
  );

  const queryMemory = async (call: any) => {
    const parsed = parseNoloWorkspaceToolArguments(call.arguments);
    const query = typeof parsed.query === "string" ? parsed.query.trim() : "";
    if (!query) {
      return {
        content: JSON.stringify({ error: "queryMemory 需要非空 query。" }),
        metadata: { serverPlatformTool: true, memoryRead: false },
      };
    }
    const body: Record<string, unknown> = { userInput: query };
    if (args.agentKey) body.agentKey = args.agentKey;
    const raw = await postServer("/api/memory/query", body, {
      retryTransient: true,
    });
    return {
      content: raw,
      metadata: { serverPlatformTool: true, memoryRead: true, query },
    };
  };

  // Long-term memory writes bridge to /api/memory/remember — the same store
  // /api/memory/query recalls from. `source: agent-inferred` matches the web
  // tool: an agent deciding on its own to remember is a guess, not a user
  // directive, so it gets the lower base confidence.
  const rememberMemory = async (call: any) => {
    const parsed = parseNoloWorkspaceToolArguments(call.arguments);
    const content =
      typeof parsed.content === "string" ? parsed.content.trim() : "";
    if (!content) {
      return {
        content: JSON.stringify({
          error: "rememberMemory 需要非空 content。",
        }),
        metadata: { serverPlatformTool: true, memoryWrite: false },
      };
    }
    const body: Record<string, unknown> = {
      content,
      scope: parsed.scope ?? "auto",
      kind: parsed.kind ?? "episodic",
      source: "agent-inferred",
    };
    // procedural 的复现证据透传给服务端硬门；缺失时服务端降级 episodic。
    if (typeof parsed.recurrenceEvidence === "string" && parsed.recurrenceEvidence.trim()) {
      body.recurrenceEvidence = parsed.recurrenceEvidence.trim();
    }
    if (args.agentKey) body.agentKey = args.agentKey;
    const raw = await postServer("/api/memory/remember", body, {
      retryTransient: true,
    });
    return {
      content: raw,
      metadata: { serverPlatformTool: true, memoryWrite: true, content },
    };
  };

  const deleteMemory = async (call: any) => {
    const parsed = parseNoloWorkspaceToolArguments(call.arguments);
    const reason =
      typeof parsed.reason === "string" ? parsed.reason.trim() : "";
    if (!reason && !parsed.ids && !parsed.contentKeyword && !parsed.query) {
      return {
        content: JSON.stringify({
          error: "deleteMemory 需要用户明确的删除原因或过滤条件。",
        }),
        metadata: { serverPlatformTool: true, memoryDelete: false },
      };
    }
    const isConfirmed = parsed.confirmed === true;
    if (isConfirmed && !parsed.deletionToken?.trim()) {
      return {
        content: JSON.stringify({
          error:
            "deleteMemory 在确认删除阶段（confirmed: true）必须提供预检阶段获取的 deletionToken。请先调用本工具进行预检预览。",
        }),
        metadata: { serverPlatformTool: true, memoryDelete: false },
      };
    }
    // 删除条件的可读投影（trim 后取首个非空分支；与 body 的 contentSubstring
    // 同源），只进 metadata 供 TUI 紧凑行显示摘要，不改请求体本身。
    const contentKeyword =
      typeof parsed.contentKeyword === "string" && parsed.contentKeyword.trim()
        ? parsed.contentKeyword.trim()
        : typeof parsed.query === "string" && parsed.query.trim()
          ? parsed.query.trim()
          : undefined;
    const body: Record<string, unknown> = {
      ids: parsed.ids,
      contentSubstring: parsed.contentKeyword ?? parsed.query,
      kinds: parsed.kinds,
      tags: parsed.tags,
      dryRun: !isConfirmed,
      deletionToken: parsed.deletionToken,
      reason,
    };
    if (args.agentKey) body.agentKey = args.agentKey;
    const raw = await postServer("/api/memory/delete", body, {
      retryTransient: true,
    });
    // 2026-09-26: deleteMemory 原来只回 memoryDelete flag，TUI gist 无料可
    // 显示；补 reason / contentKeyword / idsCount 三个投影（消费方见
    // toolOutput.ts 的 memoryToolGist "-" 分支）。
    return {
      content: raw,
      metadata: {
        serverPlatformTool: true,
        memoryDelete: true,
        reason,
        contentKeyword,
        idsCount: Array.isArray(parsed.ids) ? parsed.ids.length : undefined,
      },
    };
  };

  return {
    ...tableExecutors,
    ...webExecutors,
    queryMemory,
    rememberMemory,
    deleteMemory,
  };
}
