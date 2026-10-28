import { normalizeContinueDialogId } from "./continueDialogId";
// packages/ai/tools/agent/startAgentRunTool.ts
//
// startAgentRun tool — starts a background agent run. Two modes:
//
//   - default (wait:false): Unix analogy fork + exec. Returns a runId
//     (= dialogId = threadId) immediately; control / diagnose via controlAgentRun.
//     异步派发后禁止轮询查询——不要反复调 status 等结果，用户界面已实时显示
//     每条 run 状态；wait:true 仅限三条例外（<100s 且马上要用 / 用户明确要求
//     同步 / 环境不支持终态唤醒且无并行工作），阻塞会冻结对话，见 wait 参数描述。
//   - wait:true: synchronous — subscribes the dialog SSE stream until
//     done/failed and returns the child's content directly (no runId back,
//     so there is nothing to poll), for subtasks < 100s that need the result
//     right away.
//
// Environment routing:
//   - CLI local --bg: detects ~/.nolo/runs/ + CLI context → spawn detached
//     child process (reuses CLI's agentRunControl spawnLocalBackgroundRun)
//   - Otherwise (web/RN/desktop/CLI --server): dispatches runAgentBackground
//     with waitForCompletion:false, which posts to /api/agent/run {background:true}

import { RUN_TITLE_MAX, normalizeRunTitle } from "./runTitle";
import { resolveStartAgentRunCwd } from "./agentRunCwd";
import { runAgentBackground } from "ai/agent/runAgentBackground";
import {
    HOST_EXECUTOR_UNAVAILABLE_MESSAGE,
    HOST_WRITES_CONFIRMATION_REQUIRED_MESSAGE,
} from "./runtimeKeyDispatchGuard";
import { toErrorMessage } from "core/errorMessage";
import { resolveDispatchedSubtaskBudget } from "agent-runtime/subtaskBudget";
import {
    buildDelegatedTaskContent,
    calculateDelegatedPayloadMetrics,
    formatStartRunCard,
    resolveRunLabel,
    TASK_PREVIEW_MAX,
} from "./agentRunDisplayHelpers";
import { getActiveDialogKey } from "chat/dialog/dialogRuntimeStore";
import { extractCustomId } from "core/prefix";
import { checkCredentialFanout } from "./credentialFanoutGuard";
import { asTrimmedNonEmptyStringArray } from "core/stringArray";
import { selectById } from "database/dbSlice";

// ── 并发扇出凭证隔离（web/server 路径的进程内批次注册表）─────────────────
//
// CLI 本地路径的守卫以 ~/.nolo/runs 磁盘注册表为活跃集（见
// cliAgentRunToolExecutors.assertCredentialFanoutAllowed）；web/server 路径的
// run 在服务端，客户端拿不到实时活跃集，这里用进程内注册表记录本进程派出的
// run。作用域限定**显式 batchId**：未显式分批的派发每次生成新批次 id，互不
// 干扰；显式同批 = 调用方在组织并发扇出，必须过凭证隔离检查。
//
// 条目按批次超时口径（30 分钟）过期：超过批次生命周期的记录不再占用凭证
// 预算（顺序复用同一凭证永远合法）。

type BatchFanoutEntry = {
  runId: string;
  agentKey: string;
  credentialGroup?: string;
  startedAtMs: number;
};

const BATCH_FANOUT_ENTRY_TTL_MS = 30 * 60 * 1000;
const batchFanoutRegistry = new Map<string, BatchFanoutEntry[]>();

function pruneBatchFanoutRegistry(nowMs: number): void {
  for (const [batchId, entries] of batchFanoutRegistry) {
    const alive = entries.filter(
      (e) => nowMs - e.startedAtMs < BATCH_FANOUT_ENTRY_TTL_MS
    );
    if (alive.length === 0) batchFanoutRegistry.delete(batchId);
    else batchFanoutRegistry.set(batchId, alive);
  }
}

/** 仅测试用：清空批次注册表。 */
export function __resetBatchFanoutRegistryForTests(): void {
  batchFanoutRegistry.clear();
}

