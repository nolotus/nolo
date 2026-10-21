// Pure CLI arg parsing helpers for the `nolo agent run` family of commands.
// Extracted from agentRunCommand.ts so the orchestration entry can stay
// focused on DI and message dispatch.
//
// No side effects: no process.env, no process.cwd, no fs reads. Callers
// that need external state (env, cwd) pass it in.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { normalizeServerOrigin } from "core/serverOrigin";
import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
import { DEFAULT_NOLO_SERVER_URL } from "./defaultServer";
import {
  isLocalCliAgentKey,
  LOCAL_CODEX_AGENT_KEY,
  resolveCliAgentKeyInput,
} from "./agentAliases";
import type { TaskEvidenceInput } from "./client/agentRun";
import type { AgentRuntimeRequestedMode } from "./agentRuntimeLocal";
import { HIGH_RISK_MUTATION_TOOL_NAMES } from "../agent-runtime/runtimeToolSurface";
import { isLocalCliAgentKey } from "./agentAliases";
// 唯一能力表：CLI 参数校验与派发守卫、localDockerWorkload 共用同一份真值，
// 避免「两处各写一份 runtimeKey 合法性」再分叉。
import { resolveCliLocalRuntimeKeyCapability } from "../ai/tools/agent/cliLocalRuntimeCapability";

// Re-export the local-CLI key check so orchestration files can stay
// decoupled from `./agentAliases` for the small set of helpers they need.
export { isLocalCliAgentKey } from "./agentAliases";

type EnvLike = Record<string, string | undefined>;

export type ParseAgentRunArgsOptions = {
  readTextFile?: (path: string) => string;
  commandPath?: string[];
};

export type ParsedAgentRunArgs = {
  agentKey: string;
  message: string;
  imageUrls: string[];
  allowShell: boolean;
  runtimeMode?: AgentRuntimeRequestedMode;
  runtimeKey?: string;
  dockerWorkspaceMode?: "git" | "empty";
  continueDialogId?: string;
  strictContinueHistory?: boolean;
  spaceId?: string;
  category?: string;
  inheritedFromDialogKey?: string;
  parentDialogId?: string;
  parentWakeOnTerminal?: boolean;
  subjectDialogKey?: string;
  subjectRefs?: Array<{ kind: string; id: string; role?: string }>;
  allowedToolNames?: string[];
  blockedToolNames?: string[];
  /**
   * `--machine-shell`：显式申请把本 run 派发到绑定机器，并在那里执行 shell。
   * 与 `--allowed-tool execShell` 不同——后者只影响模型可见工具面，本开关把
   * 「runtimeTools: ["execShell"]」作为请求级字段随 runtimeContext 上行，由服务端
   * 白名单取值后并入 runtime tool policy（sandbox/审批/审计仍由 web 基线给出）。
   * 要求 agent 记录有 runtimeBinding.machineId，否则命令直接报错退出。
   */
  machineShell: boolean;
  background: boolean;
  noStream: boolean;
  /**
   * Ephemeral / memory-only mode: dialog & messages stay in process memory,
   * never written to LevelDB or synced to a remote server. Intended for
   * liveness probes (e.g. nolo-plan探活) where persistence is pure overhead.
   * Local runtime strips persistence via wrapAdapterEphemeral; the
   * HTTP/server runtime forwards `ephemeral: true` in the request body and
   * the server skips dialog persistence accordingly.
   */
  ephemeral: boolean;
  cwd?: string;
  timeoutMs?: number;
  traceTools: boolean;
  eventsMode?: "jsonl";
  injectFeatureWorktreeInstruction: boolean;
  taskEvidence?: TaskEvidenceInput;
  workflowRef?: string;
  fallbackAgentKeys?: string[];
  skillRefs?: string[];
  dodCommands?: string[];
  queueFile?: string;
};

export function readFlagValue(args: string[], flag: string) {
  const index = args.indexOf(flag);
  if (index < 0) return undefined;
  return args[index + 1];
}

export function readRepeatedFlagValues(args: string[], flag: string) {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === flag && args[index + 1]) {
      values.push(args[index + 1]);
      index += 1;
    }
  }
  return values;
}

export function runtimeModeFromArgs(args: string[]): AgentRuntimeRequestedMode | undefined {
  if (args.includes("--local")) return "local";
  if (args.includes("--server")) return "server";
  if (args.includes("--auto")) return "auto";
  return undefined;
}

export function isFullstackCodingAgentRef(raw: string | undefined, resolved: string) {
  const normalized = asTrimmedLowercaseString(raw);
  return (
    normalized === "fullstack" ||
    normalized === "full-stack" ||
    normalized === "nolo-fullstack" ||
    normalized === "全栈" ||
    normalized === "nolo 全栈工程师" ||
    resolved === "fullstack"
  );
}

