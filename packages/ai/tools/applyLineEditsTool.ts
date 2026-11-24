// 文件路径: packages/ai/tools/applyLineEditsTool.ts

import { toErrorMessage } from "core/errorMessage";
import { buildToolRequestHeaders, getToolBaseUrl } from "./toolApiClient";

// ---- Types ----

/**
 * 提高编辑成功率用的公共字段：
 * - 建议 LLM 在规划编辑前先调用 readFile 获取最新内容；
 * - 然后把“将要修改的那几行原始代码”（用 \n 拼接）复制到 originalSnippet。
 *
 * 后端会把行号当作“粗定位”，再结合 originalSnippet 在附近搜索精确位置，
 * 这样即使行号有轻微偏差，也有很大概率能对齐到正确位置再修改，而不是直接失败。
 */
export type LineEditCommon = {
    /**
     * 可选：LLM 看到的原始代码片段。
     *
     * 用法建议：
     * - replaceRange / deleteRange：
     *   把 startLine~endLine 对应的原始行文本（用 \n 拼接）原样复制到 originalSnippet。
     * - insertBefore / insertAfter：
     *   把插入点附近的一行原始代码（通常是当前这一行）复制到 originalSnippet。
     *
     * 行为说明：
     * - 后端会先按行号找到大致区域；
     * - 若提供了 originalSnippet，会在该区域附近优先搜索同样的片段；
     * - 若找到，就以搜索结果为准自动修正编辑位置；
     * - 若找不到，则退化为按行号硬改（与旧行为一致），不会因此额外报错。
     */
    originalSnippet?: string;
};

export type LineEdit =
    | (LineEditCommon & {
        type: "replaceRange";
        /**
         * 期望被替换的起始、结束行（包含），1-based。
         * 实际应用时，后端会以此为“粗定位”，并结合 originalSnippet 做精确对齐。
         */
        startLine: number;
        endLine: number;
        /**
         * 用于替换这段行区间的新文本（可以是多行或空字符串）。
         * 文本内部按 \n 分行。
         */
        replacement: string;
    })
    | (LineEditCommon & {
        type: "insertBefore";
        /**
         * 在第 line 行“之前”插入 content。
         * 1 <= line <= 文件总行数 + 1；
         * 当 line === 文件总行数 + 1 时，相当于在文件尾部追加。
         *
         * 实际应用时，后端会把此行号作为插入点“粗定位”，
         * 并优先尝试在附近用 originalSnippet 微调到更精确的位置。
         */
        line: number;
        content: string;
    })
    | (LineEditCommon & {
        type: "insertAfter";
        /**
         * 在第 line 行“之后”插入 content。
         * 1 <= line <= 文件总行数；
         * 若 line > 文件总行数，会退化为在文件尾部追加。
         *
         * 实际应用时，后端会把此行号作为插入点“粗定位”，
         * 并优先尝试在附近用 originalSnippet 微调到更精确的位置。
         */
        line: number;
        content: string;
    })
    | (LineEditCommon & {
        type: "deleteRange";
        /**
         * 期望删除的起始行、结束行（包含），1-based。
         * 实际应用时，后端会以此为“粗定位”，并结合 originalSnippet 做精确对齐。
         */
        startLine: number;
        endLine: number;
    });

export type ApplyLineEditsArgs = {
    filePath: string;
    edits: LineEdit[];
};

// ---- 工具 Schema，供 LLM 调用 ----