/**
 * 按宿主能力裁剪后的 startAgentRun schema。
 *
 * `supportsWait:false` 用于那些**执行器根本不实现同步派发**的宿主（cli-local
 * 的 startAgentRun 执行器永远 spawn 后立即返回，从不解析 wait/resultMode）。
 * 在那里声明 wait 不是「多给一个选项」，是撒谎：模型以为自己拿到了结果，实际
 * 拿到的是一个 runId。schema 必须跟着执行器走。
 */
export function buildStartAgentRunFunctionSchema(opts?: {
    supportsWait?: boolean;
    wakeEnabled?: boolean;
}) {
    const supportsWait = opts?.supportsWait !== false;
    const wakeEnabled = opts?.wakeEnabled === true;
    return {
    name: "startAgentRun",
    description:
        "启动一个 Agent 执行子任务。默认异步（fork+exec）：立即返回 runId 不阻塞对话；派发后先推进其它独立工作，再收尾等待终态通知，禁止轮询；controlAgentRun 用于控制（叫停/追加指令）与异常诊断。" +
        "【派发纪律】同一轮应并发派发无真实依赖的多个 run；等待某个 run 的结果不得阻塞其它独立工作的推进。异步派发后，先继续推进本轮可执行的独立工作，再收尾等待终态；符合下述同步等待条件时仍可使用 wait:true。只有真实文件冲突/接口契约依赖/凭证或配额准入冲突/上游产物依赖才可串行（与系统提示「并行是默认」一致）。通道可用性仅对当次派发有效，派发前务必重新读取可用性，切勿复用此前失败结论；遇到 config_unresolved 类错误降级前重试一次；同一凭证默认允许并发（受服务端准入预算约束；注意上游 429 限流，必要时降低并发或换通道），未知凭证需串行或显式确认风险；最强私有通道留给审查，执行优先使用低成本通道。" +
        (supportsWait
            ? "要同步结果传 wait:true（会冻结对话，仅限 ① 预计 <100s 且马上要用结果 ② 用户明确要求同步等待或正在与该子任务对话 ③ 环境不支持终态唤醒且无并行工作；详见 wait 参数）。" +
              "wait:true 时可用 resultMode 控制返回内容：full=完整输出；summary=只回头尾总结（防长输出撑爆上下文）。"
            : wakeEnabled
                ? "只支持异步派发；run 到终态会自动通过 terminal wake 把父对话接回来；派发后先推进其它独立工作，再收尾等待唤醒，不要轮询"
                : "只支持异步派发，startAgentRun 不提供同步等待；需要等终态时可用 controlAgentRun(wait)（若该 action 可用）；不要假设会自动 terminal wake"),
    parameters: {
        type: "object",
        properties: {
            agentKey: {
                type: "string",
                description:
                    "要启动的 Agent 的可运行 dbKey，必须是 listAgents 返回的 agentKey 字段（owned: agent-<userId>-<id>；public: agent-pub-<id>）或 readAgent 返回的 agentKey。" +
                    "只接受精确 dbKey，不接受 name/handle/bare id。可选；省略或传 'self' 时自动使用当前 AgentKey（派发自身执行细分子任务）。",
            },
            task: {
                type: "string",
                description:
                    "委托给该 Agent 的精简子任务指令/brief。推荐通过共享引用（如 commit hash、文件路径与行号区间 path:1-50、dialogId、artifact id 等）指引子任务自行读取，严禁将完整文件内容、全量 git diff、长日志或仓库总说明复制进 task。",
            },
            input: {
                description:
                    "可选。仅用于传递子任务无法通过本地文件系统或共享引用直接读取的真实外部输入（如外部 API 响应、瞬时数据）。已有共享引用或无需附加数据时请省略，切勿重复复制 task 描述。",
            },
            agentName: {
                type: "string",
                description: "可选。由 listAgents/readAgent 得到的可读 Agent 名称，用于 TUI 运行卡片展示。",
            },
            title: {
                type: "string",
                description:
                    `必填。这次子任务的短标题（≤${RUN_TITLE_MAX} 字，一行，如「复审额度 diff」「Opus 本地拉取设计」）。` +
                    "会展示并随运行记录持久化，用于区分并发 run；不得为空或仅含空白。",
            },
            cwd: {
                type: "string",
                description:
                    "可选。子 run 的工作目录（绝对路径）：子 run 进程的 cwd 与它的工具工作区都指向该目录（例如派到另一个 worktree）。" +
                    "只在 nolo CLI 本地运行路径生效；必须是已存在的目录，传相对路径 / 不存在的目录会直接报错，不会退化成默认目录。" +
                    "服务端派发路径兑现不了本地目录，收到该参数会报错而不是静默忽略。不传则沿用宿主当前工作目录。",
            },
            // 刻意不向模型暴露 ephemeral：AI 不需要知道这个选项，不提供即默认持久化。
            // 非持久化 run 在失败/stall/输出被截断时不会留下任何可找回的结论，而
            // review findings 与子任务产出都必须可回读——把选项藏起来比写一条
            // 「不要用它」的克制指令更可靠（2026-09-14 owner 反馈）。CLI `--ephemeral`
            // 与 server 透传保持不动，探活/烟测仍走 CLI 侧。
            continueDialogId: {
                type: "string",
                description: "可选。续跑当前用户已有的 dialog（不存在或不属于当前用户时显式报错，不新建）。适用于同一子任务的定向闭合，核验上一轮 finding 是否修好；禁用于评审类任务的独立判断，续跑会带入之前的结论、破坏独立性。2026-10-19 review 机制约定：full 审查用新 dialog（不传本参数），closure 用续跑。",
            },
            batchId: {
                type: "string",
                description:
                    "可选。批次 id，用于把多个并行 run 归为一组，便于后续 controlAgentRun(list, batchId=...) 按批查询。" +
                    "未传时自动生成一个并在返回值中带回，调用方无需先创建。" +
                    "同一 batchId 内的并发派发会做凭证组隔离检查：同一凭证默认允许并发（受服务端准入预算约束；注意上游 429 限流，必要时降低并发或换通道）；未知凭证的并发 run 会被拒绝。",
            },
            credentialGroup: {
                type: "string",
                description:
                    "可选。照抄 listAgents 返回的 credentialGroup 字段，用于同批次并发扇出的凭证隔离校验。" +
                    "缺省/空值视为「未知」（不是「独立」）：与同 batch 内任何其他 run 并发都会被拒绝。",
            },
            allowUnknownCredential: {
                type: "boolean",
                description:
                    "可选。显式确认「凭证归属未知」的并发风险后强制放行（等同于 CLI 的 --force-unknown-credential）。" +
                    "仅在已自行确认两侧不共用上游凭证时使用；默认 false，未知凭证并发一律拒绝。",
                default: false,
            },
            allowCredentialConcurrency: {
                type: "boolean",
                description:
                    "可选。同一凭证默认允许并发（受服务端准入预算约束；注意上游 429 限流，必要时降低并发或换通道），传 false 显式收紧为禁止同凭证并发。默认 true。",
                default: true,
            },
            readOnly: {
                type: "boolean",
                description:
                    "可选。为 true 时移除专用写/改/删工具（writeFile/editFile/deleteMemory 等），" +
                    "保留读文件、搜索与 shell，适合 reviewer/审计/探测。注意：shell 仍可写文件，" +
                    "这不是沙箱，brief 里仍需写明只读要求。默认 false；只由此参数显式声明，不从 task 文本推断。",
                default: false,
            },
            trackTodo: {
                type: "boolean",
                description:
                    "可选。为 true 时本次 run 会被记录进 runtime todo（~/.nolo/todos.json）。" +
                    "传了 batchId 时默认即记录（每批对应一项 todo）。" +
                    "todo 状态由关联 run 状态 + review 结论推导，用 controlAgentRun(action:\"todo\") 查询。",
            },
            maxToolCalls: {
                type: "number",
                description:
                    "可选。这次子任务的工具调用授权额度（硬上限）。不传则用 runtime 默认 200。" +
                    "到限即停止启动新的工具与模型调用、有界收尾，返回中间结论并标记 budget-exhausted（不算 provider 错误）。" +
                    "应按任务意图收紧：改一个常量给 10~20，单文件修复给 40，审查给 60。" +
                    "注意默认 200 只用来兜无界损失，不是失控识别——跑到上限不代表任务正常。",
            },
            maxWallClockMs: {
                type: "number",
                description:
                    "可选。这次子任务的墙钟硬上限（毫秒）。不传则用 runtime 默认 3600000（60 分钟）。" +
                    "与 maxToolCalls 任一先到即终止。作用是兜住「单次调用里套循环」这类工具计数测不出耗时的场景，" +
                    "例如一条 shell 里 `for i in 1 2 3` 反复跑同一套测试，调用数只有 1 但耗时很长。",
            },
            ...(supportsWait
                ? {
                      wait: {
                          type: "boolean",
                          description:
                              "可选。为 true 时同步等待子任务完成并直接返回结果（订阅 SSE 等 done/failed），不返回 runId。" +
                              "阻塞等待会冻结当前对话，仅限三种情况（见顶层描述）；默认 false（异步，返回 runId 后直接收尾等终态通知）。",
                          default: false,
                      },
                      resultMode: {
                          type: "string",
                          enum: ["full", "summary"],
                          default: "full",
                          description: "可选。full=返回完整输出；summary=只返回子任务总结（截断中间部分）。默认 full。",
                      },
                  }
                : {}),
            parentDialogId: {
                type: "string",
                description: "可选。父对话 id，用于建立父子对话归属关系。默认从运行时当前激活对话获取。",
            },
            runtimeKey: {
                type: "string",
                description:
                    "可选。这次 run 的执行位置：listRuntimes 返回的稳定 key（local | server | machine:<machineId> | docker:<runtimeId> | instabox | gcp）。" +
                    "云后端按 run 计费（instabox 免费额度、gcp 按秒），点名即表示同意在该后端执行。" +
                    "填了就只在那个位置执行；key 非法 / 运行时未配置 / 机器离线或非本人所有时会显式报错，" +
                    "不会悄悄改在本机或服务端执行。不填 = 沿用当前宿主默认位置。",
            },
            allowHostWrites: {
                type: "boolean",
                description:
                    "可选。仅当 runtimeKey='local' 时需要显式声明：表示调用方同意子 run 直接在**宿主文件系统**上读写代码（无隔离）。" +
                    "runtimeKey='local' 但未声明时会被显式拒绝（不回落宿主、也不悄悄改成 docker）。" +
                    "省略 runtimeKey 时无效。注意**省略 key 时的默认位置有例外**：写型派发默认进本机 docker 沙盒；"
                    + "只读派发（readOnly=true）仍在宿主执行（它写不了文件，起沙盒是浪费）。",
            },
        },
        required: ["task", "title"],
    },
    };
}

