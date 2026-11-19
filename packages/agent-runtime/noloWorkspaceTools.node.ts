import { workspaceChildEnv } from "./workspaceShell";
import type { PlanningCaller } from "../ai/agent/agentDiscovery";
/**
 * Node-only workspace tool executors.
 *
 * Split out of `noloWorkspaceTools.ts` so the RN renderer bundle never pulls in
 * `node:fs` / `skillDiscovery` (which statically imports `node:fs`). Metro
 * statically resolves `await import(...)` even inside functions that are never
 * called on the RN side, so any module reachable from the RN graph that contains
 * a `node:fs` dynamic import breaks the bundle.
 *
 * Only Node hosts (CLI localRuntimeAdapter, desktop turn service) import from
 * this module. The pure argument-parsing helpers stay in `noloWorkspaceTools.ts`.
 */
import { isAgentSkillDisabled, type AgentSkillConfigSource } from "../ai/tools/agentSkillConfig";
import { resolveLocalUserId } from "../cli/client/cliAgentConfigHelpers";
import { dialogMessageRange } from "../database/keys";
import { isTombstoneRecord } from "../database/tombstones";
import { localDialogMessageRecordToRuntimeMessage } from "../cli/client/localDialogRecords";
import {
  BRIDGE_STREAM_MAX_CHARS,
  buildDialogReadEnvelope,
  createStreamingDialogReadProjector,
  DEFAULT_READ_DIALOG_MAX_RESPONSE_CHARS,
  readTextStreamUpToChars,
} from "./dialogReadProjection";
import {
  buildNoloWorkspaceCommandArgs,
  noloPositiveIntegerString,
  noloStringArg,
  parseNoloWorkspaceToolArguments,
  resolveNoloDialogInput,
  CLI_NOLO_WORKSPACE_TOOL_NAMES,
} from "./noloWorkspaceTools";
import { spawnToWebStreams } from "./runtimeCompat";

async function readNoloProcessStream(readable: ReadableStream<Uint8Array> | null) {
  return readTextStreamUpToChars(readable, BRIDGE_STREAM_MAX_CHARS);
}

type NoloSpawnProcess = {
  stdout: ReadableStream<Uint8Array> | null;
  stderr: ReadableStream<Uint8Array> | null;
  exited: Promise<number>;
};

type NoloSpawn = (options: {
  cmd: string[];
  stdout: "pipe";
  stderr: "pipe";
  env?: Record<string, string | undefined>;
}) => NoloSpawnProcess;

export async function runNoloWorkspaceCliTool(call: {
  name: string;
  arguments: string;
}, args: {
  planningCaller?: PlanningCaller;
  cliEntrypoint?: string;
  env?: Record<string, string | undefined>;
  metadataKind?: string;
  processExecPath?: string;
  spawn?: NoloSpawn;
}) {
  const cliArgs = buildNoloWorkspaceCommandArgs(call);
  const bunSpawn = (globalThis as { Bun?: { spawn?: unknown } }).Bun?.spawn;
  const spawn: NoloSpawn = args.spawn
    ?? (typeof bunSpawn === "function"
      ? (bunSpawn as NoloSpawn)
      : nodeSpawnFallback);
  const execPath = args.processExecPath ?? process.execPath;
  const entrypoint = args.cliEntrypoint;
  // When the CLI is a standalone compiled binary, the executable itself is the
  // entrypoint; passing it again would make the binary interpret its own path
  // as a subcommand.
  const cmd = entrypoint && entrypoint !== execPath
    ? [execPath, entrypoint, ...cliArgs]
    : [execPath, ...cliArgs];
  const proc = spawn({
    cmd,
    stdout: "pipe",
    stderr: "pipe",
    env: workspaceChildEnv(call.name === "listAgents"
      ? { ...process.env, ...args.env, NOLO_PLANNING_CALLER: JSON.stringify(args.planningCaller ?? {}) }
      : args.env),
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    readNoloProcessStream(proc.stdout),
    readNoloProcessStream(proc.stderr),
    proc.exited,
  ]);
  const content = `${stdout.text}${stderr.text}`;
  if (exitCode !== 0) {
    throw new Error(content.trim() || `nolo ${cliArgs.join(" ")} exited ${exitCode}`);
  }
  const bridgedOutputTruncated = stdout.truncated || stderr.truncated;
  return {
    content,
    metadata: {
      [args.metadataKind ?? "noloWorkspaceTool"]: true,
      command: ["nolo", ...cliArgs].join(" "),
      exitCode,
      ...(bridgedOutputTruncated ? { bridgedOutputTruncated: true } : {}),
    },
  };
}

