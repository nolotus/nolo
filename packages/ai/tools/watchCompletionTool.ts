// packages/ai/tools/watchCompletionTool.ts
//
// watchCompletion 工具（watchCompletion 一期）：登记一次「业务终态订阅」后立即
// 返回，父对话不等候；任务到达终态时由服务端唤醒机制把父对话叫醒一次。
// 等待期间 0 次 AI 轮询、0 token。
//
// 模型可见面只有一个动词：kind + ref + environment。**parentDialogId/userId 不接受
// 模型传入**：
//   - userId 由服务端从用户 token 解出（端点鉴权）；
//   - parentDialogId 由运行时注入 —— 服务端 agent run 走 handlers/agentRun 的
//     watchCompletion 服务端工具执行器（context.dialogId）；客户端运行经
//     callToolApi 的 maybeAttachDialogId 自动把当前对话 id 附到 body 上。
//
// 工具实现即 POST /api/watch-completion，别无逻辑。

import { callToolApi } from "./toolApiClient";

export const WATCH_COMPLETION_API_PATH = "/api/watch-completion";

export type WatchCompletionArgs = {
  kind?: string;
  ref?: string;
  environment?: string;
};

export type WatchCompletionResult = {
  ok: boolean;
  watchId?: string;
  message?: string;
  error?: string;
};

export const watchCompletionFunctionSchema = {
  name: "watchCompletion",
  description:
    "登记一次「任务完成订阅」后立即返回：被追踪的 nolo-ci 任务（如 push 触发的部署）到达终态时，服务端会自动唤醒本对话并交付结果。调用后不要轮询状态、不要等待——直接向用户确认订阅已建立即可。ref 传 jobId 或目标 commit sha；environment 是目标部署环境。",
  parameters: {
    type: "object",
    properties: {
      kind: {
        type: "string",
        enum: ["nolo-ci-job"],
        description: "订阅来源类型。当前支持 nolo-ci-job（push 触发的 nolo-ci 部署/发布任务）。",
      },
      ref: {
        type: "string",
        description:
          "精确追踪目标：nolo-ci 的 jobId，或期望上线的 commit sha（完整或 ≥7 位短 sha）。",
      },
      environment: {
        type: "string",
        enum: ["alpha", "main"],
        description: "目标环境：alpha（us.nolo.chat）或 main（nolo.chat）。",
      },
    },
    required: ["kind", "ref", "environment"],
  },
};

const normalizeArgs = (rawArgs: WatchCompletionArgs): WatchCompletionArgs => ({
  kind: typeof rawArgs?.kind === "string" ? rawArgs.kind.trim() : "",
  ref: typeof rawArgs?.ref === "string" ? rawArgs.ref.trim() : "",
  environment: typeof rawArgs?.environment === "string" ? rawArgs.environment.trim() : "",
});

/** 缺参校验返回缺失字段名；齐全返回 null。 */
export const findMissingWatchCompletionArg = (
  args: WatchCompletionArgs,
): "kind" | "ref" | "environment" | null =>
  !args.kind ? "kind" : !args.ref ? "ref" : !args.environment ? "environment" : null;

/**
 * 组请求体（纯函数，测试不需要打网络）。parentDialogId 只来自运行时上下文 ——
 * 模型参数里传什么都不采信；userId 由端点从用户 token 解出，body 里根本没有它。
 * 没有对话上下文的宿主不带 parentDialogId，由端点拒绝并如实上报。
 */
export function buildWatchCompletionRequestBody(args: {
  kind: string;
  ref: string;
  environment: string;
  dialogId?: string | null;
}): Record<string, unknown> {
  const body: Record<string, unknown> = {
    kind: args.kind,
    ref: args.ref,
    environment: args.environment,
  };
  const parentDialogId = (typeof args.dialogId === "string" && args.dialogId.trim()) || null;
  if (parentDialogId) body.parentDialogId = parentDialogId;
  return body;
}

export async function watchCompletionFunc(
  rawArgs: WatchCompletionArgs,
  thunkApi: any,
  context?: { dialogId?: string | null } & Record<string, unknown>,
): Promise<{ rawData: WatchCompletionResult; displayData: string }> {
  const args = normalizeArgs(rawArgs);
  const invalid = findMissingWatchCompletionArg(args);
  if (invalid) {
    const display = `watchCompletion: 缺少必填参数 ${invalid}。`;
    return { rawData: { ok: false, error: display }, displayData: display };
  }

  const body = buildWatchCompletionRequestBody({
    kind: args.kind!,
    ref: args.ref!,
    environment: args.environment!,
    dialogId: typeof context?.dialogId === "string" ? context.dialogId : null,
  });

  try {
    const data = await callToolApi<WatchCompletionResult>(
      thunkApi,
      WATCH_COMPLETION_API_PATH,
      body,
      { withAuth: true },
    );
    if (!data?.ok) {
      const display = `watchCompletion: 订阅登记失败${data?.error ? `：${data.error}` : "。"}`;
      return { rawData: data ?? { ok: false }, displayData: display };
    }
    return {
      rawData: data,
      displayData:
        data.message ??
        "✅ 已登记任务完成订阅，任务终态后本对话会被自动唤醒。等待期间无需轮询。",
    };
  } catch (error: any) {
    const display = `watchCompletion: 订阅登记请求失败：${error?.message ?? String(error)}`;
    return { rawData: { ok: false, error: display }, displayData: display };
  }
}