/** 全集 schema：服务端 / 支持同步派发的宿主用它。 */
export const startAgentRunFunctionSchema = buildStartAgentRunFunctionSchema();

// ── cwd 校验（子 run 工作目录）──────────────────────────────────────────────
//
// 判定与文案在 agentRunCwd.ts（纯函数，CLI 执行器复用同一份）。本文件只负责
// 把「服务端派发兑现不了本地目录」这件事说清楚——不静默忽略。

interface StartAgentRunArgs {
    agentKey?: string;
    task: string;
    input?: any;
    agentName?: string;
    /** 短标题（展示用，归一化后落进 run 记录）。 */
    title?: string;
    continueDialogId?: string;
    batchId?: string;
    /** listAgents 返回的 credentialGroup；缺省视为未知（见 schema 描述）。 */
    credentialGroup?: string;
    /** 显式确认未知凭证并发风险后强制放行；默认 false。 */
    allowUnknownCredential?: boolean;
    /** 显式禁止同一 credentialGroup 的并发（默认允许）。 */
    allowCredentialConcurrency?: boolean;
    /** 只读子任务：移除写/改/删类工具，保留读与 shell；默认 false。 */
    readOnly?: boolean;
    wait?: boolean;
    /** wait=true 时控制返回内容：full=完整输出；summary=头尾截断总结。默认 full。 */
    resultMode?: "full" | "summary";
    parentDialogId?: string;
    /**
     * listRuntimes 返回的执行位置稳定 key（local / server / machine:<id> / docker:<id> / instabox | gcp）。
     * 云后端按 run 计费（instabox 免费额度、gcp 按秒），点名即表示同意在该后端执行。
     * 显式指定时该 run 只在目标位置执行；不可用一律由服务端显式报错，不静默回退。
     * 省略 = 沿用宿主默认位置。
     */
    runtimeKey?: string;
    /**
     * 显式确认「这次 run 可以在宿主文件系统上写代码」。只有 `runtimeKey: "local"`
     * 需要它；其他位置（docker / server / machine / 云后端）与省略 runtimeKey 的
     * 默认路径都不看这个参数。
     */
    allowHostWrites?: boolean;
    /**
     * 子 run 的工作目录（绝对路径）。只在本地运行主机（nolo CLI）生效；
     * 本执行器（服务端后台派发）兑现不了，传了即报错，见 startAgentRunFunc。
     */
    cwd?: string;
}