export function parsePositiveInteger(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.floor(parsed);
}

export function parseSubjectRef(raw: string): { kind: string; id: string; role?: string } | null {
  const value = raw.trim();
  if (!value) return null;
  const firstColon = value.indexOf(":");
  if (firstColon <= 0 || firstColon === value.length - 1) return null;
  const kind = value.slice(0, firstColon).trim();
  const rest = value.slice(firstColon + 1).trim();
  const lastColon = rest.lastIndexOf(":");
  const id = lastColon > 0 ? rest.slice(0, lastColon).trim() : rest;
  const role = lastColon > 0 ? rest.slice(lastColon + 1).trim() : "";
  if (!kind || !id) return null;
  return { kind, id, ...(role ? { role } : {}) };
}

const VALUELESS_FLAGS: Record<string, true> = {
  "--local": true,
  "--server": true,
  "--auto": true,
  "--dangerously-allow-shell": true,
  "--trace-tools": true,
  "--bg": true,
  "--strict-continue-history": true,
  "--no-stream": true,
  "--debug": true,
  "--ephemeral": true,
  "--memory-only": true,
  "--read-only": true,
  "--machine-shell": true,
};

function isValuelessFlag(arg: string): boolean {
  return Object.prototype.hasOwnProperty.call(VALUELESS_FLAGS, arg);
}

export function positionalArgs(args: string[]) {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (isValuelessFlag(arg)) continue;
    if (arg.startsWith("--")) {
      index += 1;
      continue;
    }
    values.push(arg);
  }
  return values;
}

export function resolveRawAgentInput(args: string[], commandPath?: string[]) {
  const positional = positionalArgs(args);
  const isNoLogin =
    (commandPath?.join(" ") === "run" || commandPath?.join(" ") === "chat") &&
    !readFlagValue(args, "--agent");
  return readFlagValue(args, "--agent") ?? (isNoLogin ? LOCAL_CODEX_AGENT_KEY : positional[0]);
}

export function parseDialogReference(rawInput: string) {
  const normalized = rawInput.trim();
  if (normalized.startsWith("dialog-")) {
    const parts = normalized.split("-");
    return {
      dialogKey: normalized,
      dialogId: parts.at(-1) ?? normalized,
    };
  }
  const dialogMatch = normalized.match(/dialog-([a-zA-Z0-9]+)-([a-zA-Z0-9]+)/);
  if (dialogMatch) {
    return {
      dialogKey: `dialog-${dialogMatch[1]}-${dialogMatch[2]}`,
      dialogId: dialogMatch[2],
    };
  }
  return {
    dialogId: normalized,
  };
}

export function mimeTypeForPath(path: string) {
  const lower = path.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/png";
}

export function resolveServerUrl(env: EnvLike) {
  return normalizeServerOrigin(
    env.NOLO_SERVER || env.BASE_URL || DEFAULT_NOLO_SERVER_URL,
  );
}

export function buildLocalRunEnv(args: { env: EnvLike; allowShell: boolean }) {
  void args.allowShell;
  return {
    ...args.env,
  };
}

export function isValidRuntimeKey(key: string): boolean {
  // 形态真值只有一份：packages/ai/tools/agent/cliLocalRuntimeCapability.ts 的
  // `acceptedByCliArgs`（本文件不再自己写正则/前缀判断）。
  //
  // 只取 `acceptedByCliArgs`，**不**取 `fulfillableByCliLocal`：参数层的职责是
  // 「这个形态该不该接受并交给下游」，不是「本机能不能兑现」。所以
  // `runtime-v1:<scope>:<owner>:<kind>[:<id>]` 长形式在这里放行（它要转发给服务端
  // catalog 解析），而本机本地 run 通道兑现不了它 —— 两件事分开表达。
  //
  // 与服务端 parseRuntimeKey 的真实差异（旧注释断言错了，这里以实测为准）：
  //   - 裸 `docker`：CLI 参数层接受；服务端 `parseRuntimeKey("docker")` 是
  //     `invalid_runtime_key`（runtimeTarget.test.ts 有对应用例），服务端只接受
  //     `docker:<id>` 与长形式 `runtime-v1:<scope>:<owner>:docker[:<id>]`。
  //     两侧"逐字对齐"从来不存在，也不需要存在：裸 `docker` 由本机 sbx 通道
  //     （localDockerWorkload）自己兑现、根本不经服务端解析；把它改成"与服务端
  //     一致地拒绝"只会砍掉本机沙盒的短形式入口。
  //   - `runtime-v1:` 前缀：CLI 不复制服务端语法，只按前缀放行整串转发。
  return resolveCliLocalRuntimeKeyCapability(key.trim()).acceptedByCliArgs;
}

