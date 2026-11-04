/**
 * transport 分支：Cursor Connect
 *
 * 由 localRuntimeAdapter 原先 940 行的 resolveProviderBase 拆出，逻辑逐字保留。
 * 未命中本通道返回 null，交给 resolveLocalProvider 链上的下一条。
 */
import type { AgentRuntimeResult, AgentRuntimeToolCallInput } from "../../../agent-runtime";
// cursorProvider（含 @bufbuild/protobuf 与生成的 agent_pb）常驻约 40 MB，
// 只有 Cursor OAuth agent 才需要：类型静态导入（编译期擦除），实现按需动态加载。
import type {
  CursorSearchWorkspaceArgs,
  CursorListWorkspaceEntriesArgs,
} from "../../../agent-runtime/cursor/cursorProvider";
import { isCursorOAuthAgent } from "../../../agent-runtime/cursor/isCursorOAuthAgent";
import type { PermissionRequest } from "../../../agent-runtime/actionGate";
import {
  internalSearchWorkspace,
  internalListWorkspaceEntries,
} from "../../../agent-runtime/localWorkspaceTools";
import { resolveExecShellDetachMs } from "../cliLocalToolBudget";
import { logLocalRuntimeDiagnostic } from "../localRuntimeDiagnostics";
import { resolveProviderOpenAiToolBundle } from "../localRuntimeTools";
import { executeLocalToolWithPolicy } from "../localToolPolicy";
import { getAgentRuntimeToolParametersIndex } from "../../agentRuntimeLocal";
import type { ProviderResolver } from "./providerResolutionContext";

export const resolveCursorTransport: ProviderResolver = async (ctx) => {
  const { agentConfig, deps, workspaceRoot, additionalToolNames, buildProviderOpenAiTools, apiKeyRefResolver, activeAgentToolNames, localToolExecutors, recordLocalAvailability } = ctx;
  // Cursor OAuth uses a bespoke ConnectRPC + protobuf wire (HTTP/2 to
  // api2.cursor.sh), not OpenAI-compatible chat.completions. Route through
  // the dedicated cursorProvider which translates nolo messages to the
  // AgentRunRequest protobuf and streams AgentServerMessage frames.
  if (isCursorOAuthAgent(agentConfig)) {
    const { createCursorProvider, readCursorUpstreamFailure } = await import(
      "../../../agent-runtime/cursor/cursorProvider"
    );
    const accessToken = await apiKeyRefResolver("cursor");
    if (!accessToken) {
      throw new Error(
        'OAuth credential for "cursor" not found locally. Run `nolo auth cursor`.',
      );
    }
    const { requestedToolNames, tools } = resolveProviderOpenAiToolBundle(
      agentConfig,
      deps.env,
      buildProviderOpenAiTools,
      additionalToolNames,
    );
    logLocalRuntimeDiagnostic("provider.selected", {
      agentKey: agentConfig.key,
      transport: "cursor-connect",
      provider: "cursor",
      model: agentConfig.model ?? "cursor-default",
      hasApiKey: true,
    });
    // Build a cursor-internal executeTool that reuses the same policy +
    // executors as the host adapter's executeTool. Cursor drives its own
    // inline exec loop (sync, in-stream), so we give it the same local
    // tool executors rather than routing back through localLoop.
    const cursorExecuteTool = async (call: AgentRuntimeToolCallInput) => {
      const result = await executeLocalToolWithPolicy({
        env: deps.env,
        agentToolNames: activeAgentToolNames,
        call,
        executors: localToolExecutors,
        // 分发前参数闸门：与 host adapter 的 executeTool 同口径。
        toolParametersIndex: getAgentRuntimeToolParametersIndex(),
        detachMs: resolveExecShellDetachMs(deps.env),
        ...(deps.confirmDestructiveAction
          ? { confirmDestructiveAction: deps.confirmDestructiveAction }
          : {}),
      });
      return {
        ...result,
        metadata: {
          ...(result.metadata ?? {}),
          workspaceRoot,
          workspaceKind: "current",
        },
      };
    };
    // Cursor 的 workspace 工具（search / list）用宿主确认回调做「工作区外文件
    // 访问」确认；宿主契约是 HostConfirmDecision（boolean | { approved,
    // hostResult }），而 workspace 工具只接受 boolean。边界换算与
    // cliLocalToolExecutors 的文件访问通道同口径：拒绝语义原样保留，对象形态
    // 按 approved 解释；宿主代执行（hostResult）由 execShell 的 capability
    // 通道消费，与只读 workspace 工具无关。
    const hostConfirm = deps.confirmDestructiveAction;
    const confirmExternalFileAccess = hostConfirm
      ? async (request: PermissionRequest): Promise<boolean> => {
          const decision = await hostConfirm(request);
          return typeof decision === "boolean" ? decision : decision.approved === true;
        }
      : undefined;
    const cursorSearchWorkspace = (args: CursorSearchWorkspaceArgs) =>
      internalSearchWorkspace({
        workspaceRoot,
        query: args.query,
        path: args.path,
        caseSensitive: args.caseSensitive,
        maxResults: args.maxResults,
        contextLines: args.contextLines,
        ...(confirmExternalFileAccess ? { confirmExternalFileAccess } : {}),
      });
    const cursorListWorkspaceEntries = (args: CursorListWorkspaceEntriesArgs) =>
      internalListWorkspaceEntries({
        workspaceRoot,
        path: args.path,
        maxDepth: args.maxDepth,
        maxResults: args.maxResults,
        ...(confirmExternalFileAccess ? { confirmExternalFileAccess } : {}),
      });
    const cursorProvider = createCursorProvider({
      accessToken,
      model: agentConfig.model || "cursor-default",
      systemPrompt: agentConfig.prompt?.trim() || undefined,
      tools,
      ...(ctx.textOnly ? {} : {
        executeTool: cursorExecuteTool,
        searchWorkspace: cursorSearchWorkspace,
        listWorkspaceEntries: cursorListWorkspaceEntries,
      }),
    });
    // cursorProvider.complete already returns AgentRuntimeResult; wrap to
    // attach tool surface diagnostics for parity with other providers.
    return {
      model: agentConfig.model || "cursor-default",
      complete: async (messages, options) => {
        logLocalRuntimeDiagnostic("provider.request.start", {
          agentKey: agentConfig.key,
          transport: "cursor-connect",
          model: agentConfig.model ?? "cursor-default",
          messageCount: messages.length,
          toolCount: tools.length,
          requestedToolNames,
        });
        try {
          const result = await cursorProvider.complete(messages, options);
          // 成功响应 = 上游可用：清掉该凭证的 429 冷却（对齐 devinTransport）。
          await recordLocalAvailability(200);
          logLocalRuntimeDiagnostic("provider.request.result", {
            agentKey: agentConfig.key,
            transport: "cursor-connect",
            ok: true,
            contentChars: (result.content ?? "").length,
            toolCallCount: result.tool_calls?.length ?? 0,
          });
          return result;
        } catch (error) {
          // Cursor Connect 的限流类 trailer 会把可用性信号附在 Error 上
          // （cursorProvider.buildCursorGrpcTrailerError）；读出来落冷却。
          const failure = readCursorUpstreamFailure(error);
          if (failure) {
            await recordLocalAvailability(failure.status, failure.body);
          }
          throw error;
        }
      },
    };
  }
  return null;
};
