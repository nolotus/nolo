// packages/cli/machineToolInvokeDispatch.ts
//
// 租户机器工具路由 — 机器侧 v1（只读）。
//
// 处理 server→machine 的 `tool.invoke` 帧：用本机 localWorkspaceTools 的
// readFile / globFiles 执行器执行，结果按协议契约回传
// `{"type":"tool.result","requestId","result"| "error"}`。
//
// 安全模型（v1 硬边界）：
// - 工具白名单 = { readFile, globFiles }，其余名字（writeFile / execShell /
//   editFile / launchProcess …）一律回 error："tool not allowed in v1 (read-only)"。
// - 硬 containment 在 dispatch 入口预检（本文件 machinePathPreflight）：
//   请求路径必须 lexically 解析在 workspaceRoot 内，且 realpath 双侧解析
//   （路径 + workspaceRoot，吸收 macOS /var → /private/var 等 symlink 父链）
//   后仍落在 workspaceRoot 内 —— 无任何例外（含 runtime spill 路径），
//   symlink 指向工作区外的一律拒绝。预检失败在触碰执行器之前回 error。
//   localWorkspaceTools 的 TUI 交互语义（confirm 回调 / spill 例外 /
//   会话级去重 ledger）在本通路不参与：机器侧注入恒拒 confirm +
//   无 ledger 的执行器，readFile 每次都返回真实内容（等价 force:true）。
// - payload.args 缺字段 / 类型错 → 执行器抛错 → 回 error，绝不抛进程级异常。
// - 单次调用内部超时：payload.timeoutMs（默认 30s，仅接受正有限数），
//   到期回 error："tool.invoke timed out after Nms"。
//
// demux 挂点：machineCommands.ts runMachineConnectCommand 的 onMessage
// （`--ws` / `--daemon` 会话共用），与 handleConnectorRunMessage（agent.run）
// 并列，先于其尝试 tool.invoke，避免 agent.run 专属帧被误读。
// daemon 进程 cwd（用户跑 `nolo connect` 的目录）即 workspaceRoot。

import { lstat, realpath } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

import { createLocalWorkspaceToolExecutors } from "../agent-runtime/localWorkspaceTools";
import { PATH_FIELD_ALIASES } from "../agent-runtime/localWorkspaceToolInternals";
import type { AgentRuntimeToolCallInput } from "../agent-runtime/hostAdapter";

/** v1 唯一允许的工具名（只读面）。 */
export const MACHINE_TOOL_INVOKE_V1_TOOL_NAMES = ["readFile", "globFiles"] as const;

/** v1 白名单：任何白名单外工具名（写/执行/进程控制等）一律拒绝。 */
const V1_ALLOWED_TOOL_NAMES = new Set<string>(MACHINE_TOOL_INVOKE_V1_TOOL_NAMES);

/** 默认单次调用内部超时（ms）。 */
export const DEFAULT_TOOL_INVOKE_TIMEOUT_MS = 30_000;

const TOOL_RESULT_MESSAGE_MAX_CHARS = 1_000_000;

/** 统一拒绝文案（协议契约逐字要求）。 */
const TOOL_NOT_ALLOWED_MESSAGE = "tool not allowed in v1 (read-only)";

/** payload 缺失 / 非对象时的专用文案（不与白名单拒绝混淆）。 */
const TOOL_PAYLOAD_MALFORMED_MESSAGE =
  "malformed tool.invoke payload (payload object required)";

/** 单次工具调用参数（payload.args）畸形时的专用文案。 */
const TOOL_ARGS_MALFORMED_MESSAGE = "malformed tool.invoke args (args object required)";

type MachineToolInvokeExecutor = (
  call: AgentRuntimeToolCallInput
) => Promise<{ content: string; metadata?: Record<string, unknown> }>;

