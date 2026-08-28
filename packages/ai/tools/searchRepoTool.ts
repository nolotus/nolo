// 文件路径: packages/ai/tools/searchRepoTool.ts

import { toErrorMessage } from "core/errorMessage";
import { asOptionalTrimmedString } from "core/optionalString";
import { buildToolRequestHeaders, getToolBaseUrl } from "./toolApiClient";

// ---- Types ----

export type SearchRepoArgs = {
    query: string;
    pathScope?: string;
    maxResults?: number;
    contextLines?: number;
};

// ---- 工具 Schema ----

export const searchRepoFunctionSchema = {
    name: "search_repo",
    description: [
        "在项目的源代码中进行全量文本搜索。",
        "当你不知道某个特定的字符串、类名、变量或逻辑在哪个文件中时，请使用此工具。",
        "它会返回匹配的文件路径、行号以及代码预览。",
        "",
        "参数建议：",
        "- query: 要搜索的文本（不区分大小写）。",
        "- pathScope: 可选，缩小搜索范围（如 'packages/server'）。",
        "- maxResults: 默认 20。",
    ].join("\n"),
    parameters: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "要搜索的文本字符串。",
            },
            pathScope: {
                type: "string",
                description: "可选：限制搜索在特定目录下，例如 'packages/ai'。",
            },
            maxResults: {
                type: "number",
                description: "返回的最大匹配项数量 (默认 20)。",
            },
            contextLines: {
                type: "number",
                description: "可选：匹配行前后显示的上下文行数。",
            },
        },
        required: ["query"],
    },
};

function buildSearchRepoDisplayData(
    query: string,
    hits: Array<{ path?: string; line?: number; preview?: string }>,
    totalHits: number | string | undefined,
): string {
    if (!Array.isArray(hits) || hits.length === 0) {
        return `🔍 搜索 "${query}": 未找到匹配项`;
    }

    const lines = hits.slice(0, 8).map((hit, index) => {
        const path = hit.path || "unknown";
        const line = typeof hit.line === "number" ? `:${hit.line}` : "";
        const previewPart = asOptionalTrimmedString(hit.preview);
        const preview = previewPart ? ` — ${previewPart}` : "";
        return `${index + 1}. ${path}${line}${preview}`;
    });

    const omitted = hits.length > 8 ? `\n… 其余 ${hits.length - 8} 条已省略` : "";
    return `🔍 搜索 "${query}": 找到 ${totalHits ?? hits.length} 个匹配项\n${lines.join("\n")}${omitted}`;
}

// ---- 执行函数 ----

export async function searchRepoFunc(
    args: SearchRepoArgs,
    thunkApi: any,
    context?: { parentMessageId?: string; signal?: AbortSignal; toolRunId?: string; agentKey?: string; userInput?: string }
): Promise<{ rawData: any; displayData?: string }> {
    const { query, pathScope, maxResults, contextLines } = args;

    try {
        const baseUrl = getToolBaseUrl(thunkApi);
        const apiUrl = `${baseUrl}/api/search-repo`;

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: buildToolRequestHeaders(thunkApi, {
                withAuth: true,
                agentKey: context?.agentKey,
            }),
            signal: context?.signal,
            body: JSON.stringify({ query, pathScope, maxResults, contextLines }),
        });

        const data = (await response.json()) as { ok?: boolean; error?: string; hits?: any[]; totalHits?: number | string };

        if (!response.ok || data?.error) {
            throw new Error(data?.error || `搜索请求失败: ${response.status}`);
        }

        const hits = data.hits || [];
        const displayData = buildSearchRepoDisplayData(query, hits, data.totalHits);

        return {
            rawData: {
                ok: true,
                query,
                hits,
                totalHits: data.totalHits,
            },
            displayData,
        };
    } catch (error: any) {
        throw new Error(`全局搜索 (${query}) 失败：${toErrorMessage(error)}`);
    }
}
