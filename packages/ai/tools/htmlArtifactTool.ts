import { callToolApi } from "./toolApiClient";
import { getActiveDialogKey } from "chat/dialog/dialogRuntimeStore";
import { DEFAULT_HTML_ARTIFACT_TITLE, type HtmlArtifact } from "core/htmlArtifact";

export type { HtmlArtifact };

export interface CreateHtmlArtifactArgs {
  title?: string;
  html: string;
  dialogKey?: string;
}

export interface ReadHtmlArtifactArgs {
  id: string;
}

export interface UpdateHtmlArtifactArgs {
  id: string;
  title?: string;
  html: string;
}

export interface HtmlArtifactToolResult {
  rawData: {
    artifact: HtmlArtifact;
    id: string;
    dialogKey: string;
  };
  displayData: string;
}

export const createHtmlArtifactFunctionSchema = {
  name: "createHtmlArtifact",
  description: [
    "创建一个独立的单文件 HTML 网页成品并持久化保存。",
    "包含完整的 HTML/CSS/JavaScript，开箱即用。",
    "注意：如果要修改或迭代当前已有网页，必须使用 readHtmlArtifact + updateHtmlArtifact，禁止无条件调用 createHtmlArtifact 创建新副本。",
  ].join("\n"),
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "网页成品的标题（如'天气看板'、'个人主页'）。若未提供则使用默认标题。",
      },
      html: {
        type: "string",
        description: "完整的单文件 HTML 源码（必须包含 <!DOCTYPE html> 骨架及内联样式/脚本）。",
      },
      dialogKey: {
        type: "string",
        description: "所属对话的 Key。如未指定，执行器将自动从当前对话上下文解析。",
      },
    },
    required: ["html"],
  },
} as const;

export const readHtmlArtifactFunctionSchema = {
  name: "readHtmlArtifact",
  description: "根据成品 ID 读取指定 HTML 网页的完整信息与源码，供后续理解或迭代更新。",
  parameters: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "HTML 成品的唯一 ID（UUID 格式）。",
      },
    },
    required: ["id"],
  },
} as const;

export const updateHtmlArtifactFunctionSchema = {
  name: "updateHtmlArtifact",
  description: [
    "更新指定 ID 的 HTML 网页成品内容与标题。",
    "保持该成品的原 ID 与对话归属不变，在工作台中就地刷新，避免产生新副本。",
  ].join("\n"),
  parameters: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "要更新的目标 HTML 成品 ID。",
      },
      title: {
        type: "string",
        description: "可选的新标题；不传则保持原标题。",
      },
      html: {
        type: "string",
        description: "更新后的完整单文件 HTML 源码。",
      },
    },
    required: ["id", "html"],
  },
} as const;

const resolveCurrentDialogKey = (thunkApi: any, explicitDialogKey?: string): string => {
  if (explicitDialogKey && typeof explicitDialogKey === "string" && explicitDialogKey.trim()) {
    return explicitDialogKey.trim();
  }
  const activeDialogKey = getActiveDialogKey();
  if (activeDialogKey && typeof activeDialogKey === "string" && activeDialogKey.trim()) {
    return activeDialogKey.trim();
  }
  const stateDialogKey = thunkApi?.getState?.()?.dialogs?.currentDialogKey;
  if (stateDialogKey && typeof stateDialogKey === "string" && stateDialogKey.trim()) {
    return stateDialogKey.trim();
  }
  throw new Error("无法确定当前对话 dialogKey，请显式提供 dialogKey。");
};

export async function createHtmlArtifactFunc(
  args: CreateHtmlArtifactArgs,
  thunkApi: any,
): Promise<HtmlArtifactToolResult> {
  const html = typeof args?.html === "string" ? args.html : "";
  if (!html.trim()) {
    throw new Error("createHtmlArtifact: html 内容不能为空。");
  }

  const dialogKey = resolveCurrentDialogKey(thunkApi, args?.dialogKey);
  const title = typeof args?.title === "string" && args.title.trim() ? args.title.trim() : DEFAULT_HTML_ARTIFACT_TITLE;

  const response = await callToolApi<{ artifact: HtmlArtifact }>(
    thunkApi,
    "/api/html-artifacts",
    {
      action: "create",
      title,
      html,
      dialogKey,
    },
    { withAuth: true },
  );

  const artifact = response.artifact;
  if (!artifact?.id) {
    throw new Error("服务端未返回有效的 artifact 记录。");
  }

  return {
    rawData: {
      artifact,
      id: artifact.id,
      dialogKey: artifact.dialogKey,
    },
    displayData: `已创建 HTML 网页成品《${artifact.title}》（ID: ${artifact.id}）。可在工作台打开预览。`,
  };
}

export async function readHtmlArtifactFunc(
  args: ReadHtmlArtifactArgs,
  thunkApi: any,
): Promise<HtmlArtifactToolResult> {
  const id = typeof args?.id === "string" ? args.id.trim() : "";
  if (!id) {
    throw new Error("readHtmlArtifact: 必须提供有效的 artifact id。");
  }

  const response = await callToolApi<{ artifact: HtmlArtifact }>(
    thunkApi,
    "/api/html-artifacts",
    {
      action: "read",
      id,
    },
    { withAuth: true },
  );

  const artifact = response.artifact;
  if (!artifact?.id) {
    throw new Error(`未找到 ID 为 ${id} 的 HTML 成品。`);
  }

  return {
    rawData: {
      artifact,
      id: artifact.id,
      dialogKey: artifact.dialogKey,
    },
    displayData: `已读取 HTML 网页成品《${artifact.title}》（ID: ${artifact.id}，共 ${artifact.html.length} 字符）。源码已载入工具上下文。`,
  };
}

export async function updateHtmlArtifactFunc(
  args: UpdateHtmlArtifactArgs,
  thunkApi: any,
): Promise<HtmlArtifactToolResult> {
  const id = typeof args?.id === "string" ? args.id.trim() : "";
  if (!id) {
    throw new Error("updateHtmlArtifact: 必须提供有效的 artifact id。");
  }
  const html = typeof args?.html === "string" ? args.html : "";
  if (!html.trim()) {
    throw new Error("updateHtmlArtifact: html 内容不能为空。");
  }

  const title = typeof args?.title === "string" && args.title.trim() ? args.title.trim() : undefined;

  const response = await callToolApi<{ artifact: HtmlArtifact }>(
    thunkApi,
    "/api/html-artifacts",
    {
      action: "update",
      id,
      ...(title !== undefined ? { title } : {}),
      html,
    },
    { withAuth: true },
  );

  const artifact = response.artifact;
  if (!artifact?.id) {
    throw new Error("服务端更新失败，未返回有效的 artifact 记录。");
  }

  return {
    rawData: {
      artifact,
      id: artifact.id,
      dialogKey: artifact.dialogKey,
    },
    displayData: `已更新 HTML 网页成品《${artifact.title}》（ID: ${artifact.id}）。可在工作台读取最新内容。`,
  };
}