export type InProcessDialogStore = {
  read: (dbKey: string, options?: { remote?: boolean }) => Promise<unknown>;
  iterator?: (options: { gte: string; lte?: string; lt?: string; reverse?: boolean; limit?: number }) => AsyncIterable<[string, unknown]>;
};

/** 惰性解析本地 store：构建 executor map 时不打开 DB，也不阻塞同步签名。 */
export type InProcessDialogStoreResolver = () => Promise<InProcessDialogStore | undefined>;

export type NoloWorkspaceInProcessResult = {
  content: string;
  metadata?: Record<string, unknown>;
};

/**
 * 进程内 executor。返回 `null` 的语义是「本地路径回答不了这次调用」，
 * 调用方据此回退 CLI 桥——快路径不得因为省一次 spawn 而丢掉它自己无法
 * 复现的能力（远端历史、Space 索引等）。
 */
export type NoloWorkspaceInProcessExecutor = (
  call: { name: string; arguments: string },
  ctx: { env?: Record<string, string | undefined> }
) => Promise<NoloWorkspaceInProcessResult | null>;

/**
 * 本机独占对话判定：只有这类对话的本地副本可以当作权威，其它对话的本地
 * 副本随时可能落后于 Web/App 端的写入。
 * - 本机 run 记录里的子对话（`~/.nolo/runs/*.json` 的 dialogId 集合）；
 * - CLI 后台 run 写入的对话（`triggerType: "cli-agent-run"`）；
 * - 明确标注 `localRuntime` 且 `executionMode: "background"` 的对话。
 */
function isLocalExclusiveDialog(
  dialogId: string,
  meta: unknown,
  localChildDialogIds: ReadonlySet<string> | undefined
): boolean {
  if (localChildDialogIds?.has(dialogId)) return true;
  const record = meta as Record<string, unknown> | null;
  if (!record || typeof record !== "object") return false;
  if (record.triggerType === "cli-agent-run") return true;
  return Boolean(record.localRuntime) && record.executionMode === "background";
}

type InProcessDialogReadOutcome =
  | { outcome: "hit"; result: NoloWorkspaceInProcessResult }
  | { outcome: "fallback"; reason: string };

const fallback = (reason: string): InProcessDialogReadOutcome => ({ outcome: "fallback", reason });

/**
 * In-process `readDialog`. Returns `{ outcome: "fallback", reason }` when the
 * local store cannot answer (record absent, dialog meta present but no messages
 * locally, cross-user or cross-server request, tombstone): the caller then
 * falls back to the CLI bridge, which owns server-side auth, remote history and
 * multi-server reads. The reason is surfaced on the bridged result so a
 * downgrade never looks like "the dialog simply does not exist".
 * `store.read(dbKey)` without `remote` is local-first and only reaches the
 * network on a local miss, so the hit path stays sub-millisecond.
 *
 * 身份边界（review HIGH）：本地 `HybridRecordStore` 是多账号共享的，因此
 * - 模型传入的 `user/userId/owner` 一律不信：显式指定他人对话只能走带鉴权
 *   的 CLI 桥，这里直接 `return null`；
 * - `currentUserId` 只从宿主注入（或与 `resolveLocalUserId` 等价的宿主
 *   env/JWT 解析）取，取不到就不读本地库；
 * - 解析出的 owner 与宿主持有者不一致 → 不读。
 */
