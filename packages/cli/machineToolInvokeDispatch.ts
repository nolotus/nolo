// packages/cli/machineToolInvokeDispatch.ts
//
// 租户机器工具路由 — 机器侧 v1（读写文件工具）。
//
// 处理 server→machine 的 `tool.invoke` 帧：用本机 localWorkspaceTools 的
// readFile / globFiles / writeFile / editFile 执行器执行，结果按协议契约回传
// `{"type":"tool.result","requestId","result"| "error"}`。
//
// 安全模型（v1 硬边界）：
// - 工具白名单 = { readFile, globFiles, writeFile, editFile }。
//   execShell / launchProcess / captureVisualState 等执行/进程/视觉类名字不在
//   白名单内（路由决策：正则/token 门不能当任意 shell 的边界，shell 执行面整个
//   移出机器路由），一律回 error："tool not allowed in v1 (allowlisted
//   read/write file tools only)"。
// - 本机授权复核（纵深防御，失败关闭）：writeFile/editFile（write 维度）要求
//   payload.agentKey 非空且本机 NOLO_MACHINE_TOOL_GRANTS 中该 agentKey 的
//   write 维度严格为 true，否则回 error。每次实际执行的写调用追加一行到
//   <NOLO_HOME|~/.nolo>/logs/machine-tool-audit.jsonl。
// - 写工具（writeFile / editFile）与读工具共用同一套路径 containment：写目标
//   路径同样必须经 lexical + realpath 双侧解析后落在 workspaceRoot 内；
//   目标父级不存在时，对最深已存在祖先做同样的 realpath 检查，防止经
//   指向工作区外的 symlink 新建文件逃逸。
// - 硬 containment 在 dispatch 入口预检（本文件 machinePathPreflight）：
//   请求路径必须 lexically 解析在 workspaceRoot 内，且 realpath 双侧解析
//   （路径 + workspaceRoot，吸收 macOS /var → /private/var 等 symlink 父链）
//   后仍落在 workspaceRoot 内 —— 无任何例外（含 runtime spill 路径），
//   symlink 指向工作区外的一律拒绝。预检失败在触碰执行器之前回 error。
//   预检/删除守卫与执行器共用 localWorkspaceTools 导出的
//   resolveRequestedWorkspacePath（`~` 展开 + resolve）作为「请求路径 → 绝对
//   路径」单一真源，保证守卫检查的文件就是执行器实际读写的文件。
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

