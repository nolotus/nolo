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
import { dialogMessageRange } from "../database/keys";
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
  NOLO_WORKSPACE_TOOL_NAMES,
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
    env: args.env,
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

async function readDialogInProcess(
  call: { name: string; arguments: string },
  store: InProcessDialogStore,
  env?: Record<string, string | undefined>
): Promise<{ content: string; metadata?: Record<string, unknown> }> {
  const args = parseNoloWorkspaceToolArguments(call.arguments);
  const dialogInput = noloStringArg(args.dialog ?? args.dialogId ?? args.id);
  if (!dialogInput) throw new Error("readDialog requires dialog.");

  const mode = noloStringArg(args.mode);
  if (mode && mode !== "full" && mode !== "status") {
    throw new Error(`readDialog mode must be "full" or "status", got "${mode}".`);
  }

  const userId = noloStringArg(args.user ?? args.userId ?? args.owner) || env?.NOLO_LOCAL_USER_ID || env?.NOLO_USER_ID || "";
  const { dbKey: dialogKey, dialogId } = resolveNoloDialogInput(dialogInput, userId);

  // 读 dialog meta（本地优先，不读远端）
  const meta = await store.read(dialogKey, { remote: false });

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
      content: JSON.stringify(result, null, 2),
      metadata: { noloWorkspaceTool: true, readDialog: true, inProcess: true, mode: "status" },
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
  if (store.iterator) {
    const { start, end } = dialogMessageRange(dialogId);
    for await (const [, value] of store.iterator({ gte: start, lte: end })) {
      const message = localDialogMessageRecordToRuntimeMessage(value as any) ?? value;
      if (message) {
        projector.addMessage(message);
      }
    }
  }

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
    content: built.serialized,
    metadata: { noloWorkspaceTool: true, readDialog: true, inProcess: true },
  };
}

export function buildNoloWorkspaceCliToolExecutors(args: {
  cliEntrypoint?: string;
  env?: Record<string, string | undefined>;
  metadataKind?: string;
  processExecPath?: string;
  spawn?: NoloSpawn;
  store?: InProcessDialogStore;
}) {
  const executors: Record<string, (call: { name: string; arguments: string }) => Promise<{
    content: string;
    metadata?: Record<string, unknown>;
  }>> = {};
  for (const toolName of NOLO_WORKSPACE_TOOL_NAMES) {
    // loadSkill is a local-fs tool (resolves SKILL.md from the agent's bound
    // workspace and reads it inline). It has no `nolo` CLI subcommand, so the
    // CLI-bridge executor must not register it — hosts wire
    // buildLoadSkillExecutor separately. Registering it here would route the
    // call into buildNoloWorkspaceCommandArgs, which throws "no CLI mapping".
    if (toolName === "loadSkill") continue;
    if (toolName === "readDialog" && args.store) {
      executors[toolName] = (call) => readDialogInProcess(call, args.store!, args.env);
      continue;
    }
    executors[toolName] = (call) => runNoloWorkspaceCliTool(call, args);
  }
  return executors;
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
export function buildLoadSkillExecutor(args: { cwd: string }) {
  return async (call: { name: string; arguments: string }): Promise<{
    content: string;
    metadata?: Record<string, unknown>;
  }> => {
    const parsed = parseNoloWorkspaceToolArguments(call.arguments);
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