async function readDialogInProcess(
  call: { name: string; arguments: string },
  store: InProcessDialogStore,
  ctx: {
    env?: Record<string, string | undefined>;
    currentUserId?: string;
    localChildDialogIds?: ReadonlySet<string>;
  }
): Promise<InProcessDialogReadOutcome> {
  const args = parseNoloWorkspaceToolArguments(call.arguments);
  const dialogInput = noloStringArg(args.dialog ?? args.dialogId ?? args.id);
  if (!dialogInput) throw new Error("readDialog requires dialog.");

  const mode = noloStringArg(args.mode);
  if (mode && mode !== "full" && mode !== "status") {
    throw new Error(`readDialog mode must be "full" or "status", got "${mode}".`);
  }

  // 跨账号读取必须由服务端鉴权裁决，进程内直连无从校验。
  if (noloStringArg(args.user ?? args.userId ?? args.owner)) return fallback("explicit-user");
  // 跨机器 server 读取（`--server`）只有 CLI 桥能做。
  if (noloStringArg(args.server ?? args.serverBase ?? args.serverUrl)) return fallback("explicit-server");

  const currentUserId = ctx.currentUserId;
  if (!currentUserId) return fallback("no-current-user");

  const { dbKey: dialogKey, dialogId, ownerId } = resolveNoloDialogInput(dialogInput, currentUserId);
  // 输入直接指向他人对话（完整 dbKey / URL 带别人的 userId）→ 不读本地库。
  if (ownerId !== currentUserId) return fallback("foreign-owner");

  // 读 dialog meta（local-first：命中即返回，未命中才走 store 的远端回退）
  const meta = await store.read(dialogKey);
  // 本地/远端都读不到这条 dialog → 交给 CLI 桥（它有多 server 合并与
  // 本地库候选路径），绝不用 null meta 冒充「查到了一条空对话」。
  if (!meta) return fallback("local-miss");
  // 已删除（tombstone）记录不是可读对话：本地库会保留墓碑，必须跳过。
  if (isTombstoneRecord(meta)) return fallback("tombstone");

  // 本地库只是缓存，不是权威：一个在 Web/App 端继续进行的普通对话，本地
  // meta+消息可能停在几轮之前，直接返回就会漏掉最新轮次。因此只有「本机
  // 独占、无跨端并发写入」的对话才允许进程内直读——即本机 startAgentRun
  // 派发的子任务对话，或 CLI 后台 run 写入的对话。其余一律交回权威路径
  // （CLI 桥自身已有 local-db-fallback，离线可读性不受影响）。
  if (!isLocalExclusiveDialog(dialogId, meta, ctx.localChildDialogIds)) {
    return fallback("cross-device-sync");
  }


  if (mode === "status") {
    const result = {
      dialogId,
      dialogKey,
      meta,
      status: (meta as any)?.status ?? null,
      runtimeCheckpoint: (meta as any)?.runtimeCheckpoint ?? null,
      source: "in-process",
    };
    return {
      outcome: "hit",
      result: {
        content: JSON.stringify(result, null, 2),
        metadata: { noloWorkspaceTool: true, readDialog: true, inProcess: true, mode: "status" },
      },
    };
  }

  const limitNum = noloPositiveIntegerString(args.limit);
  const limit = limitNum ? Number(limitNum) : undefined;

  // 读 messages（流式投影：边迭代边累计/裁剪，不先持有完整 rawMessages ——
  // 根因硬门：iterator 先收齐再投影等于没修）。store 键序即升序（旧→新），
  // 与 streaming projector 的输入契约一致。
  const projector = createStreamingDialogReadProjector({
    maxResponseChars: DEFAULT_READ_DIALOG_MAX_RESPONSE_CHARS,
    ...(limit !== undefined ? { maxMessages: limit } : {}),
  });
  // 本地 meta 命中但本地一条消息都没有 = 典型「app/其他设备创建的对话」：
  // 直接返回空 transcript 会静默骗过模型。`store.iterator` 缺失同理——无法
  // 判断消息是否完整。两种情况都回退 CLI 桥，由它走远端历史/本地库候选。
  let hasMessages = false;
  if (store.iterator) {
    const { start, end } = dialogMessageRange(dialogId);
    for await (const [, value] of store.iterator({ gte: start, lte: end })) {
      const message = localDialogMessageRecordToRuntimeMessage(value as any) ?? value;
      if (message) {
        hasMessages = true;
        projector.addMessage(message);
      }
    }
  }

  if (!hasMessages) return fallback("no-local-messages");

  // Agent 响应预算：in-process / server 工具 / CLI bridge 共享同一 projection
  // seam（dialogReadProjection.ts），序列化前裁剪，避免工具密集对话构建无界多副本
  // （完整 meta+messages、整体序列化串、持久 transcript）。
  const projected = projector.finish(meta);

  // 统一最终 envelope builder：唯一拥有 maxResponseChars，
  // content = serialized（builder 自证 <= 预算，完整合法 JSON）。
  const built = buildDialogReadEnvelope({
    meta: projected.meta,
    messages: projected.messages,
    stats: projected.stats,
    envelope: {
      dialogId,
      dialogKey,
      messagesCount: projected.stats.messagesReturned,
      source: "in-process",
    },
  });

  return {
    outcome: "hit",
    result: {
      content: built.serialized,
      metadata: { noloWorkspaceTool: true, readDialog: true, inProcess: true },
    },
  };
}