export type CreateMachineToolInvokeHandlersArgs = {
  /** daemon 进程 cwd：用户运行 `nolo connect` 的目录。 */
  workspaceRoot: string;
  /** 可注入执行器工厂（单测）。默认绑定 localWorkspaceTools 的 readFile/globFiles。 */
  createToolExecutors?: typeof createLocalWorkspaceToolExecutors;
};

export type MachineToolInvokeHandlers = {
  /** 解析 tool.invoke 帧：非 tool.invoke 帧返回 null（demux 交给 agent.run 链路）。 */
  handleToolInvokeMessage: (
    message: string,
    send: (message: string) => void
  ) => Promise<string | null>;
  /** 底层执行（仅测试/诊断用）：返回 { result } 或 { error }，不负责回传。 */
  invokeMachineTool: (
    requestId: string,
    toolName: string,
    args: unknown,
    timeoutMs?: unknown
  ) => Promise<{ result?: string; error?: string }>;
};

export function createMachineToolInvokeHandlers(
  args: CreateMachineToolInvokeHandlersArgs
): MachineToolInvokeHandlers {
  const executors = (args.createToolExecutors ?? createLocalWorkspaceToolExecutors)({
    workspaceRoot: args.workspaceRoot,
    // v1 硬 containment：localWorkspaceTools 在无确认回调时对工作区外路径
    // 默认放行（交互式 TUI 语义）。机器侧是无人值守的 server 驱动调用，
    // 一律拒绝外部路径 —— 该回调只对「未走 spill 例外」的工作区外路径触发，
    // 是纵深防御的第二层；第一层是 dispatch 入口的 machinePathPreflight
    // （词法 + realpath 双检，spill 路径同样被拒，confirm 不可达）。
    confirmExternalFileAccess: async () => false,
    // 机器协议 v1（M3 修复）：TUI 的 readFile 去重 ledger 面向「同一会话的
    // 重复读提示」，daemon 长生命周期会让它跨越多个 server 会话 —— 新会话
    // 重读同一文件会拿到去重文案而非内容。readFileNoLedger 关闭去重 ledger，
    // 机器侧 readFile 每次都返回真实内容，语义等价于 TUI 的 force:true。
    readFileNoLedger: true,
  });
  const executorMap = executors as unknown as Record<
    string,
    (call: AgentRuntimeToolCallInput) => Promise<{ content: string; metadata?: Record<string, unknown> }>
  >;

  const invokeWithTimeout = async (
    toolName: string,
    executorArgs: unknown,
    timeoutMs: number,
    workspaceRoot: string
  ): Promise<{ result?: string; error?: string }> => {
    const call: AgentRuntimeToolCallInput = {
      id: "machine-tool-invoke",
      name: toolName,
      arguments: typeof executorArgs === "string" ? executorArgs : JSON.stringify(executorArgs ?? {}),
    };
    // v1 硬 containment 预检（M1/M2 修复）：在触碰执行器之前对请求路径做
    // 词法 + realpath 双检 —— spill 例外（执行器内部 allowRuntimeOwnedSpill）
    // 与 symlink 逃逸都不再可达。路径提取失败（非对象 args）时跳过预检，
    // 由执行器的参数校验给出既有错误语义。
    const requestPath = extractMachineToolRequestPath(executorArgs);
    if (requestPath !== null) {
      const preflightError = await machinePathPreflight({
        workspaceRoot,
        request: requestPath,
      });
      if (preflightError) return { error: preflightError };
    }
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      const outcome = await Promise.race([
        executorMap[toolName](call),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`tool.invoke timed out after ${timeoutMs}ms`)), timeoutMs);
        }),
      ]);
      const content = typeof outcome?.content === "string" ? outcome.content : "";
      if (content.length > TOOL_RESULT_MESSAGE_MAX_CHARS) {
        return {
          result:
            content.slice(0, TOOL_RESULT_MESSAGE_MAX_CHARS) +
            `\n\n[... output truncated at ${TOOL_RESULT_MESSAGE_MAX_CHARS} chars ...]`,
        };
      }
      return { result: content };
    } catch (error) {
      return { error: toMessage(error) };
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  const invokeMachineTool = async (
    requestId: string,
    toolName: string,
    toolArgs: unknown,
    timeoutMs?: unknown
  ): Promise<{ result?: string; error?: string }> => {
    // 白名单校验先行：非白名单名（含缺失/非字符串名）在碰执行器之前拒绝。
    if (!V1_ALLOWED_TOOL_NAMES.has(toolName)) {
      return { error: TOOL_NOT_ALLOWED_MESSAGE };
    }
    const resolvedTimeout = resolveTimeoutMs(timeoutMs);
    return invokeWithTimeout(toolName, toolArgs, resolvedTimeout, args.workspaceRoot);
  };

  return {
    handleToolInvokeMessage: async (message, send) => {
      const frame = parseToolInvokeFrame(message);
      if (!frame) return null;
      const { requestId, payload } = frame;
      // payload 缺失 / 非对象：有合法 requestId，必须回包 —— 专用 malformed
      // 文案，不与白名单拒绝（tool not allowed）混淆。
      if (frame.payloadMalformed) {
        send(
          JSON.stringify({ type: "tool.result", requestId, error: TOOL_PAYLOAD_MALFORMED_MESSAGE })
        );
        return JSON.stringify({ type: "tool.result", requestId, error: TOOL_PAYLOAD_MALFORMED_MESSAGE });
      }
      // payload.args 畸形（非对象）：同样回专用 error 文案，不进执行器，
      // 不抛进程级异常。
      if (!isRecord(payload.args)) {
        send(
          JSON.stringify({ type: "tool.result", requestId, error: TOOL_ARGS_MALFORMED_MESSAGE })
        );
        return JSON.stringify({ type: "tool.result", requestId, error: TOOL_ARGS_MALFORMED_MESSAGE });
      }
      const outcome = await invokeMachineTool(
        requestId,
        payload.tool,
        payload.args,
        payload.timeoutMs
      );
      send(
        JSON.stringify(
          outcome.error !== undefined
            ? { type: "tool.result", requestId, error: outcome.error }
            : { type: "tool.result", requestId, result: outcome.result ?? "" }
        )
      );
      return JSON.stringify(
        outcome.error !== undefined
          ? { type: "tool.result", requestId, error: outcome.error }
          : { type: "tool.result", requestId, result: outcome.result ?? "" }
      );
    },
    invokeMachineTool,
  };
}

