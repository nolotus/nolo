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

import { runAgentBackground } from "ai/agent/runAgentBackground";
import { toErrorMessage } from "core/errorMessage";
import {
    buildDelegatedTaskContent,
    calculateDelegatedPayloadMetrics,
    formatStartRunCard,
    resolveRunLabel,
    TASK_PREVIEW_MAX,
} from "./agentRunDisplayHelpers";
import { getActiveDialogKey } from "chat/dialog/dialogRuntimeStore";
import { extractCustomId } from "core/prefix";

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
        "启动一个 Agent 执行子任务。默认异步（fork+exec）：立即返回 runId 不阻塞对话，派发后直接收尾等终态通知，禁止轮询；controlAgentRun 用于控制（叫停/追加指令）与异常诊断。" +
        (supportsWait
            ? "要同步结果传 wait:true（会冻结对话，仅限 ① 预计 <100s 且马上要用结果 ② 用户明确要求同步等待或正在与该子任务对话 ③ 环境不支持终态唤醒且无并行工作；详见 wait 参数）。" +
              "wait:true 时可用 resultMode 控制返回内容：full=完整输出；summary=只回头尾总结（防长输出撑爆上下文）。"
            : wakeEnabled
                ? "只支持异步派发；run 到终态会自动通过 terminal wake 把父对话接回来；派发后直接收尾，不要轮询"
                : "只支持异步派发，startAgentRun 不提供同步等待；需要等终态时可用 controlAgentRun(wait)（若该 action 可用）；不要假设会自动 terminal wake"),
    parameters: {
        type: "object",
        properties: {
            agentKey: {
                type: "string",
                description: "要启动的 Agent 的可运行 dbKey，必须是 listAgents 返回的 agentKey 字段（owned: agent-<userId>-<id>；public: agent-pub-<id>）或 readAgent 返回的 agentKey。只接受精确 dbKey，不接受 name/handle/bare id。",
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
            ephemeral: {
                type: "boolean",
                description:
                    "可选。为 true 时本次 run 不持久化 dialog（不留记录）。用于一次性审查（review）等不需留痕的场景。默认 false。",
            },
            batchId: {
                type: "string",
                description:
                    "可选。批次 id，用于把多个并行 run 归为一组，便于后续 controlAgentRun(list, batchId=...) 按批查询。" +
                    "未传时自动生成一个并在返回值中带回，调用方无需先创建。",
            },
            trackTodo: {
                type: "boolean",
                description:
                    "可选。为 true 时本次 run 会被记录进 runtime todo（~/.nolo/todos.json）。" +
                    "传了 batchId 时默认即记录（每批对应一项 todo）。" +
                    "todo 状态由关联 run 状态 + review 结论推导，用 controlAgentRun(action:\"todo\") 查询。",
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
        },
        required: ["agentKey", "task"],
    },
    };
}

/** 全集 schema：服务端 / 支持同步派发的宿主用它。 */
export const startAgentRunFunctionSchema = buildStartAgentRunFunctionSchema();

interface StartAgentRunArgs {
    agentKey: string;
    task: string;
    input?: any;
    agentName?: string;
    ephemeral?: boolean;
    batchId?: string;
    wait?: boolean;
    /** wait=true 时控制返回内容：full=完整输出；summary=头尾截断总结。默认 full。 */
    resultMode?: "full" | "summary";
    parentDialogId?: string;
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
    const { agentKey, task, input, agentName, ephemeral, batchId, wait } = args;
    const resultMode = args.resultMode ?? "full";
    const { dispatch } = thunkApi;

    // A batch id is always present on the return value. The caller may supply
    // one to group parallel runs; otherwise we mint a fresh one here so the
    // server path (runAgentBackground, which does not currently carry batchId)
    // still gives the caller a stable handle to filter on later via list.
    // The CLI local path receives the same id and persists it on the run record.
    const effectiveBatchId =
        typeof batchId === "string" && batchId.trim()
            ? batchId.trim()
            : `batch-${new Date().toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 8)}`;

    if (!agentKey) {
        throw new Error("startAgentRun: 缺少 agentKey 参数。");
    }
    if (!task || typeof task !== "string") {
        throw new Error("startAgentRun: 缺少有效的 task 文本描述。");
    }

    const content = buildDelegatedTaskContent(task, input);
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

    try {
        const bgResult = await dispatch(
            runAgentBackground({
                agentKey,
                userInput: content,
                // wait 缺省必须归一为 false：runAgentBackground 只对
                // waitForCompletion === false 走「拿到 dialogId 立即返回」快路径，
                // undefined 会误入同步等待分支。
                waitForCompletion: wait === true,
                runKind: "subtask",
                ...(parentDialogId ? { parentDialogId } : {}),
                ...(ephemeral ? { ephemeral: true } : {}),
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
        const status = bgResult.status ?? "pending";
        // rawData carries only real identity fields; the display fallback chain
        // lives in resolveRunLabel so a key never masquerades as a name.
        const resolvedName = agentName?.trim() || bgResult.agentName || bgResult.name;
        const identity = { agentName: resolvedName, agentKey, runId };
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
                payloadMetrics,
            },
            displayData: formatStartRunCard(resolveRunLabel(identity), status, {
                task: taskPreview,
                runId,
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