export function buildNoloWorkspaceCliToolExecutors(args: {
  planningCaller?: PlanningCaller;
  cliEntrypoint?: string;
  env?: Record<string, string | undefined>;
  metadataKind?: string;
  processExecPath?: string;
  spawn?: NoloSpawn;
  store?: InProcessDialogStore;
  /** 惰性本地 store：构建 map 不打开 DB；首次调用才解析。 */
  resolveDialogStore?: InProcessDialogStoreResolver;
  /**
   * 宿主真实 `currentUserId`（本地库归属者）。缺省用 `resolveLocalUserId(env)`
   * （NOLO_LOCAL_USER_ID / NOLO_USER_ID / AUTH_TOKEN 解析）。进程内对话读取
   * 只认这个身份，绝不从模型参数推导。
   */
  resolveCurrentUserId?: () => string | undefined;
  /** 本机 run 子对话 id 集合（判定「本机独占对话」用）。 */
  resolveLocalChildDialogIds?: () => ReadonlySet<string>;
  /** 本地优先的进程内 executor；返回 null 时回退 CLI 子进程。 */
  inProcessExecutors?: Partial<Record<string, NoloWorkspaceInProcessExecutor>>;
}) {
  const executors: Record<string, (call: { name: string; arguments: string }) => Promise<{
    content: string;
    metadata?: Record<string, unknown>;
  }>> = {};
  for (const toolName of CLI_NOLO_WORKSPACE_TOOL_NAMES) {
    // loadSkill is a local-fs tool (resolves SKILL.md from the agent's bound
    // workspace and reads it inline). It has no `nolo` CLI subcommand, so the
    // CLI-bridge executor must not register it — hosts wire
    // buildLoadSkillExecutor separately. Registering it here would route the
    // call into buildNoloWorkspaceCommandArgs, which throws "no CLI mapping".
    if (toolName === "loadSkill") continue;

    const inProcess = args.inProcessExecutors?.[toolName];
    const storeBackedRead = toolName === "readDialog" && Boolean(args.store || args.resolveDialogStore);
    if (inProcess || storeBackedRead) {
      executors[toolName] = createInProcessWithCliFallback(args, inProcess);
      continue;
    }
    executors[toolName] = (call) => runNoloWorkspaceCliTool(call, args);
  }
  return executors;
}

/**
 * 本地优先 + CLI 兜底的 executor 形状。
 *
 * 快路径的任何「回答不了」都落到同一个出口：返回 `null`（本地 store 没有
 * 这条记录 / 本地无消息 / 无 iterator），或抛错（DB 打开失败、记录损坏、
 * 投影异常）。两者都回退 `runNoloWorkspaceCliTool`，因此开启快路径不会让
 * 原本能读到的远端对话变得读不到；只是少了一次 spawn 的延迟。
 */