export const applyLineEditsFunctionSchema = {
    name: "applyLineEdits",
    description: [
        "对指定文件按“行号”执行一组编辑，而不是整文件重写：替换连续行区间、在某行前后插入若干行、删除连续行。",
        "约定：行号均 1-based；一次调用尽量只含 1 个 edit；多个 edit 顺序应用，后续行号基于前一个 edit 后的结果。",
        "强烈建议同时提供 originalSnippet 容错：先 readFile 取最新内容与行号（用了 startLine/endLine 时真实行号 = lineOffset + index）；replaceRange / deleteRange 用 startLine~endLine 的原始行文本以 \\n 拼接；insertBefore / insertAfter 取插入点附近一行的原始文本。后端把行号当“粗定位”，优先在附近搜索 originalSnippet 并对齐，搜不到才按行号硬改（不因 snippet 不匹配报错）。",
        "返回 rawData.response：newContent（编辑后完整内容，统一 \\n）、diff（行级 diff，供 Diff 视图）。",
    ].join("\n"),
    parameters: {
        type: "object",
        properties: {
            filePath: {
                type: "string",
                description:
                    "要修改的文件路径（相对项目根 bun-nolo），如 packages/chat/src/messages/web/ToolMessageContent.tsx",
            },
            edits: {
                type: "array",
                description:
                    "按顺序应用的行级编辑；建议只传一个 edit。",
                items: {
                    type: "object",
                    oneOf: [
                        {
                            properties: {
                                type: { const: "replaceRange" },
                                startLine: {
                                    type: "number",
                                    description:
                                        "替换起点行（含），1-based。",
                                },
                                endLine: {
                                    type: "number",
                                    description:
                                        "替换终点行（含），1-based，>= startLine。",
                                },
                                replacement: {
                                    type: "string",
                                    description:
                                        "替换文本（可多行或空串），内部按 \\n 分行。",
                                },
                                originalSnippet: {
                                    type: "string",
                                    description:
                                        "可选但强烈建议：该行区间的原始文本（\\n 拼接）；后端就近搜索并对齐，行号有偏差时提高成功率。",
                                },
                            },
                            required: ["type", "startLine", "endLine", "replacement"],
                        },
                        {
                            properties: {
                                type: { const: "insertBefore" },
                                line: {
                                    type: "number",
                                    description:
                                        "在 line 行之前插入；1 <= line <= 总行数 + 1。",
                                },
                                content: {
                                    type: "string",
                                    description:
                                        "要插入的文本（可以是多行），文本内部按 \\n 分行。",
                                },
                                originalSnippet: {
                                    type: "string",
                                    description:
                                        "可选：插入点附近的一行原始代码文本（通常是当前第 line 行）。后端会在该行号附近优先搜索这行文本，在有轻微行号偏移时，仍然能找到合理的插入位置。",
                                },
                            },
                            required: ["type", "line", "content"],
                        },
                        {
                            properties: {
                                type: { const: "insertAfter" },
                                line: {
                                    type: "number",
                                    description:
                                        "在第 line 行“之后”插入 content。1 <= line <= 文件总行数。",
                                },
                                content: {
                                    type: "string",
                                    description:
                                        "要插入的文本（可以是多行），文本内部按 \\n 分行。",
                                },
                                originalSnippet: {
                                    type: "string",
                                    description:
                                        "可选：插入点附近的一行原始代码文本（通常是当前第 line 行）。后端会在该行号附近优先搜索这行文本，在有轻微行号偏移时，仍然能找到合理的插入位置。",
                                },
                            },
                            required: ["type", "line", "content"],
                        },
                        {
                            properties: {
                                type: { const: "deleteRange" },
                                startLine: {
                                    type: "number",
                                    description:
                                        "期望删除的起始行（包含），1-based。",
                                },
                                endLine: {
                                    type: "number",
                                    description:
                                        "期望删除的结束行（包含），1-based，必须 >= startLine。",
                                },
                                originalSnippet: {
                                    type: "string",
                                    description:
                                        "可选但建议：startLine~endLine 对应的原始代码片段（用 \\n 拼接）。后端会优先在该行区附近搜索这段文本，在行号略有偏差时自动对齐后再执行删除，减少误删风险且提高成功率。",
                                },
                            },
                            required: ["type", "startLine", "endLine"],
                        },
                    ],
                },
            },
        },
        required: ["filePath", "edits"],
    },
};

// ---- 参数校验 ----

function assertValidArgs(args: ApplyLineEditsArgs): void {
    const { filePath, edits } = args;

    if (!filePath || typeof filePath !== "string") {
        throw new Error("应用行级代码编辑失败：必须提供有效的 filePath 字符串。");
    }
    if (!Array.isArray(edits) || edits.length === 0) {
        throw new Error("应用行级代码编辑失败：edits 必须是非空数组。");
    }
}

// ---- 真正执行 ----

export async function applyLineEditsFunc(
    args: ApplyLineEditsArgs,
    thunkApi: any,
    context?: { parentMessageId?: string; signal?: AbortSignal; toolRunId?: string; agentKey?: string; userInput?: string }
): Promise<{ rawData: any; displayData?: string }> {
    assertValidArgs(args);

    const { filePath, edits } = args;

    

    try {
        const baseUrl = getToolBaseUrl(thunkApi);

        if (!baseUrl) {
            throw new Error("应用行级代码编辑失败：无法获取 applyLineEdits 服务器地址。");
        }

        const apiUrl = `${baseUrl.replace(/\/+$/, "")}/api/apply-line-edits`;

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: buildToolRequestHeaders(thunkApi, {
                withAuth: true,
                agentKey: context?.agentKey,
            }),
            signal: context?.signal,
            body: JSON.stringify({ filePath, edits }),
        });

        const textBody = await response.text();
        let data: any = {};
        try {
            data = textBody ? JSON.parse(textBody) : {};
        } catch {
            // ignore JSON parse error
        }

        if (!response.ok || data?.error) {
            const errMsg =
                data?.error ||
                `applyLineEdits API 请求失败，状态码: ${response.status}. 响应: ${textBody}`;
            console.error("applyLineEdits API Error:", errMsg);
            throw new Error(errMsg);
        }

        return {
            rawData: {
                applied: true,
                filePath,
                editCount: edits.length,
                response: data,
            },
            displayData: `✅ 已成功对文件应用 ${edits.length} 个行级编辑操作: ${filePath}`,
        };
    } catch (error: any) {
        console.error("执行 applyLineEdits 时发生错误:", error);
        throw new Error(
            `应用行级代码编辑到文件 (${filePath}) 失败：${toErrorMessage(error)}`
        );
    }
}