export function writeUsage(
  output: { write(chunk: string): unknown },
  commandPath?: string[]
) {
  const commandName = commandPath?.join(" ");
  if (commandName === "run") {
    output.write(
      "Usage: nolo run <message> [--cwd <path>] [--timeout-ms <n>] [--events jsonl]\n" +
        "       nolo run --msg <message> [--cwd <path>] [--image <url-or-path>] [--timeout-ms <n>]\n" +
        "Runs local Codex in the current workspace; no Nolo login required.\n"
    );
    return;
  }
  if (commandName === "chat") {
    output.write(
      "Usage: nolo chat <message> [--cwd <path>] [--events jsonl]\n" +
        "       nolo chat --agent <agent> (--msg <message>|--msg-file <path>) [--local|--server|--auto]\n" +
        "Without --agent, this uses local Codex in the current workspace; no Nolo login required.\n"
    );
    return;
  }
  output.write(
    "Usage: nolo agent run <agent> <message> [--local|--server|--auto] [--runtime-key <key>] [--docker-workspace-mode git|empty] [--ephemeral|--memory-only] [--continue <dialogId>] [--cwd <path>]\n" +
      "       nolo agent run --agent <agent> (--msg <message>|--msg-file <path>) [--image <url-or-path>] [--space <spaceId>] [--category <name>] [--inherit-from-dialog <dialog>] [--parent-dialog <dialog>] [--subject-dialog <dialog>] [--subject-ref <kind:id[:role]>] [--task-row-dbkey <key>] [--fallback-agent <agent>] (suggestions for agent to decide on quota) [--allowed-tool <tool>] [--blocked-tool <tool>] [--read-only] [--runtime-key <key>] [--docker-workspace-mode git|empty] [--machine-shell] [--dod <cmd>] [--bg] [--timeout-ms <n>] [--events jsonl] [--no-stream] [--skill <dbKey-or-md-path>]\n"
  );
}

