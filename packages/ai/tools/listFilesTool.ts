// 文件路径: packages/ai/tools/listFilesTool.ts

import { toErrorMessage } from "core/errorMessage";
import { buildToolRequestHeaders, getToolBaseUrl } from "./toolApiClient";

// ---- Types ----

export type ListFilesArgs = {
    path?: string;
    maxFiles?: number;
    ignore?: string[];
};

// ---- 工具 Schema ----

export const listFilesFunctionSchema = {
    name: "list_files",
    description: [
        "列出项目中的文件和目录结构。",
        "当你初次进入项目，或需要了解特定目录下的文件列表以便进行下一步搜索或读取时，请使用此工具。",
        "它会自动忽略常见的非源码目录（如 node_modules），并支持深度递归（受 maxFiles 限制）。",
    ].join("\n"),
    parameters: {
        type: "object",
        properties: {
            path: {
                type: "string",
                description: "可选：要列出的目录路径，默认 '.'（项目根目录）。",
            },
            maxFiles: {
                type: "number",
                description: "可选：返回文件的最大数量，默认 300。",
            },
            ignore: {
                type: "array",
                items: { type: "string" },
                description: "可选：要额外忽略的模式或目录名。",
            },
        },
    },
};

// ---- 执行函数 ----

export async function listFilesFunc(
    args: ListFilesArgs,
    thunkApi: any,
    context?: { parentMessageId?: string; signal?: AbortSignal; toolRunId?: string; agentKey?: string; userInput?: string }
): Promise<{ rawData: any; displayData?: string }> {
    try {
        const baseUrl = getToolBaseUrl(thunkApi);
        const apiUrl = `${baseUrl}/api/list-files`;

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: buildToolRequestHeaders(thunkApi, {
                withAuth: true,
                agentKey: context?.agentKey,
            }),
            signal: context?.signal,
            body: JSON.stringify(args),
        });

        const data = (await response.json()) as { ok?: boolean; error?: string; files?: any[]; totalFiles?: number; truncated?: boolean };

        if (!response.ok || data?.error) {
            throw new Error(data?.error || `列出文件失败: ${response.status}`);
        }

        const files = data.files || [];
        const count = files.length;
        const displayData = `📁 文件列表: 找到 ${data.totalFiles} 个文件${data.truncated ? ' (已截断)' : ''}`;

        return {
            rawData: {
                ok: true,
                files,
                totalFiles: data.totalFiles,
                truncated: data.truncated
            },
            displayData,
        };
    } catch (error: any) {
        throw new Error(`列出文件失败：${toErrorMessage(error)}`);
    }
}