import { appendFile, lstat, mkdir, readFile, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

import {
  createLocalWorkspaceToolExecutors,
  NEW_TEXT_FIELD_ALIASES,
  resolveRequestedWorkspacePath,
} from "../agent-runtime/localWorkspaceTools";
import { PATH_FIELD_ALIASES } from "../agent-runtime/localWorkspaceToolInternals";
import type { AgentRuntimeToolCallInput } from "../agent-runtime/hostAdapter";
import {
  normalizeMachineToolGrants,
  type MachineToolGrants,
} from "../agent-runtime/machineToolGrants";
import { readMachineToolGrants } from "./machineCommands";

// M6-R：MachineToolGrants 类型与 normalizeMachineToolGrants 现以 agent-runtime 的
// machineToolGrants 为单一真源（服务端 parseHandshakeToolGrants 同源 import）。此处
// re-export 类型，供 machineCommands 等既有 `from "./machineToolInvokeDispatch"` 导入保持可用。
export type { MachineToolGrants } from "../agent-runtime/machineToolGrants";

/**
 * 白名单：两个读工具 + 两个写工具（写类另需本机 grants 复核）。
 * execShell / launchProcess / captureVisualState 等执行/进程/视觉类工具不在
 * 名单内，一律拒绝（与 launchProcess 同等对待）。
 */
export const MACHINE_TOOL_INVOKE_V1_TOOL_NAMES = [
  "readFile",
  "globFiles",
  "writeFile",
  "editFile",
] as const;

/** 白名单：任何白名单外工具名（launchProcess 等）一律拒绝。 */
const V1_ALLOWED_TOOL_NAMES = new Set<string>(MACHINE_TOOL_INVOKE_V1_TOOL_NAMES);

/** 默认单次调用内部超时（ms）。 */
export const DEFAULT_TOOL_INVOKE_TIMEOUT_MS = 30_000;

const TOOL_RESULT_MESSAGE_MAX_CHARS = 1_000_000;

/** 统一拒绝文案：白名单外工具（launchProcess / captureVisualState …）。 */
const TOOL_NOT_ALLOWED_MESSAGE = "tool not allowed in v1 (allowlisted read/write file tools only)";

/** payload 缺失 / 非对象时的专用文案（不与白名单拒绝混淆）。 */
const TOOL_PAYLOAD_MALFORMED_MESSAGE =
  "malformed tool.invoke payload (payload object required)";

/** 单次工具调用参数（payload.args）畸形时的专用文案。 */
const TOOL_ARGS_MALFORMED_MESSAGE = "malformed tool.invoke args (args object required)";

/** 需要本机授权复核的工具 → grants 维度。readFile / globFiles 不在此表，不受影响。 */
const GRANT_DIMENSION_BY_TOOL: Record<string, "write"> = {
  writeFile: "write",
  editFile: "write",
};

/** 审计 target 截断上限。 */
const AUDIT_TARGET_MAX_CHARS = 200;

function machineToolNotGrantedMessage(toolName: string, agentKey: string | undefined) {
  const dimension = GRANT_DIMENSION_BY_TOOL[toolName];
  return agentKey
    ? `tool not granted on this machine: ${toolName} requires ${dimension} grant for agent ${agentKey} (NOLO_MACHINE_TOOL_GRANTS)`
    : `tool not granted on this machine: ${toolName} requires an agentKey with ${dimension} grant (NOLO_MACHINE_TOOL_GRANTS)`;
}

// M6-R：normalizeMachineToolGrants 已上移到 agent-runtime/machineToolGrants 作单一
// 真源（服务端 parseHandshakeToolGrants 同源 import），本文件从该模块 import，不再
// 保有自己的一份实现——消除「服务端放行、机器侧拒绝」的跨端裁定分裂。

/** 失败关闭：agentKey 非空且该 agent 对应维度严格为 true 才放行。 */
function isMachineToolGranted(
  grants: MachineToolGrants | undefined,
  toolName: string,
  agentKey: string | undefined
): boolean {
  const dimension = GRANT_DIMENSION_BY_TOOL[toolName];
  if (!dimension) return true;
  // M6：agentKey 同样 trim 后查找（服务端下发 payload 前已 trim，这里是对称
  // 规范化的纵深防御）。
  const normalizedAgentKey = typeof agentKey === "string" ? agentKey.trim() : "";
  if (!normalizedAgentKey || !grants) return false;
  if (!Object.prototype.hasOwnProperty.call(grants, normalizedAgentKey)) return false;
  const entry = grants[normalizedAgentKey];
  if (!isRecord(entry)) return false;
  return entry[dimension] === true;
}

function resolveMachineToolAuditLogPath(): string {
  const noloHome = process.env.NOLO_HOME?.trim();
  const base = noloHome ? noloHome : join(homedir(), ".nolo");
  return join(base, "logs", "machine-tool-audit.jsonl");
}

function auditTargetFor(executorArgs: unknown): string {
  const target = extractMachineToolRequestPath(executorArgs) ?? "";
  return target.length > AUDIT_TARGET_MAX_CHARS ? target.slice(0, AUDIT_TARGET_MAX_CHARS) : target;
}

/**
 * 执行器「已 resolve 但执行失败」的标记（M3）：执行器用 metadata 表达失败
 * （非零 exitCode / timedOut / aborted）而不抛异常；readFile / globFiles /
 * writeFile / editFile 的失败路径是 throw（被折成 tool.result error 后走 catch，
 * 到不了这里），其成功 metadata 不含以下任何字段。
 */
function machineToolOutcomeFailed(outcome: {
  metadata?: Record<string, unknown>;
}): boolean {
  const metadata = outcome.metadata;
  if (!isRecord(metadata)) return false;
  if (metadata.timedOut === true) return true;
  if (metadata.aborted === true) return true;
  const exitCode = metadata.exitCode;
  return typeof exitCode === "number" && exitCode !== 0;
}

/**
 * best-effort 本地审计：建目录 + 追加一行 JSON；任何失败只 warn，绝不影响工具结果。
 *
 * ok 语义（M3 修复）：executor promise resolve ≠ 执行成功。ok=true 当且仅当
 * 「执行器回报成功完成」——promise resolve 且 metadata 无失败标记（非零
 * exitCode / timedOut / aborted）；executor throw 或调用超时同样记 ok:false。
 */
async function appendMachineToolAudit(entry: {
  agentKey: string | undefined;
  tool: string;
  target: string;
  ok: boolean;
}): Promise<void> {
  try {
    const logPath = resolveMachineToolAuditLogPath();
    await mkdir(dirname(logPath), { recursive: true });
    await appendFile(
      logPath,
      `${JSON.stringify({ ts: new Date().toISOString(), agentKey: entry.agentKey ?? null, tool: entry.tool, target: entry.target, ok: entry.ok })}\n`,
      "utf8"
    );
  } catch (error) {
    console.warn(`[nolo] machine tool audit write failed: ${toMessage(error)}`);
  }
}

type MachineToolInvokeExecutor = (
  call: AgentRuntimeToolCallInput
) => Promise<{ content: string; metadata?: Record<string, unknown> }>;

export type CreateMachineToolInvokeHandlersArgs = {
  /** daemon 进程 cwd：用户运行 `nolo connect` 的目录。 */
  workspaceRoot: string;
  /** 可注入执行器工厂（单测）。默认绑定 localWorkspaceTools 的 readFile/globFiles。 */
  createToolExecutors?: typeof createLocalWorkspaceToolExecutors;
  /** 读取 NOLO_MACHINE_TOOL_GRANTS 的 env（默认 process.env）。 */
  env?: Record<string, string | undefined>;
  /** 直接注入 grants（单测）；提供时优先于 env。 */
  grants?: MachineToolGrants;
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
    timeoutMs?: unknown,
    agentKey?: string
  ) => Promise<{ result?: string; error?: string }>;
};