function createInProcessWithCliFallback(
  args: {
    cliEntrypoint?: string;
    env?: Record<string, string | undefined>;
    metadataKind?: string;
    processExecPath?: string;
    spawn?: NoloSpawn;
    store?: InProcessDialogStore;
    resolveDialogStore?: InProcessDialogStoreResolver;
    resolveCurrentUserId?: () => string | undefined;
    resolveLocalChildDialogIds?: () => ReadonlySet<string>;
  },
  inProcess?: NoloWorkspaceInProcessExecutor
) {
  return async (call: { name: string; arguments: string }) => {
    let fallbackReason: string | undefined;
    try {
      if (inProcess) {
        const result = await inProcess(call, { env: args.env });
        if (result) return result;
        fallbackReason = "local-miss";
      } else {
        const currentUserId = resolveHostCurrentUserId(args);
        const store = await resolveInProcessDialogStore(args);
        const outcome = store
          ? await readDialogInProcess(call, store, {
              env: args.env,
              currentUserId,
              localChildDialogIds: resolveLocalChildDialogIds(args),
            })
          : ({ outcome: "fallback", reason: "no-store" } as const);
        if (outcome.outcome === "hit") return outcome.result;
        fallbackReason = outcome.reason;
      }
    } catch (error) {
      // store 打开失败 / 记录损坏 / 投影异常：降级到 CLI 桥，但把原因带到
      // metadata 里——静默降级会让人误以为「本地就是没有这条对话」。
      fallbackReason = error instanceof Error ? error.message : String(error);
    }
    const bridged = await runNoloWorkspaceCliTool(call, args);
    return {
      ...bridged,
      metadata: { ...bridged.metadata, inProcessFallback: fallbackReason },
    };
  };
}

async function resolveInProcessDialogStore(args: {
  store?: InProcessDialogStore;
  resolveDialogStore?: InProcessDialogStoreResolver;
}): Promise<InProcessDialogStore | undefined> {
  if (args.store) return args.store;
  if (!args.resolveDialogStore) return undefined;
  try {
    return await args.resolveDialogStore();
  } catch {
    return undefined;
  }
}

function resolveLocalChildDialogIds(args: {
  resolveLocalChildDialogIds?: () => ReadonlySet<string>;
}): ReadonlySet<string> | undefined {
  try {
    return args.resolveLocalChildDialogIds?.();
  } catch {
    return undefined;
  }
}

/**
 * 宿主持有的 local userId（本地库归属者）。只认宿主注入或宿主 env/JWT，
 * 不从模型参数推导；解析失败返回 undefined → 进程内路径直接放弃。
 */
function resolveHostCurrentUserId(args: {
  env?: Record<string, string | undefined>;
  resolveCurrentUserId?: () => string | undefined;
}): string | undefined {
  try {
    const injected = args.resolveCurrentUserId?.();
    if (injected && injected.trim()) return injected.trim();
    if (args.resolveCurrentUserId) return undefined;
    const derived = resolveLocalUserId(args.env ?? {});
    return derived && derived.trim() ? derived.trim() : undefined;
  } catch {
    return undefined;
  }
}



const nodeSpawnFallback: NoloSpawn = (options) => {
  return spawnToWebStreams({ cmd: options.cmd, env: options.env });
};

/**
 * Builds the `loadSkill` tool executor that reads SKILL.md from the local
 * filesystem. Node-only: uses `node:fs` and `skillDiscovery`.
 *
 * On an unknown name the contract forbids throwing: this returns a plain text
 * tool result listing the discovered skill names (reusing `discoverSkills` so
 * there is a single scan source of truth). On a read failure it also returns
 * a plain text result rather than throwing, so a malformed SKILL.md can never
 * crash the agent loop.
 *
 * Hosts (CLI localRuntimeAdapter, desktop turn service) spread this into their
 * executor map alongside `buildNoloWorkspaceCliToolExecutors` — that wiring
 * lives outside this package per the agent-runtime boundary.
 */