export function resolveCurrentAgentKeyForStartRun(
    thunkApi: any,
): string | undefined {
    try {
        const state = thunkApi?.getState?.();
        if (!state) return undefined;
        const currentDialogKey = getActiveDialogKey();
        if (!currentDialogKey) return undefined;
        const dialogConfig = selectById(state, currentDialogKey) as any;
        return asTrimmedNonEmptyStringArray(dialogConfig?.cybots)[0];
    } catch {
        return undefined;
    }
}

/**
 * startAgentRun executor.
 *
 * Routes through runAgentBackground with waitForCompletion:wait. wait=false
 * (default) posts to /api/agent/run {background:true} and returns the runId
 * immediately (fork+exec); wait=true subscribes the dialog SSE stream and
 * resolves with the child's content (synchronous). The CLI local --bg path
 * (spawn detached) is handled separately in cliAgentRunToolExecutors; the
 * tool interface stays the same.
 */
export async function startAgentRunFunc(
    args: StartAgentRunArgs,
    thunkApi: any,
    _context?: { parentMessageId?: string; signal?: AbortSignal; toolRunId?: string }
): Promise<{ rawData: any; displayData: string; metadata?: Record<string, unknown> }> {
    const { agentKey, task, input, agentName, batchId, wait } = args;
    const continueDialogId = normalizeContinueDialogId(args.continueDialogId);
    if (typeof task !== "string" || !task.trim()) throw new Error("startAgentRun 缺少 task");
    const title = normalizeRunTitle(args.title);
    if (!title) throw new Error(`startAgentRun 需要非空的一行标题（≤${RUN_TITLE_MAX} 字）`);
    // 执行位置 key：格式真源在服务端（runtimeTarget.ts）。这里只挡住「空 key /
    // 非字符串」——把它当默认位置派发就等于悄悄换了执行环境，宁可早失败。
    const runtimeKey = typeof args.runtimeKey === "string" ? args.runtimeKey.trim() : "";
    if (args.runtimeKey !== undefined && (typeof args.runtimeKey !== "string" || !runtimeKey)) {
        throw new Error(
            "startAgentRun 的 runtimeKey 必须是非空的 listRuntimes key（local | server | machine:<machineId> | docker:<runtimeId> | instabox | gcp）；要沿用默认位置请省略该参数"
        );
    }
    const resultMode = args.resultMode ?? "full";
    const { dispatch } = thunkApi;

    // A batch id is always present on the return value. The caller may supply
    // one to group parallel runs; otherwise we mint a fresh one here so the
    // server path (runAgentBackground, which does not currently carry batchId)
    // still gives the caller a stable handle to filter on later via list.
    // The CLI local path receives the same id and persists it on the run record.
    const explicitBatchId =
        typeof batchId === "string" && batchId.trim() ? batchId.trim() : undefined;
    const effectiveBatchId =
        explicitBatchId ??
        `batch-${new Date().toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 8)}`;

    const rawAgentKey = typeof agentKey === "string" ? agentKey.trim() : "";
    const currentAgentKey = resolveCurrentAgentKeyForStartRun(thunkApi);
    const effectiveAgentKey =
        (!rawAgentKey || rawAgentKey.toLowerCase() === "self")
            ? (currentAgentKey ?? rawAgentKey)
            : rawAgentKey;

    if (!effectiveAgentKey) {
        throw new Error("startAgentRun: 缺少 agentKey 参数，且无法识别当前 Agent。");
    }
    if (!task || typeof task !== "string") {
        throw new Error("startAgentRun: 缺少有效的 task 文本描述。");
    }

    // cwd 是本机目录，本执行器经服务端后台派发（/api/agent/run），服务端 run 的
    // 文件系统由宿主决定，兑现不了这个参数。显式报错：静默忽略会让模型以为子 run
    // 已经落在目标目录，随后按错误的路径读它的产出。放在扇出注册之前——被拒的
    // 派发不该占用批次里的凭证位。
    const requestedCwd = resolveStartAgentRunCwd(args.cwd);
    if (requestedCwd) {
        throw new Error(
            "startAgentRun: cwd 只在本地运行主机（nolo CLI）可用；本次派发经服务端后台执行，" +
                `无法把子 run 的工作目录指定为 ${requestedCwd}。请省略 cwd，或在本地 CLI 里派发。`,
        );
    }

    const effectiveAllowCredentialConcurrency =
        args.allowCredentialConcurrency ?? true;

    // 并发扇出凭证隔离：仅对**显式 batchId**（调用方在组织并发扇出）生效；
    // 未显式分批的派发各自持有新批次 id，互不干扰。credentialGroup 缺省视为
    // 未知——未知与任何条目并发都拒绝，不静默放行；
    // 相同已知 credentialGroup 默认允许并发，仅显式 allowCredentialConcurrency: false 收紧拒绝。
    if (explicitBatchId) {
        const nowMs = Date.now();
        pruneBatchFanoutRegistry(nowMs);
        const active = batchFanoutRegistry.get(explicitBatchId) ?? [];
        const verdict = checkCredentialFanout({
            active,
            candidate: { agentKey: effectiveAgentKey, credentialGroup: args.credentialGroup },
            allowUnknownCredential: args.allowUnknownCredential === true,
            allowCredentialConcurrency: effectiveAllowCredentialConcurrency,
        });
        if (!verdict.allowed) throw new Error(verdict.message);
    }

    const content = buildDelegatedTaskContent(task, input);
    // ── 硬预算：派发边界一次解析 ──────────────────────────────────────
    // 显式参数 > 环境变量 > 默认值（200 次工具调用 / 60 分钟墙钟兜底）。
    // 父子 run 处在不同执行环境时（父在 CLI、子在服务端），各自读 env 会得到
    // 不同的授权额度——所以额度在这里定死，随 run 请求传给子 run；子 run 只消费。
    const dispatchedSubtaskBudget = resolveDispatchedSubtaskBudget({
        ...(typeof (args as { maxToolCalls?: number }).maxToolCalls === "number"
            ? { maxToolCalls: (args as { maxToolCalls?: number }).maxToolCalls as number }
            : {}),
        ...(typeof (args as { maxWallClockMs?: number }).maxWallClockMs === "number"
            ? { maxWallClockMs: (args as { maxWallClockMs?: number }).maxWallClockMs as number }
            : {}),
    });
    const payloadMetrics = calculateDelegatedPayloadMetrics(task, input, content);

    // 从入参或模块级单例取当前对话 key/id，提取 id 作为 parentDialogId 透传给服务端，
    // 让后台子对话记录父子关系，供侧边栏折叠。无当前对话且无入参时降级不传。
    const activeDialogKey = getActiveDialogKey();
    const explicitParentDialogId =
        typeof args.parentDialogId === "string" && args.parentDialogId.trim()
            ? (args.parentDialogId.includes("-")
                ? extractCustomId(args.parentDialogId)
                : args.parentDialogId.trim())
            : undefined;
    const parentDialogId =
        explicitParentDialogId ?? (activeDialogKey ? extractCustomId(activeDialogKey) : undefined);

    // F1：`runtimeKey: "local"` = 在**宿主文件系统**上执行（不是 docker 副本）。
    // 方案 A：它由宿主进程内的**本地执行器**兑现（CLI 通道由
    // cliLocalToolExecutors 覆盖本工具；其他宿主经 thunkApi.extra 注入
    // startHostAgentRun）。两件事都必须显式：
    //   1) allowHostWrites: true（缺失即拒，绝不因为「省略 / 笔误」落到宿主）；
    //   2) 宿主真的提供宿主执行器 —— 服务端 / 浏览器宿主没有，所以服务端那条路
    //      **永远**不兑现 local（与 local_target_unsupported 同一政策）；这里提前
    //      给出可操作文案，而不是发 HTTP 再等 409。
    const hostAgentRunDispatcher =
        runtimeKey === "local"
            ? (thunkApi?.extra as { startHostAgentRun?: unknown } | undefined)?.startHostAgentRun
            : undefined;
    if (runtimeKey === "local") {
        if (args.allowHostWrites !== true) {
            throw new Error(HOST_WRITES_CONFIRMATION_REQUIRED_MESSAGE);
        }
        if (typeof hostAgentRunDispatcher !== "function") {
            throw new Error(HOST_EXECUTOR_UNAVAILABLE_MESSAGE);
        }
    }

    try {
        const bgResult = runtimeKey === "local"
            ? await (
                  hostAgentRunDispatcher as (
                      args: Record<string, unknown>
                  ) => Promise<any>
              )({
                  agentKey: effectiveAgentKey,
                  userInput: content,
                  ...(continueDialogId ? { continueDialogId, strictContinueHistory: true } : {}),
                  waitForCompletion: wait === true,
                  runKind: "subtask",
                  runTitle: title,
                  runtimeKey: "local",
                  // 已解析的硬预算（子 run 只消费，不再自行读 env）。
                  subtaskBudgetLimits: dispatchedSubtaskBudget.limits,
                  allowHostWrites: true,
                  ...(args.readOnly === true ? { readOnly: true } : {}),
                  ...(parentDialogId ? { parentDialogId } : {}),
              })
            : await dispatch(
            runAgentBackground({
                agentKey: effectiveAgentKey,
                userInput: content,
                ...(continueDialogId ? { continueDialogId, strictContinueHistory: true } : {}),
                // wait 缺省必须归一为 false：runAgentBackground 只对
                // waitForCompletion === false 走「拿到 dialogId 立即返回」快路径，
                // undefined 会误入同步等待分支。
                waitForCompletion: wait === true,
                runKind: "subtask",
                runTitle: title,
                // 已解析的硬预算（子 run 只消费，不再自行读 env）。
                subtaskBudgetLimits: dispatchedSubtaskBudget.limits,
                ...(args.readOnly === true ? { readOnly: true } : {}),
                ...(parentDialogId ? { parentDialogId } : {}),
                ...(runtimeKey ? { runtimeKey } : {}),
            })
        ).unwrap();

        // wait=true 同步模式：直接返回子任务结果（content），不返回 runId 让
        // 调用方轮询（无 runId 可轮询，也无需 controlAgentRun）。abort 等异常
        // 路径下 content 可能缺失，兜底 ""。resultMode=summary 时对 content 做
        // 头尾截断（保留开头任务语境 + 结尾结论，省略中间）——与 callAgent 删除
        // 前的 summarizeChildContent 一致，防止长输出撑爆编排者上下文。
        if (wait === true) {
            const fullContent = bgResult.content ?? "";
            return {
                rawData:
                    resultMode === "summary" ? summarizeChildContent(fullContent) : fullContent,
                displayData: `✅ startAgentRun 同步完成，dialogId: ${bgResult.dialogId}${resultMode === "summary" ? "（summary）" : ""}`,
                metadata: {
                    payloadMetrics,
                },
            };
        }

        const runId = bgResult.dialogId;
        // 异步派发成功后登记进批次注册表，供同批后续并发派发的凭证隔离判定。
        if (explicitBatchId) {
            const entries = batchFanoutRegistry.get(explicitBatchId) ?? [];
            entries.push({
                runId,
                agentKey: effectiveAgentKey,
                ...(typeof args.credentialGroup === "string" && args.credentialGroup.trim()
                    ? { credentialGroup: args.credentialGroup.trim() }
                    : {}),
                startedAtMs: Date.now(),
            });
            batchFanoutRegistry.set(explicitBatchId, entries);
        }
        const status = bgResult.status ?? "pending";
        // rawData carries only real identity fields; the display fallback chain
        // lives in resolveRunLabel so a key never masquerades as a name.
        const resolvedName = agentName?.trim() || bgResult.agentName || bgResult.name;
        // The label is the NAME layer only — the title rides its own row on
        // the card, so letting it win here would leave the identity row empty
        // (and the same holds for any machine-side use of the same function).
        const identity = { agentName: resolvedName, agentKey: effectiveAgentKey, runId };
        // A clipped copy of the task rides along so every renderer can say what
        // this run is *for*. Without it two concurrent runs are indistinguishable
        // on screen — same card, same status, different work. Clipped rather than
        // full: this is display text, and the caller already holds the original.
        const taskPreview = task.replace(/\s+/g, " ").trim().slice(0, TASK_PREVIEW_MAX);

        return {
            rawData: {
                runId,
                status,
                agentKey,
                // batchId is always returned — minted above when the caller didn't
                // supply one — so controlAgentRun(list, batchId=...) works on every
                // host. On the server path the id lives in the tool return; on the
                // CLI local path it is also persisted on the run record.
                batchId: effectiveBatchId,
                ...(resolvedName ? { agentName: resolvedName } : {}),
                ...(taskPreview ? { taskPreview } : {}),
                ...(title ? { title } : {}),
                payloadMetrics,
            },
            displayData: formatStartRunCard(resolveRunLabel(identity), status, {
                task: taskPreview,
                runId,
                ...(title ? { title } : {}),
            }),
            metadata: {
                payloadMetrics,
            },
        };
    } catch (e: any) {
        throw new Error(`startAgentRun 启动 Agent [${agentKey}] 失败: ${toErrorMessage(e)}`);
    }
}

// ── resultMode=summary 截断（恢复 callAgent 删除前的 summarizeChildContent）──

/** summary 截断阈值：保留开头 SUMMARY_HEAD_CHARS 字符 + 结尾 SUMMARY_TAIL_CHARS 字符。 */
const SUMMARY_HEAD_CHARS = 1500;
const SUMMARY_TAIL_CHARS = 500;
/** 触发截断的最小长度（避免截断很短的输出）。 */
const SUMMARY_MIN_LENGTH_THRESHOLD = SUMMARY_HEAD_CHARS + SUMMARY_TAIL_CHARS + 50;

/**
 * 把子 Agent 的完整输出截成给编排者的摘要：开头 + 结尾 + 中间省略标记。
 * 保留开头（任务语境）和结尾（结论），省掉冗长的中间过程。
 */
function summarizeChildContent(text: string): string {
    if (text.length <= SUMMARY_MIN_LENGTH_THRESHOLD) return text;
    return `${text.slice(0, SUMMARY_HEAD_CHARS)}\n\n…（中间部分已省略，resultMode=full 可看完整输出）…\n\n${text.slice(-SUMMARY_TAIL_CHARS)}`;
}
