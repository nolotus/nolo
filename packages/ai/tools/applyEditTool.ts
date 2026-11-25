import { toErrorMessage } from "core/errorMessage";
import { buildToolRequestHeaders, getToolBaseUrl } from "./toolApiClient";

type EditMatchOptions = {
    occurrence?: number;
    expectedMatches?: number;
    replaceAll?: boolean;
};

export type ApplyEdit =
    | (EditMatchOptions & {
        type: "replace";
        oldText: string;
        newText: string;
    })
    | (EditMatchOptions & {
        type: "insertBefore";
        anchor: string;
        content: string;
    })
    | (EditMatchOptions & {
        type: "insertAfter";
        anchor: string;
        content: string;
    })
    | (EditMatchOptions & {
        type: "delete";
        oldText: string;
    });

export type ApplyEditArgs = {
    filePath: string;
    edits: ApplyEdit[];
};

export const applyEditFunctionSchema = {
    name: "applyEdit",
    description: [
        "推荐默认的代码编辑工具：按“精确文本片段”（不是行号）做局部修改——替换唯一片段、在唯一锚点前后插入、删除可精确定位的片段。",
        "工作流：codeSearch 找文件 → readFile 读最新内容（改动依赖用户给的 URL/文档页时先抓真值）→ 把读到的精确片段作为 oldText / anchor；网页取到的价格、上下文窗口等字段按原值写，不凭记忆改写。",
        "准确率：默认要求片段在文件中唯一匹配；匹配多次直接报错，需补上下文、传 occurrence，或显式 replaceAll=true；可用 expectedMatches 断言匹配次数。",
        "返回 rawData.response：newContent（编辑后完整内容，统一 \\n）、diff（行级 diff）、appliedEdits（每项匹配次数与实际应用次数）。",
        "filePath 必须是相对项目根（bun-nolo）的路径；优先用 applyEdit 做最小修改，无法用精确片段表达时才用 applyLineEdits 或整文件覆盖。",
    ].join("\n"),
    parameters: {
        type: "object",
        properties: {
            filePath: {
                type: "string",
                description:
                    "要修改的文件路径（相对项目根 bun-nolo），如 packages/server/routes.ts",
            },
            edits: {
                type: "array",
                description:
                    "按顺序应用的精确片段编辑；后一个基于前一个的结果。",
                items: {
                    type: "object",
                    oneOf: [
                        {
                            properties: {
                                type: { const: "replace" },
                                oldText: {
                                    type: "string",
                                    description: "要被替换的精确原始片段。",
                                },
                                newText: {
                                    type: "string",
                                    description: "替换后的新片段。",
                                },
                                occurrence: {
                                    type: "number",
                                    description: "可选：匹配多次时用第几次（1-based）。",
                                },
                                expectedMatches: {
                                    type: "number",
                                    description: "可选：断言匹配次数。",
                                },
                                replaceAll: {
                                    type: "boolean",
                                    description: "可选：true 时替换全部匹配项。",
                                },
                            },
                            required: ["type", "oldText", "newText"],
                        },
                        {
                            properties: {
                                type: { const: "insertBefore" },
                                anchor: {
                                    type: "string",
                                    description: "插入锚点的精确原始片段。",
                                },
                                content: {
                                    type: "string",
                                    description: "插入到锚点之前的文本。",
                                },
                                occurrence: {
                                    type: "number",
                                    description: "可选：匹配多次时用第几次（1-based）。",
                                },
                                expectedMatches: {
                                    type: "number",
                                    description: "可选：断言匹配次数。",
                                },
                                replaceAll: {
                                    type: "boolean",
                                    description: "可选：true 时对所有匹配锚点插入。",
                                },
                            },
                            required: ["type", "anchor", "content"],
                        },
                        {
                            properties: {
                                type: { const: "insertAfter" },
                                anchor: {
                                    type: "string",
                                    description: "插入锚点的精确原始片段。",
                                },
                                content: {
                                    type: "string",
                                    description: "要插入到锚点之后的文本。",
                                },
                                occurrence: {
                                    type: "number",
                                    description: "可选：匹配多次时用第几次（1-based）。",
                                },
                                expectedMatches: {
                                    type: "number",
                                    description: "可选：断言匹配次数。",
                                },
                                replaceAll: {
                                    type: "boolean",
                                    description: "可选：true 时对所有匹配锚点插入。",
                                },
                            },
                            required: ["type", "anchor", "content"],
                        },
                        {
                            properties: {
                                type: { const: "delete" },
                                oldText: {
                                    type: "string",
                                    description: "要删除的精确原始片段。",
                                },
                                occurrence: {
                                    type: "number",
                                    description: "可选：匹配多次时删第几次（1-based）。",
                                },
                                expectedMatches: {
                                    type: "number",
                                    description: "可选：断言匹配次数。",
                                },
                                replaceAll: {
                                    type: "boolean",
                                    description: "可选：true 时删除全部匹配项。",
                                },
                            },
                            required: ["type", "oldText"],
                        },
                    ],
                },
            },
        },
        required: ["filePath", "edits"],
    },
};

function assertValidArgs(args: ApplyEditArgs): void {
    if (!args.filePath || typeof args.filePath !== "string") {
        throw new Error("应用代码编辑失败：必须提供有效的 filePath 字符串。");
    }
    if (!Array.isArray(args.edits) || args.edits.length === 0) {
        throw new Error("应用代码编辑失败：edits 必须是非空数组。");
    }
}

export async function applyEditFunc(
    args: ApplyEditArgs,
    thunkApi: any,
    context?: { parentMessageId?: string; signal?: AbortSignal; toolRunId?: string; agentKey?: string; userInput?: string }
): Promise<{ rawData: any; displayData?: string }> {
    assertValidArgs(args);

    const { filePath, edits } = args;
    

    try {
        const baseUrl = getToolBaseUrl(thunkApi);

        if (!baseUrl) {
            throw new Error("应用代码编辑失败：无法获取 applyEdit 服务器地址。");
        }

        const apiUrl = `${baseUrl.replace(/\/+$/, "")}/api/apply-edit`;
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
                `applyEdit API 请求失败，状态码: ${response.status}. 响应: ${textBody}`;
            console.error("applyEdit API Error:", errMsg);
            throw new Error(errMsg);
        }

        return {
            rawData: {
                applied: true,
                filePath,
                editCount: edits.length,
                response: data,
            },
            displayData: `✅ 已成功对文件应用 ${edits.length} 个精确片段编辑: ${filePath}`,
        };
    } catch (error: any) {
        console.error("执行 applyEdit 时发生错误:", error);
        throw new Error(
            `应用代码编辑到文件 (${filePath}) 失败：${toErrorMessage(error)}`
        );
    }
}