export function parseAgentRunArgs(
  args: string[],
  options: ParseAgentRunArgsOptions = {}
): ParsedAgentRunArgs | null {
  const positional = positionalArgs(args);
  const isNoLoginRunShorthand =
    (options.commandPath?.join(" ") === "run" || options.commandPath?.join(" ") === "chat") &&
    !readFlagValue(args, "--agent");
  const rawAgentKey = readFlagValue(args, "--agent") ?? (isNoLoginRunShorthand ? LOCAL_CODEX_AGENT_KEY : positional[0]);
  const agentKey = rawAgentKey ? resolveCliAgentKeyInput(rawAgentKey) : undefined;
  const explicitMsg = readFlagValue(args, "--msg");
  const msgFile = readFlagValue(args, "--msg-file");
  const fileMessage = msgFile
    ? (options.readTextFile ?? ((path: string) => readFileSync(path, "utf8")))(msgFile)
    : undefined;
  const rawMessage = explicitMsg ?? fileMessage ?? positional.slice(isNoLoginRunShorthand ? 0 : 1).join(" ");
  if (!agentKey || !rawMessage.trim()) return null;
  const message = rawMessage.trim();
  const rawRuntimeKey = readFlagValue(args, "--runtime-key");
  const runtimeKey = rawRuntimeKey?.trim();
  const rawDockerWorkspaceMode = readFlagValue(args, "--docker-workspace-mode")?.trim();
  if (args.includes("--docker-workspace-mode") && rawDockerWorkspaceMode !== "git" && rawDockerWorkspaceMode !== "empty") {
    throw new Error("--docker-workspace-mode 必须是 git 或 empty");
  }
  const dockerWorkspaceMode = rawDockerWorkspaceMode as ParsedAgentRunArgs["dockerWorkspaceMode"];
  if (dockerWorkspaceMode && !/^docker(:.+)?$/.test(runtimeKey ?? "")) {
    throw new Error("--docker-workspace-mode 仅适用于 --runtime-key docker[:runtimeId]");
  }
  // 只有本机沙盒通道（localDockerWorkload）会兑现这个参数：runtimeMode 解析成
  // auto / server 时它既不被服务端理解、也走不到本地沙盒，等于静默丢弃后改走
  // HTTP 派发 + 服务端投送。所以它必须落在**本机执行路径**上。
  // 但「本机路径」不等于字面 `--local`：与 agentRunCommand 的 isLocalRun 同口径，
  // 隐式 local（fullstack / local-cli agent / --dangerously-allow-shell）也是真实
  // 生效的本机路径，按字面 flag 严格拒绝会误拒这些能跑的组合。
  // `NOLO_RUNTIME_MODE=local` 在派发期（agentRunCommand）归一成本机 runtime，
  // 本校验只看「参数里是否钉了本机路径」，两者不冲突。
  const dockerWorkspaceModeRuntimeMode = runtimeModeFromArgs(args);
  const dockerWorkspaceModeImplicitLocal =
    !dockerWorkspaceModeRuntimeMode &&
    (isFullstackCodingAgentRef(rawAgentKey, agentKey) ||
      isLocalCliAgentKey(agentKey) ||
      args.includes("--dangerously-allow-shell"));
  if (
    dockerWorkspaceMode &&
    dockerWorkspaceModeRuntimeMode !== "local" &&
    !dockerWorkspaceModeImplicitLocal
  ) {
    throw new Error(
      "--docker-workspace-mode 需要本机执行路径：不带 --local 时 runtimeMode 解析为 auto，该参数会被静默丢弃并改走服务端派发。" +
        "请加 --local；隐式 local（fullstack / local-cli agent / --dangerously-allow-shell）同样被接受。"
    );
  }
  if (args.includes("--runtime-key") && !runtimeKey) {
    throw new Error(
      "runtimeKey 必须是非空的 listRuntimes key（local | server | machine:<machineId> | docker | docker:<runtimeId> | instabox | gcp）"
    );
  }
  const hasModeFlag = args.includes("--local") || args.includes("--server") || args.includes("--auto");
  // `--local` + docker / instabox key 不是位置歧义而是精确组合：在这台机器上、在这台机器的
  // 沙盒里执行。派发路径就靠这一对参数把子 run 钉在本机沙盒（否则子进程会
  // 带着同一个 key 走服务端通道）。其它 key 仍与任何 mode flag 互斥。
  const dockerRuntimeLocalKey = runtimeKey !== undefined && /^docker(:.+)?$/.test(runtimeKey);
  const instaboxRuntimeLocalKey = runtimeKey === "instabox";
  const localSandboxCombination = (dockerRuntimeLocalKey || instaboxRuntimeLocalKey) && args.includes("--local");
  if (runtimeKey && hasModeFlag && !localSandboxCombination) {
    throw new Error(
      "不能同时指定 --local/--server/--auto 与 --runtime-key（位置歧义）：--runtime-key 已直接指定执行后端（如 gcp、machine:<id>），请移除 --local/--server/--auto（例外：--local + docker / instabox 是合法组合，表示「本机沙盒内执行」）"
    );
  }
  if (runtimeKey && !isValidRuntimeKey(runtimeKey)) {
    throw new Error(
      `未知或无效的 runtimeKey "${runtimeKey}"。可选值：local | server | machine:<machineId> | docker | docker:<runtimeId> | instabox | gcp`
    );
  }
  // `--machine-shell` 已经把这轮派发锁到「该 agent 绑定机器的 server 通道」，
  // 再点名 runtimeKey（local / instabox / gcp / machine:<id>）就是两个互相矛盾的
  // 落点。静默丢弃 runtimeKey 会让人以为指定生效了，因此在入口直接拒绝。
  if (runtimeKey && args.includes("--machine-shell")) {
    throw new Error(
      "不能同时指定 --machine-shell 与 --runtime-key：--machine-shell 已把派发锁到绑定机器的 server 通道，runtimeKey 会失效，请只保留其中一个"
    );
  }
  const runtimeMode = runtimeModeFromArgs(args);
  const continueDialogId = readFlagValue(args, "--continue") ?? readFlagValue(args, "--dialog");
  const spaceId = readFlagValue(args, "--space");
  const category = readFlagValue(args, "--category");
  const inheritedFromDialog = readFlagValue(args, "--inherit-from-dialog");
  const subjectDialog =
    readFlagValue(args, "--subject-dialog") ??
    readFlagValue(args, "--reference-dialog");
  const subjectDialogKey = subjectDialog?.trim();
  const subjectRefs = readRepeatedFlagValues(args, "--subject-ref")
    .map(parseSubjectRef)
    .filter((ref): ref is { kind: string; id: string; role?: string } => Boolean(ref));
  const fallbackAgentKeys = readRepeatedFlagValues(args, "--fallback-agent")
    .map((value) => resolveCliAgentKeyInput(value.trim()))
    .filter(Boolean);
  const allowedToolNames = readRepeatedFlagValues(args, "--allowed-tool")
    .map((value) => value.trim())
    .filter(Boolean);
  const cwd = readFlagValue(args, "--cwd");
  const timeoutMs = parsePositiveInteger(readFlagValue(args, "--timeout-ms"));
  const rawEventsMode = readFlagValue(args, "--events");
  const eventsMode: ParsedAgentRunArgs["eventsMode"] =
    rawEventsMode === "jsonl" ? "jsonl" : undefined;
  const inheritedRef = inheritedFromDialog
    ? parseDialogReference(inheritedFromDialog)
    : undefined;
  const explicitLocalCliAgentDefault =
    isLocalCliAgentKey(agentKey) && runtimeMode !== "server";
  const explicitParentDialog = readFlagValue(args, "--parent-dialog");
  const parentDialogRef = explicitParentDialog
    ? parseDialogReference(explicitParentDialog)
    : undefined;
  const explicitReadOnly = args.includes("--read-only");
  const blockedToolNames = [
    ...readRepeatedFlagValues(args, "--blocked-tool")
      .map((value) => value.trim())
      .filter(Boolean),
    ...(explicitReadOnly ? HIGH_RISK_MUTATION_TOOL_NAMES : []),
  ];
  const imageUrls = [
    ...readRepeatedFlagValues(args, "--image"),
    ...readRepeatedFlagValues(args, "--image-url"),
  ];
  const fullstackLocalWorkspaceDefault =
    isFullstackCodingAgentRef(rawAgentKey, agentKey) && runtimeMode !== "server";
  const ephemeral =
    args.includes("--ephemeral") || args.includes("--memory-only");
  const workflowRef = readFlagValue(args, "--workflow");
  const skillRefs = readRepeatedFlagValues(args, "--skill")
    .map((v) => v.trim())
    .filter(Boolean);
  const dodCommands = readRepeatedFlagValues(args, "--dod")
    .map((v) => v.trim())
    .filter(Boolean);
  const taskRowDbKey = readFlagValue(args, "--task-row-dbkey");
  const artifactIds = readFlagValue(args, "--artifact-ids")
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const queueFile = readFlagValue(args, "--queue-file");
  return {
    agentKey,
    message,
    imageUrls,
    allowShell: args.includes("--dangerously-allow-shell") || fullstackLocalWorkspaceDefault || explicitLocalCliAgentDefault,
    traceTools: args.includes("--trace-tools"),
    ephemeral,
    ...(eventsMode ? { eventsMode } : {}),
    injectFeatureWorktreeInstruction: fullstackLocalWorkspaceDefault,
    ...(workflowRef ? { workflowRef } : {}),
    ...(skillRefs.length ? { skillRefs } : {}),
    ...(taskRowDbKey
      ? {
          taskEvidence: {
            rowDbKey: taskRowDbKey,
            ...(artifactIds?.length ? { artifactIds } : {}),
          },
        }
      : {}),
    ...(runtimeMode
      ? { runtimeMode }
      : !runtimeKey && (fullstackLocalWorkspaceDefault || explicitLocalCliAgentDefault || args.includes("--dangerously-allow-shell"))
        ? { runtimeMode: "local" as const }
        : {}),
    ...(runtimeKey ? { runtimeKey } : {}),
    ...(dockerWorkspaceMode ? { dockerWorkspaceMode } : {}),
    background: args.includes("--bg"),
    noStream: args.includes("--no-stream"),
    machineShell: args.includes("--machine-shell"),
    ...(continueDialogId ? { continueDialogId } : {}),
    ...(args.includes("--strict-continue-history") ? { strictContinueHistory: true } : {}),
    ...(!continueDialogId && spaceId ? { spaceId } : {}),
    ...(category ? { category } : {}),
    ...(inheritedRef?.dialogKey ? { inheritedFromDialogKey: inheritedRef.dialogKey } : {}),
    ...(parentDialogRef?.dialogId || inheritedRef?.dialogId
      ? { parentDialogId: parentDialogRef?.dialogId ?? inheritedRef?.dialogId }
      : {}),
    ...(parentDialogRef?.dialogId ? { parentWakeOnTerminal: true } : {}),
    ...(subjectDialogKey ? { subjectDialogKey } : {}),
    ...(subjectRefs.length ? { subjectRefs } : {}),
    ...(fallbackAgentKeys.length ? { fallbackAgentKeys } : {}),
    ...(allowedToolNames.length ? { allowedToolNames } : {}),
    ...(cwd ? { cwd } : {}),
    ...(blockedToolNames.length ? { blockedToolNames } : {}),
    ...(dodCommands.length ? { dodCommands } : {}),
    ...(typeof timeoutMs === "number" ? { timeoutMs } : {}),
    ...(queueFile ? { queueFile } : {}),
  };
}