export function buildLoadSkillExecutor(args: {
  cwd: string;
  /** Trusted host configuration only; never read policy from tool arguments. */
  agentSkillSource?: AgentSkillConfigSource | null;
  /** Fresh local host policy. null or failure means unavailable, not unconfigured. */
  resolveAgentSkillSource?: () => Promise<AgentSkillConfigSource | null>;
}) {
  return async (call: { name: string; arguments: string }): Promise<{
    content: string;
    metadata?: Record<string, unknown>;
  }> => {
    const parsed = parseNoloWorkspaceToolArguments(call.arguments);
    // A precise reference must never fall through to legacy name resolution.
    const referenceKeys = ["source", "slug", "projectBinding", "relativePath", "dbKey", "id", "skillId"];
    if (referenceKeys.some((key) => Object.hasOwn(parsed, key))) {
      return loadPreciseSkill(args.cwd, parsed, args.agentSkillSource, args.resolveAgentSkillSource);
    }
    const name = noloStringArg(parsed.name ?? parsed.skillName ?? parsed.skill);
    if (!name) {
      return {
        content: await formatUnknownSkillMessage(args.cwd, "(no name provided)"),
        metadata: { loadSkill: true, resolved: false },
      };
    }
    const { resolveSkillByName } = await import("./skillDiscovery");
    const resolved = resolveSkillByName(args.cwd, name);
    if (!resolved) {
      // 系统内置 skill 回退：本地 skill 目录找不到时，按名字查内置注册表
      // （coding / specialist / code-planner / search-* / worktree-isolation …）。
      // fs 型宿主（CLI、desktop-runtime）无 DB 访问，注册表是内存真值，直接
      // 返回内置内容。否则终态用户自建项目（没有 .agents/skills）里，模型按
      // 「相关技能」提示去 loadSkill 内置 skill，只会得到 not found——提示行
      // 挂着一个打不开的名字，比不提示更糟。
      const { resolveBuiltinSkillByName } = await import(
        "ai/skills/builtinSkillRegistry"
      );
      const builtin = resolveBuiltinSkillByName(name);
      if (builtin) {
        const denied = await rejectDisabledBuiltin(args.agentSkillSource, builtin.slug, name, args.resolveAgentSkillSource);
        if (denied) return denied;
        return {
          content: `Skill "${name}" loaded inline. Follow its instructions.\n\n${builtin.content}`,
          // toolNames 进 metadata：回退面已扩到全注册表，其中授工具型 skill
          // （search-* 等）的工具在本宿主未必接线，宿主可据此降级提示。
          metadata: {
            loadSkill: true,
            resolved: true,
            name,
            requestedName: name,
            builtin: true,
            ...(builtin.config.toolNames?.length
              ? { toolNames: [...builtin.config.toolNames] }
              : {}),
          },
        };
      }
      return {
        content: await formatUnknownSkillMessage(args.cwd, name),
        metadata: { loadSkill: true, resolved: false, name, requestedName: name },
      };
    }
    try {
      const { readFileSync } = await import("node:fs");
      const body = readFileSync(resolved, "utf8");
      return {
        content: `Skill "${name}" loaded inline. Follow its instructions.\n\n${body}`,
        metadata: { loadSkill: true, resolved: true, name, requestedName: name, path: resolved },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: `Skill "${name}" could not be read: ${message}`,
        metadata: { loadSkill: true, resolved: true, name, requestedName: name, path: resolved, readError: message },
      };
    }
  };
}

async function rejectDisabledBuiltin(source: AgentSkillConfigSource | null | undefined, slug: string, requestedName: string,
  resolveSource?: () => Promise<AgentSkillConfigSource | null>) {
  if (resolveSource) {
    try { source = await resolveSource(); } catch { source = null; }
    if (!source) return {
      content: `Skill "${requestedName}" cannot be loaded: current agent policy is unavailable.`,
      metadata: { loadSkill: true, resolved: false, builtin: true, policyUnavailable: true, slug, name: requestedName, requestedName },
    };
  }
  if (!isAgentSkillDisabled(source, slug)) return null;
  return {
    content: `Skill "${requestedName}" 已被禁用：该能力在此 agent 上不可用，无法加载。`,
    metadata: { loadSkill: true, resolved: false, builtin: true, disabled: true, slug, name: requestedName, requestedName },
  };
}

