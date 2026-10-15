// `<runId>.result.md` 的机器可读头（YAML front matter）。
//
// 运行时在落盘正文前自动加头，不依赖模型自觉。头只放结构化元数据，正文保持
// 原样跟在第二个 `---` 之后。读端若需要纯正文用 stripResultFrontMatter；旧格式
// （无头）文件原样返回，兼容历史 run。

import {
  resolveRuntimeAuthToken,
  resolveRuntimeServerUrl,
} from "./client/localRuntimeHelpers";

export type ResultFrontMatterInput = {
  runId: string;
  status: string;
  agentName?: string;
  model?: string;
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
  toolCallCount?: number;
  dialogId?: string;
  /** 该 dialog 所在服务器 origin；拿不到时为 "local"。 */
  server?: string;
  /** 远端同步状态：awaited / best-effort / none；拿不到 subjectRef 信息时省略。 */
  serverSync?: ServerSyncMode;
  cwd?: string;
  /** append/continue 产生的新 run 指向的原 runId；拿不到则省略。 */
  continuedFrom?: string;
};

/**
 * 远端同步状态（写进 .result.md 头 `serverSync`）：
 * - "awaited"：有 subjectRef，writeDialog 同步 await 远端，远端 dialog 已可查；
 * - "best-effort"：无 subjectRef，fire-and-forget，远端可能晚到或失败；
 * - "none"：本地用户或缺 server/token，不同步。
 */
export type ServerSyncMode = "awaited" | "best-effort" | "none";

/**
 * 头里 server/serverSync 的唯一决策入口，与 localRuntimeDialog.writeDialog 的
 * 同步判定同源：远端同步发生的条件是 userId !== "local" 且
 * resolveRuntimeServerUrl / resolveRuntimeAuthToken 都有值（见
 * syncLocalDialogEvidenceToRemote）；awaited/best-effort 由 subjectRef 决定
 * （localTurnHasSubjectRefs 同口径）。直接复用这两个 resolve 函数，不另写解析。
 */
export function resolveResultServerMeta(input: {
  env: Record<string, string | undefined>;
  userId: string;
  hasSubjectRefs?: boolean;
}): { server: string; serverSync?: ServerSyncMode } {
  const serverUrl = resolveRuntimeServerUrl(input.env);
  const authToken = resolveRuntimeAuthToken(input.env);
  const syncEnabled = input.userId !== "local" && Boolean(serverUrl) && Boolean(authToken);
  if (!syncEnabled) {
    return { server: "local", serverSync: "none" };
  }
  return {
    server: serverOriginForDialog(serverUrl),
    serverSync: input.hasSubjectRefs === undefined
      ? undefined
      : input.hasSubjectRefs ? "awaited" : "best-effort",
  };
}

/**
 * 结果头元数据的旁路通道：挂在 RunAgentTurnResult 对象身上但不进对象形状，
 * 避免改动既有结果的 toEqual 契约。WeakMap 不影响 GC。
 */
export type RunResultHeaderMeta = {
  model?: string;
  dialogServer?: string;
  serverSync?: ServerSyncMode;
};
const resultHeaderMeta = new WeakMap<object, RunResultHeaderMeta>();

export function recordRunResultHeaderMeta(result: object, meta: RunResultHeaderMeta): void {
  const clean: RunResultHeaderMeta = {};
  if (meta.model) clean.model = meta.model;
  if (meta.dialogServer) clean.dialogServer = meta.dialogServer;
  if (meta.serverSync) clean.serverSync = meta.serverSync;
  if (Object.keys(clean).length > 0) resultHeaderMeta.set(result, clean);
}

export function getRunResultHeaderMeta(result: object | undefined): RunResultHeaderMeta {
  return (result && resultHeaderMeta.get(result)) || {};
}

/** 服务器 origin（scheme://host[:port]）；无法解析时原样返回去尾斜杠的串；空则 "local"。 */
export function serverOriginForDialog(serverUrl: string | undefined): string {
  const raw = serverUrl?.trim();
  if (!raw) return "local";
  try {
    return new URL(raw).origin;
  } catch {
    return raw.replace(/\/+$/, "") || "local";
  }
}

/** 字符串统一用 JSON 双引号形式（是合法的 YAML 双引号标量），避免转义问题。 */
function yamlScalar(value: string | number): string {
  return typeof value === "number" ? String(value) : JSON.stringify(value);
}

/** 生成 front matter 块（含首尾 `---` 与结尾换行）。缺省字段省略。 */
export function buildResultFrontMatter(input: ResultFrontMatterInput): string {
  const entries: Array<[string, string | number | undefined]> = [
    ["runId", input.runId],
    ["status", input.status],
    ["agentName", input.agentName],
    ["model", input.model],
    ["startedAt", input.startedAt],
    ["endedAt", input.endedAt],
    ["durationMs", input.durationMs],
    ["toolCallCount", input.toolCallCount],
    ["dialogId", input.dialogId],
    ["server", input.server],
    ["serverSync", input.serverSync],
    ["cwd", input.cwd],
    ["continuedFrom", input.continuedFrom],
  ];
  const lines = entries
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${yamlScalar(v as string | number)}`);
  return `---\n${lines.join("\n")}\n---\n`;
}

/** 头 + 原样正文：落盘内容。 */
export function buildResultFileContent(input: ResultFrontMatterInput, body: string): string {
  return `${buildResultFrontMatter(input)}${body}`;
}

// 只识别本模块生成的头：首行 `---`，第二行必须是 runId（确保不会把
// 恰好以 `---` 开头的普通 markdown 正文误删一段）。
const RESULT_FRONT_MATTER_RE = /^---\nrunId: [^\n]*\n(?:[^\n]*\n)*?---\n/;

/** 去掉本模块生成的 front matter；无头（旧格式）原样返回。 */
export function stripResultFrontMatter(text: string): string {
  const match = RESULT_FRONT_MATTER_RE.exec(text);
  return match ? text.slice(match[0].length) : text;
}
