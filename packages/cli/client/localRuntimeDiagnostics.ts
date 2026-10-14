import type { AgentRuntimeAgentConfig } from "../agentRuntimeLocal";
import type { HybridRecordStore } from "./hybridRecordStore";
import { getDefaultCliLocalRuntimeDb } from "../localRuntimeDb";
import type { CliLocalRuntimeDb } from "./localRuntimeAdapterTypes";
import { ulid } from "ulid";
import type { EnvLike } from "./localRuntimeHelpers";
import type { CliFetchImpl } from "../cliFetch";
import type { ReadToolFn } from "./cliLocalToolExecutors";
import type { LocalCliExecutor } from "../agentCommandSupport";
import type { FetchInput, FetchInit } from "./localRuntimeFetchRetry";
import type { buildOpenAiTools } from "./localRuntimeTools";
import type { PermissionRequest } from "../../agent-runtime/actionGate";
import type {
  UserChoiceRequest,
  UserChoiceResult,
} from "./localRuntimeAdapterTypes";
import type { CollapsedPasteStore } from "core/collapsedPaste";
import type { ChromeConnectorClient } from "../../desktop-chrome-connector/chromeConnector";
import type { OriginShellGrant } from "./originShellGrant";
import type { ToolExecutionLocation } from "../../agent-runtime/ownerOriginExecution";

export type CliLocalRuntimeAdapterDeps = {
  env: EnvLike;
  db?: CliLocalRuntimeDb;
  store?: HybridRecordStore;
  now?: () => number;
  createId?: () => string;
  fetchImpl?: CliFetchImpl;
  cwd?: string;
  output?: { write(chunk: string): unknown };
  localToolExecutors?: Record<
    string,
    (
      call: any,
    ) => Promise<{ content: string; metadata?: Record<string, unknown> }>
  >;
  readXPost?: ReadToolFn;
  readXhsProfile?: ReadToolFn;
  executeCli?: LocalCliExecutor;
  sleep?: (ms: number) => Promise<void>;
  loopbackRequest?: (input: FetchInput, init?: FetchInit) => Promise<Response>;
  /** 重试进度上报（TUI 活动行显示「自动重试 N/M」）。透传给 fetchWithTransientRetry.onRetry。 */
  activityReporter?: (label: string | null) => void;
  buildProviderOpenAiTools?: typeof buildOpenAiTools;
  confirmDestructiveAction?: (request: PermissionRequest) => Promise<boolean>;
  requestUserChoice?: (request: UserChoiceRequest) => Promise<UserChoiceResult>;
  pastedTextStore?: CollapsedPasteStore;
  /**
   * Nolo Chrome connector client for the CLI's `chrome_*` executors (tests / alternate transports).
   * Absent: the executor table creates a verified client lazily on the first chrome_* call.
   */
  chromeConnectorClient?: ChromeConnectorClient;
  /**
   * Current TUI conversation id. Injected so local `startAgentRun` delegations
   * can stamp the spawned child run with this conversation as its
   * parentDialogId, letting the TUI overlay filter "runs belonging to this
   * dialog" the same way the web adapter filters by parentThreadId.
   */
  parentDialogId?: string;
  /**
   * TUI 显式注入的真实会话/授权上下文。owner-required 契约以它为权威
   * sessionId / workspaceId 来源；parentDialogId 仅作非 TUI 调用方的回退。
   */
  originSession?: {
    sessionId: string;
    workspaceId?: string;
  };
  /**
   * 分享 OAuth agent 的 shell 会话授权（块 D）：仅在 owner-required 场景由
   * TUI 注入；首次 execShell/launchProcess 前弹确认，默认拒绝，可撤销。
   * 非 owner 场景不注入 → 旧行为逐字不变。
   */
  shellGrant?: OriginShellGrant;
  /**
   * owner-required 场景的展示用身份信息（分享 agent 名 / owner / device）。
   * 仅供 shellGrant 确认对话框与运行位置展示渲染，不是授权凭证。
   */
  ownerAgentDisplay?: {
    agentName: string;
    agentKey: string;
    ownerUserId: string;
    deviceId: string;
    deviceName?: string;
  };
  /**
   * 工具执行位置投影的消费者（块 D，运行位置展示）：owner-required 场景
   * adapter 在首次工具调用前把 origin（本机）按 projectToolExecutionLocation
   * 契约投影成 ToolExecutionLocation 并回调一次。宿主（TUI）渲染「工具在
   * <deviceName>(<deviceId>) · <workspaceRoot> 执行 · <status>」。
   * 未知/无法解析 → status: "unknown"（不猜、不静默标 ready）。
   */
  onToolExecutionLocation?: (location: ToolExecutionLocation) => void;
  /**
   * startAgentRun 成功 spawn、但本轮无法盖章 parentDialogId（新会话首轮
   * dialogId 尚未生成、模型也未显式传参）时的回调。TUI 用它收集本轮
   * 「失归属」的 runId，turn 结束拿到 dialogId 后回填记录
   * （backfillRunRecordParentDialog），让 dock 发现与终态唤醒归因生效。
   */
  onBackgroundRunSpawned?: (runId: string) => void;
};

export type PreparedAgentRuntime = {
  agentConfig: AgentRuntimeAgentConfig;
  activeAgentToolNames: string[];
  runtimeToolExecutionLimits: Record<string, unknown>;
};

export const preparedAgentRuntimeCache = new Map<string, PreparedAgentRuntime>();
export const hybridStoreCache = new Map<string, Promise<HybridRecordStore>>();

export function normalizeRuntimeCacheCwd(cwd?: string) {
  return (cwd?.trim() || process.cwd()).replace(/\/+$/, "") || ".";
}

export function buildPreparedAgentCacheKey(args: {
  userId: string;
  agentRef: string;
  cwd: string;
  systemBuiltinSkills?: Record<string, boolean> | null;
}) {
  const systemBuiltinSkillsKey = args.systemBuiltinSkills
    ? JSON.stringify(
        Object.keys(args.systemBuiltinSkills)
          .sort()
          .map((key) => [key, args.systemBuiltinSkills?.[key]]),
      )
    : "default";
  return `${args.userId}\0${args.agentRef}\0${args.cwd}\0${systemBuiltinSkillsKey}`;
}

export function clearCliLocalRuntimePreparedAgentCache() {
  preparedAgentRuntimeCache.clear();
  hybridStoreCache.clear();
}

export async function defaultLocalRuntimeDb(): Promise<CliLocalRuntimeDb> {
  return getDefaultCliLocalRuntimeDb();
}

export function createFallbackId() {
  return ulid();
}

export function logLocalRuntimeDiagnostic(
  event: string,
  fields: Record<string, unknown>,
) {
  if (
    process.env.NOLO_LOCAL_RUNTIME_DEBUG !== "1" &&
    process.env.NOLO_DEBUG !== "1"
  ) {
    return;
  }
  console.error(`[nolo-local-runtime] ${event} ${JSON.stringify(fields)}`);
}

export function summarizeOpenAiToolNames(tools: Array<Record<string, unknown>>) {
  return tools.reduce<string[]>((acc, tool) => {
    const fn = tool.function;
    const name =
      fn &&
      typeof fn === "object" &&
      "name" in fn &&
      typeof fn.name === "string"
        ? fn.name
        : null;
    if (name) acc.push(name);
    return acc;
  }, []);
}
