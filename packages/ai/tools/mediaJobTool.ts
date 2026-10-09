import { callToolApi } from "./toolApiClient";

export const mediaJobSchema = {
  name: "mediaJobTool",
  description:
    "管理长音频/视频处理任务。quote 预估费用，start 启动处理，status 查询任务进度和结果。需先提供已有媒体 fileId；可限定秒数范围、处理深度 outline（大纲）、translate（翻译）、full（完整处理），并指定目标语言。启动前建议先 quote。",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["quote", "start", "status"],
        description: "操作：quote 估价、start 启动、status 查询进度/结果。",
      },
      fileId: {
        type: "string",
        description:
          "媒体文件 ID（创建任务时必填）；status 时可省略，改传 jobId。",
      },
      jobId: {
        type: "string",
        description:
          "已有媒体任务 ID；status 必填，quote/start 可与 fileId 同时提供以继续已创建任务。",
      },
      fromSec: {
        type: "number",
        description: "处理起始秒数（可选，默认 0）。",
      },
      toSec: {
        type: "number",
        description: "处理结束秒数（可选，默认媒体结尾）。",
      },
      depth: {
        type: "string",
        enum: ["outline", "translate", "full"],
        description:
          "处理深度：outline 仅大纲，translate 翻译，full 完整处理。",
      },
      targetLang: {
        type: "string",
        description:
          "目标语言代码（如 zh、en、ja）；用于 translate/full 翻译。",
      },
    },
    required: ["action"],
  },
};

export type MediaJobToolInput = {
  action: "quote" | "start" | "status";
  fileId?: string;
  jobId?: string;
  fromSec?: number;
  toSec?: number;
  depth?: "outline" | "translate" | "full";
  targetLang?: string;
};

export async function mediaJobFunc(
  input: MediaJobToolInput,
  thunkApi: any,
): Promise<any> {
  const { action, fileId, jobId, fromSec, toSec, depth, targetLang } =
    input ?? {};
  const body: Record<string, unknown> = {};
  if (fromSec !== undefined || toSec !== undefined) {
    body.scope = {
      ...(fromSec !== undefined ? { fromSec } : {}),
      ...(toSec !== undefined ? { toSec } : {}),
    };
  }
  if (depth !== undefined) body.depth = depth;
  if (targetLang !== undefined) body.targetLang = targetLang;

  let path: string;
  let data: any;
  if (action === "status") {
    if (!jobId) throw new Error("status 操作必须提供 jobId");
    data = await callToolApi(
      thunkApi,
      `/api/media-jobs/${encodeURIComponent(jobId)}`,
      {},
      { withAuth: true, method: "GET" },
    );
    path = "status";
  } else if (action === "quote" || action === "start") {
    let id = jobId;
    if (!id) {
      if (!fileId) throw new Error(`${action} 操作必须提供 fileId 或 jobId`);
      const created = await callToolApi(
        thunkApi,
        "/api/media-jobs",
        { fileId, ...body },
        { withAuth: true },
      );
      id = created?.job?.id;
      if (!id) throw new Error("创建媒体任务失败：服务端未返回 job id");
    }
    path = `/api/media-jobs/${encodeURIComponent(id)}/${action}`;
    data = await callToolApi(thunkApi, path, body, { withAuth: true });
  } else {
    throw new Error("action 必须是 quote、start 或 status");
  }
  return {
    summary:
      action === "quote"
        ? "媒体任务估价完成"
        : action === "start"
          ? "媒体任务已启动"
          : "媒体任务状态已获取",
    jobId: data?.job?.id ?? (action !== "status" ? undefined : jobId),
    job: data?.job,
    quote: data?.quote ?? data?.job?.quote,
    rawData: data,
  };
}