async function loadPreciseSkill(cwd: string, parsed: Record<string, unknown>, agentSkillSource?: AgentSkillConfigSource | null, resolveAgentSkillSource?: () => Promise<AgentSkillConfigSource | null>) {
  const source = parsed.source;
  const has = (key: string) => Object.hasOwn(parsed, key);
  const reject = (reason: string) => ({
    content: `Skill reference rejected: ${reason}`,
    metadata: { loadSkill: true, resolved: false, source, error: reason },
  });
  const nonEmpty = (value: unknown): value is string =>
    typeof value === "string" && value.trim().length > 0;
  if (source === "space") return reject("space references are not supported by this local executor.");
  if (source !== "builtin" && source !== "project") return reject("unknown or missing source.");
  if (["name", "skillName", "skill", "dbKey", "id", "skillId"].some(has)) {
    return reject("mixed skill reference selectors.");
  }
  if (source === "builtin") {
    if (!nonEmpty(parsed.slug) || has("projectBinding") || has("relativePath")) {
      return reject("builtin requires only an exact slug.");
    }
    const { listBuiltinSkills } = await import("ai/skills/builtinSkillRegistry");
    const builtin = listBuiltinSkills().find((entry) => entry.slug === parsed.slug);
    if (!builtin) return reject("builtin slug not found.");
    const denied = await rejectDisabledBuiltin(agentSkillSource, builtin.slug, builtin.slug, resolveAgentSkillSource);
    if (denied) return { ...denied, metadata: { ...denied.metadata, source } };
    return {
      content: `Skill "${builtin.slug}" loaded inline. Follow its instructions.\n\n${builtin.content}`,
      metadata: {
        loadSkill: true, resolved: true, source, builtin: true,
        slug: builtin.slug, name: builtin.slug, requestedName: builtin.slug,
        ...(builtin.config.toolNames?.length ? { toolNames: [...builtin.config.toolNames] } : {}),
      },
    };
  }
  if (has("slug") || !nonEmpty(parsed.projectBinding) || !nonEmpty(parsed.relativePath)) {
    return reject("project requires projectBinding and relativePath only.");
  }
  try {
    const { realpathSync, statSync, readFileSync } = await import("node:fs");
    const { resolve, relative, isAbsolute, basename, sep } = await import("node:path");
    const inside = (root: string, target: string) => {
      const rel = relative(root, target);
      return rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
    };
    const realCwd = realpathSync(cwd);
    if (!isAbsolute(parsed.projectBinding) || realpathSync(parsed.projectBinding) !== realCwd) {
      return reject("projectBinding does not match the authorized cwd.");
    }
    if (isAbsolute(parsed.relativePath) || basename(parsed.relativePath) !== "SKILL.md") {
      return reject("relativePath must reference a project SKILL.md.");
    }
    const skillsRoot = resolve(realCwd, ".agents", "skills");
    const candidate = resolve(realCwd, parsed.relativePath);
    if (!inside(skillsRoot, candidate)) return reject("path is outside cwd/.agents/skills/.");
    const realRoot = realpathSync(skillsRoot);
    const realPath = realpathSync(candidate);
    if (realRoot !== skillsRoot || !inside(realRoot, realPath) || basename(realPath) !== "SKILL.md") {
      return reject("skill path escapes cwd/.agents/skills/ or is not SKILL.md.");
    }
    if (!statSync(realPath).isFile()) return reject("SKILL.md is not a file.");
    const body = readFileSync(realPath, "utf8");
    return {
      content: `Skill "${parsed.relativePath}" loaded inline. Follow its instructions.\n\n${body}`,
      metadata: {
        loadSkill: true, resolved: true, source, projectBinding: parsed.projectBinding,
        relativePath: parsed.relativePath, path: realPath,
      },
    };
  } catch {
    return reject("project reference is stale, inaccessible, or invalid.");
  }
}

async function formatUnknownSkillMessage(cwd: string, requestedName: string): Promise<string> {
  const { discoverSkills } = await import("./skillDiscovery");
  let available: string[] = [];
  try {
    available = discoverSkills(cwd).map((s) => s.name);
  } catch { /* best-effort, mirror buildSkillDiscoveryContextBlock */ }
  const header = `Skill "${requestedName}" not found in this workspace's skill directory (.agents/skills/<name>/SKILL.md).`;
  if (available.length === 0) return `${header}\n\nNo skills were discovered in this workspace.`;
  return `${header}\n\nAvailable skills: ${available.join(", ")}`;
}