export function createMachineToolInvokeHandlers(
  args: CreateMachineToolInvokeHandlersArgs
): MachineToolInvokeHandlers {
  // 本机工具授权（纵深防御）：在建 handlers 时从 env 读一次，进程生命周期内
  // 不变 —— 与 connector 凭据/grants 只在启动时读取的语义一致，改
  // NOLO_MACHINE_TOOL_GRANTS 需重启 connector 才生效。畸形/缺失 → undefined
  // → 写类工具全部拒绝（失败关闭）。
  // M6-R：与服务端握手解析同源的单一 normalize（raw 直通，含 trim / 只认 write /
  // 无效条目不覆盖）。readMachineToolGrants 返回原始解析对象，交由 normalize 收口。
  const grants = normalizeMachineToolGrants(
    args.grants ?? readMachineToolGrants(args.env ?? process.env)
  );
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
    workspaceRoot: string,
    agentKey: string | undefined
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
    // H3（收紧，失败关闭）：纯删除数据的写调用在执行前拦截，原文件不动。
    const deleteGuardError = await machinePureDeleteGuard(toolName, executorArgs, workspaceRoot);
    if (deleteGuardError) return { error: deleteGuardError };
    let timer: ReturnType<typeof setTimeout> | null = null;
    const audited = toolName in GRANT_DIMENSION_BY_TOOL;
    let auditOk = false;
    try {
      const outcome = await Promise.race([
        executorMap[toolName](call),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`tool.invoke timed out after ${timeoutMs}ms`)), timeoutMs);
        }),
      ]);
      const content = typeof outcome?.content === "string" ? outcome.content : "";
      // M3 修复：executor promise resolve 不代表执行成功——执行器用 metadata
      // 表达失败（非零 exitCode / timedOut / aborted），不抛异常。审计 ok 必须
      // 从结果计算，否则失败执行会被记成成功。
      auditOk = !machineToolOutcomeFailed(outcome);
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
      // 只审计实际进入执行器的写调用（授权拒绝与 containment 拒绝不落此日志）。
      if (audited) {
        await appendMachineToolAudit({
          agentKey,
          tool: toolName,
          target: auditTargetFor(executorArgs),
          ok: auditOk,
        });
      }
    }
  };

  const invokeMachineTool = async (
    requestId: string,
    toolName: string,
    toolArgs: unknown,
    timeoutMs?: unknown,
    agentKey?: string
  ): Promise<{ result?: string; error?: string }> => {
    // 白名单校验先行：非白名单名（含缺失/非字符串名）在碰执行器之前拒绝。
    if (!V1_ALLOWED_TOOL_NAMES.has(toolName)) {
      return { error: TOOL_NOT_ALLOWED_MESSAGE };
    }
    // 执行前授权复核（失败关闭）：写类工具要求 agentKey 非空且本机
    // grants 对应维度严格为 true；否则回可读 error，不碰执行器。
    if (!isMachineToolGranted(grants, toolName, agentKey)) {
      return { error: machineToolNotGrantedMessage(toolName, agentKey) };
    }
    const resolvedTimeout = resolveTimeoutMs(timeoutMs);
    return invokeWithTimeout(toolName, toolArgs, resolvedTimeout, args.workspaceRoot, agentKey);
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
        payload.timeoutMs,
        payload.agentKey
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
 * 1. 词法 containment：resolveRequestedWorkspacePath(workspaceRoot, request)（与
 *    执行器同源的 `~` 展开 + resolve）必须仍在 workspaceRoot 内 —— `..` 逃逸、
 *    绝对路径、spill 目录（~/.nolo/spills/…）都在这里拒绝；
 * 2. symlink 逃逸：realpath(请求路径) 与 realpath(workspaceRoot) 双侧解析
 *    （吸收 macOS /var → /private/var 这类 symlink 父链）后，解析结果必须
 *    仍落在解析后的 workspaceRoot 内 —— 工作区内指向外部的 symlink 一律拒绝。
 */
async function machinePathPreflight(args: {
  workspaceRoot: string;
  request: string;
}): Promise<string | null> {
  const workspaceRoot = resolve(args.workspaceRoot);
  // 单一真源：与执行器（localWorkspaceTools.resolveLocalWorkspaceToolPath）用同一
  // 个「请求路径 → 绝对路径」解析。以前这里用裸 resolve(workspaceRoot, request)，
  // `~` 前缀下检查的是 <ws>/~/x 而执行器读 <home>/x —— 守卫/预检看的文件不是
  // 执行器实际碰的文件（B-review MEDIUM#1/#2）。
  const lexicalPath = resolveRequestedWorkspacePath(workspaceRoot, args.request);
  if (!isLexicallyInsideRoot(workspaceRoot, lexicalPath)) {
    return `path outside workspace root: ${args.request}`;
  }
  // symlink 检查要求每一级路径组件都已存在（lstat 逐级判定）。
  // 组件缺失时不能直接放行：写工具（writeFile / editFile）会在缺失路径上
  // 新建文件，若已存在的最深祖先是指向工作区外的 symlink（如 ws/link → /etc，
  // 请求 link/new.txt），新文件会经 symlink 逃逸出工作区。因此缺失时改为
  // 对最深的已存在祖先做 realpath 双侧 containment 检查，再交执行器。
  let current = lexicalPath;
  const symlinks: { link: string; target: string }[] = [];
  while (true) {
    const stats = await lstat(current).catch(() => undefined);
    if (!stats) {
      // 组件不存在：回溯到最深的已存在祖先，对其做 realpath 双侧 containment。
      const parent = resolve(current, "..");
      if (parent === current) return null;
      return await ancestorContainmentPreflight({
        workspaceRoot,
        ancestor: parent,
        request: args.request,
      });
    }
    if (!stats.isSymbolicLink()) break;
    const target = await realpath(current).catch(() => undefined);
    // 悬空 symlink（lstat 存在、realpath 失败）：写工具会沿它的目标新建文件，
    // 不能因 realpath 失败而放行，一律按 symlink 逃逸拒绝。
    if (!target) {
      return `path outside workspace root after symlink resolution: ${args.request}`;
    }
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
/**
 * 缺失路径的 containment：请求路径的父级（ancestor）已确认不存在或为缺失组件的
 * 祖先，向上回溯到第一个已存在的目录后做 realpath 双侧比较。ancestor 本身已由
 * machinePathPreflight 的 lexical 检查保证位于 workspaceRoot 内。
 */
async function ancestorContainmentPreflight(args: {
  workspaceRoot: string;
  ancestor: string;
  request: string;
}): Promise<string | null> {
  const workspaceRoot = resolve(args.workspaceRoot);
  let existing = args.ancestor;
  while (true) {
    const stats = await lstat(existing).catch(() => undefined);
    if (stats) break;
    const parent = resolve(existing, "..");
    if (parent === existing) return null;
    existing = parent;
  }
  // 最深已存在祖先同样要求 realpath 双侧 containment（含 symlink 指向外部的情况）。
  try {
    const [realExisting, realRoot] = await Promise.all([realpath(existing), realpath(workspaceRoot)]);
    if (!isLexicallyInsideRoot(realRoot, realExisting)) {
      return `path outside workspace root after symlink resolution: ${args.request}`;
    }
  } catch {
    // 祖先存在却无法 realpath（悬空 symlink 等）→ 按 symlink 逃逸拒绝。
    return `path outside workspace root after symlink resolution: ${args.request}`;
  }
  return null;
}

/**
 * H3 专用拒绝文案（与 grant / containment 拒绝刻意区分，便于模型定位拒绝原因：
 * 这是「不允许删数据」，不是「没授权」也不是「路径越界」）。
 */
const WRITEFILE_DELETE_GUARD_MESSAGE =
  "writeFile blocked: refusing to overwrite an existing non-empty file with empty content " +
  "(data-deletion guard). Use editFile with the exact oldText to remove specific text, or " +
  "write the intended content explicitly.";
const EDITFILE_DELETE_GUARD_MESSAGE =
  "editFile blocked: refusing to replace matched text with an empty newText (data-deletion " +
  "guard). Provide the intended replacement text.";

/** 从 executorArgs（对象或 JSON 字符串）里按别名序取第一个 string 字段值。 */
function extractMachineToolStringField(
  executorArgs: unknown,
  aliases: readonly string[]
): string | undefined {
  const rawArgs =
    typeof executorArgs === "string"
      ? executorArgs
      : executorArgs !== undefined && executorArgs !== null
        ? JSON.stringify(executorArgs)
        : null;
  if (rawArgs === null) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawArgs);
  } catch {
    return undefined;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return undefined;
  for (const key of aliases) {
    const value = (parsed as Record<string, unknown>)[key];
    if (typeof value === "string") return value;
  }
  return undefined;
}

/**
 * H3（收紧，失败关闭）：有写授权的 agent 不得在无确认、无待删清单的情况下删光文件
 * 内容。两类纯删除在执行前拦截（原文件逐字不动）：
 *   1. writeFile：目标文件已存在且当前非空，而新 content 去除首尾空白后为空 → 拒绝。
 *   2. editFile：newText 去除首尾空白后为空（纯文本删除）→ 拒绝。
 *
 * 明确**不做**（边界与理由）：覆盖写（新 content 非空）仍然允许——用非空内容覆盖既有
 * 文件是 write 授权的既定语义（模型显式给出新内容即表达覆盖意图），把它也纳入删除门
 * 会有悖授权边界、且超出本轮「纯删除」范围，故不拦截。新文件 + 空 content 同样放行：
 * 创建空文件不是删除既有数据。
 *
 * 返回拒绝文案或 null（放行）。缺字段 / 非字符串 content|newText 一律放行，交由执行器
 * 给出既有参数校验错误（那不是删除语义）。
 */
async function machinePureDeleteGuard(
  toolName: string,
  executorArgs: unknown,
  workspaceRoot: string
): Promise<string | null> {
  if (toolName === "writeFile") {
    const content = extractMachineToolStringField(executorArgs, ["content"]);
    // 新内容非空（或缺失，交由执行器报参数错）→ 覆盖写 / 畸形调用，允许。
    if (content === undefined || content.trim() !== "") return null;
    // 新内容为空串/纯空白：仅当目标文件已存在且当前非空才构成「删光既有数据」。
    const requestPath = extractMachineToolRequestPath(executorArgs);
    if (requestPath === null) return null; // 无路径 → 交由执行器报错
    let current: string;
    try {
      // 单一真源：读执行器将要读写的那个文件（`~` 前缀同样先展开），否则守卫
      // 查 <ws>/~/x（ENOENT 放行）而执行器清空 <home>/x。
      current = await readFile(resolveRequestedWorkspacePath(workspaceRoot, requestPath), "utf8");
    } catch {
      // 文件不存在或读不到 → 不是「已存在的非空文件被清空」，放行（执行器自负）。
      return null;
    }
    return current.length > 0 ? WRITEFILE_DELETE_GUARD_MESSAGE : null;
  }
  if (toolName === "editFile") {
    const newText = extractMachineToolStringField(executorArgs, NEW_TEXT_FIELD_ALIASES);
    // newText 缺失 → 交由执行器报「requires string newText」；存在但去空白为空 → 拒绝。
    if (newText !== undefined && newText.trim() === "") return EDITFILE_DELETE_GUARD_MESSAGE;
    return null;
  }
  return null;
}

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
  payload: { tool: string; args: unknown; timeoutMs?: unknown; agentKey?: string };
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
      agentKey:
        typeof payload.agentKey === "string" && payload.agentKey.length > 0 ? payload.agentKey : undefined,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}