function resolveTimeoutMs(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TOOL_INVOKE_TIMEOUT_MS;
}

function toMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return "tool.invoke failed";
}

function isLexicallyInsideRoot(root: string, targetPath: string): boolean {
  const rel = relative(resolve(root), resolve(targetPath));
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

/**
 * v1 硬 containment 预检（在触碰执行器之前调用）。
 *
 * 返回 null 表示路径允许进入执行器；否则返回机器可读的拒绝原因。
 * 两条规则，无任何例外（尤其没有 runtime spill 例外）：
 * 1. 词法 containment：resolve(workspaceRoot, request) 必须仍在 workspaceRoot
 *    内 —— `..` 逃逸、绝对路径、spill 目录（~/.nolo/spills/…）都在这里拒绝；
 * 2. symlink 逃逸：realpath(请求路径) 与 realpath(workspaceRoot) 双侧解析
 *    （吸收 macOS /var → /private/var 这类 symlink 父链）后，解析结果必须
 *    仍落在解析后的 workspaceRoot 内 —— 工作区内指向外部的 symlink 一律拒绝。
 */
async function machinePathPreflight(args: {
  workspaceRoot: string;
  request: string;
}): Promise<string | null> {
  const workspaceRoot = resolve(args.workspaceRoot);
  const lexicalPath = resolve(workspaceRoot, args.request);
  if (!isLexicallyInsideRoot(workspaceRoot, lexicalPath)) {
    return `path outside workspace root: ${args.request}`;
  }
  // symlink 检查要求每一级路径组件都已存在（lstat 逐级判定）；缺失路径
  // （readFile 的 ENOENT / globFiles 的待创建目录）交由执行器的既有语义处理。
  let current = lexicalPath;
  const symlinks: { link: string; target: string }[] = [];
  while (true) {
    const stats = await lstat(current).catch(() => undefined);
    if (!stats) {
      // 组件不存在：向上已检查过的部分没有 symlink，放行给执行器（ENOENT 语义）。
      return null;
    }
    if (!stats.isSymbolicLink()) break;
    const target = await realpath(current).catch(() => undefined);
    if (!target) return null;
    symlinks.push({ link: current, target });
    // 继续沿 symlink 链向上检查剩余路径组件。
    current = resolve(current, "..");
    if (current === dirname(current)) break;
  }
  // 双侧 realpath：把请求路径与 workspaceRoot 都解析到物理路径再比对，
  // macOS /var → /private/var 这类 symlink 父链不会误判为越界。
  try {
    const [realRequest, realRoot] = await Promise.all([realpath(lexicalPath), realpath(workspaceRoot)]);
    if (!isLexicallyInsideRoot(realRoot, realRequest)) {
      return `path outside workspace root after symlink resolution: ${args.request}`;
    }
  } catch (error) {
    // 路径本身不存在时 readFile/globFiles 会给出 ENOENT，这里不能因
    // realpath 失败而把合法的「读一个不存在的文件」误判成越界。
    if (symlinks.length === 0) return null;
    void error;
    return `path outside workspace root after symlink resolution: ${args.request}`;
  }
  // 有 symlink 但中间组件缺失（link target 存在但 lexicalPath 之下断链）：
  // realpath(lexicalPath) 会失败 —— 上面的 catch 已按 symlink 链拒绝。
  return null;
}

/** 提取 tool.args 中的请求路径（与 localWorkspaceTools 的别名序保持一致）。 */
function extractMachineToolRequestPath(executorArgs: unknown): string | null {
  // executorArgs 既可能是已序列化的 JSON 字符串（handleToolInvokeMessage 路径，
  // args 经 JSON 往返后仍为对象 → 这里补一次 stringify），也可能本身就是
  // 字符串（invokeMachineTool 直呼的测试/诊断路径）。两种形态都必须预检。
  const rawArgs =
    typeof executorArgs === "string"
      ? executorArgs
      : executorArgs !== undefined && executorArgs !== null
        ? JSON.stringify(executorArgs)
        : null;
  if (rawArgs === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawArgs);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
  for (const key of PATH_FIELD_ALIASES) {
    const value = (parsed as Record<string, unknown>)[key];
    if (typeof value === "string" && value.length > 0) return value.trim();
  }
  return null;
}

function parseToolInvokeFrame(message: string): {
  requestId: string;
  payload: { tool: string; args: unknown; timeoutMs?: unknown };
  payloadMalformed?: boolean;
} | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(message);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || parsed.type !== "tool.invoke") return null;
  // 缺 requestId / 非字符串 requestId：无法回包（协议里没有匿名回包地址），
  // 视为非本协议帧静默忽略。
  if (typeof parsed.requestId !== "string" || parsed.requestId.length === 0) return null;
  if (!isRecord(parsed.payload)) {
    // payload 缺失 / 非对象：有合法 requestId，回包责任在
    // handleToolInvokeMessage（malformed payload 专用文案）。
    return {
      requestId: parsed.requestId,
      payload: { tool: "", args: {}, timeoutMs: undefined },
      payloadMalformed: true,
    };
  }
  const payload = parsed.payload;
  return {
    requestId: parsed.requestId,
    payload: {
      tool: typeof payload.tool === "string" ? payload.tool : "",
      args: payload.args,
      timeoutMs: payload.timeoutMs,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}