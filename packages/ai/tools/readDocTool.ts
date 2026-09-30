// 文件路径: ai/tools/readDocTool.ts

import { toErrorMessage } from "core/errorMessage";
import { slateToSimplifiedMarkdown } from "create/editor/transforms/slateToSimplifiedMarkdown";
import type { PageData } from "render/page/types";

export interface ReadPageToolArgs {
    id?: string; // 对应 dbKey，例如 "page-xxx"
    doc?: string;
    docKey?: string;
    pageKey?: string;
    key?: string;
}

/**
 * Resolve the text an AI read should see for a document.
 *
 * slateData is the document source of truth for current records. Older records
 * can legitimately be content-only, though, and read-only UI already treats
 * `content` as the legacy bridge. Keeping the same fallback here prevents a
 * durable legacy document from being projected as an empty document merely
 * because it predates slateData.
 *
 * Important: a present, non-empty slate document wins over the legacy cache;
 * content is only a compatibility fallback when slateData has no nodes.
 */
export const resolvePageReadMarkdown = (pageData: PageData): string => {
    const slateData = pageData.slateData;
    if (Array.isArray(slateData) && slateData.length > 0) {
        return slateToSimplifiedMarkdown(slateData);
    }

    return typeof pageData.content === "string" ? pageData.content : "";
};

/**
 * [Schema] 定义了 'readDoc' 工具的结构。
 */
export const readDocFunctionSchema = {
    name: "readDoc",
    description: [
        "读取指定页面的内容，并将结构化的数据转换为 Markdown 格式返回。",
        "如果你拿到了页面的 dbKey（如 page-xxx），请使用此工具查看页面内容。",
    ].join("\n"),
    parameters: {
        type: "object",
        properties: {
            id: {
                type: "string",
                description: "页面/文档的数据库键（dbKey），例如 page-xxx。",
            },
        },
        required: ["id"],
    },
} as const;

export const readPageFunctionSchema = {
    ...readDocFunctionSchema,
    name: "readPage",
} as const;

export const buildReadDocResult = (
    pageData: PageData
): { rawData: unknown; displayData: string } => {
    const markdownContent = resolvePageReadMarkdown(pageData);

    const rawData = {
        success: true,
        id: pageData.dbKey,
        title: pageData.title,
        content: markdownContent,
        metadata: {
            spaceId: pageData.spaceId,
            created: pageData.created,
        },
    };

    const displayData = `已成功读取页面《${pageData.title}》。\n\n内容如下：\n\n${markdownContent}`;
    return { rawData, displayData };
};

/**
 * [Executor] 'readDoc' 工具的执行函数。
 */
export async function readDocFunc(
    args: ReadPageToolArgs,
    thunkApi: any
): Promise<{ rawData: unknown; displayData: string }> {
    const id = args.id ?? args.doc ?? args.docKey ?? args.pageKey ?? args.key;

    if (!id || !id.toLowerCase().startsWith("page-")) {
        throw new Error(`无效的页面 ID: ${id}。页面 ID 通常以 "page-" 开头。`);
    }

    try {
        // 1. 从数据库读取原始数据
        const { readAction } = await import("database/actions/read");
        const pageData = (await readAction({ dbKey: id }, thunkApi)) as PageData;

        if (!pageData) {
            throw new Error(`未找到 ID 为 ${id} 的页面。`);
        }

        return buildReadDocResult(pageData);
    } catch (error: any) {
        throw new Error(`读取页面时出错: ${toErrorMessage(error)}`);
    }
}

export const readPageFunc = readDocFunc;
