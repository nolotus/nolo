// 文件: ai/tools/table/addTableRowTool.ts

import { isRecord } from "core/isRecord";
import { asRecordOrEmpty } from "core/recordOrEmpty";
import { addRow } from "render/table/tableStore";
import { resolveTableIdentity, loadTableMetaOrThrow } from "./toolShared";

/**
 * [Schema] addTableRow：在指定表中新增一行数据
 *
 * 设计要点：
 * - 必须显式提供 tenantId / tableId
 * - LLM 主要只需要关心 values（列名 -> 值）
 */
export const addTableRowFunctionSchema = {
    name: "addTableRow",
    description:
        [
            "在指定表中新增一行数据。",
            "必须显式传入 tenantId 和 tableId。这两个值可从创建表或查询表的返回结果中获取。",
            "表格字段必须放在 values 对象里，不要把 content、status 这类列名直接放在顶层。",
            '完整示例：{"tenantId":"u1","tableId":"t1","values":{"content":"希望支持支付宝支付","status":"待处理"}}。',
        ].join("\n"),
    parameters: {
        type: "object",
        properties: {
            values: {
                type: "object",
                description:
                    [
                        "要写入新行的数据。key 必须是目标表已有的列名，多余字段会被忽略。",
                        '请根据用户的自然语言描述，为每个相关字段填上合理的值，而不是传入空对象 {}。',
                        '字段必须包在 values 中。示例：{"values": {"name": "张三", "desc": "测试任务", "date": "2025-01-01"}}。',
                    ].join("\n"),
                additionalProperties: {
                    description:
                        "单个字段的值；可以是字符串、数字、布尔值、null、对象或数组。",
                },
            },
            tenantId: {
                type: "string",
                description: "目标表的租户 ID。必须显式传入。",
            },
            tableId: {
                type: "string",
                description: "目标表的表 ID。必须显式传入。",
            },
        },
        required: ["tenantId", "tableId", "values"],
    },
};

type AddTableRowArgs = {
    values?: Record<string, any>;
    tenantId?: string;
    tableId?: string;
} & Record<string, any>;

type AddTableRowResult = {
    rawData: any;
    displayData: string;
};

const toPreviewJson = (value: unknown, maxLength = 400): string => {
    try {
        const json = JSON.stringify(value, null, 2);
        if (json.length <= maxLength) return json;
        return `${json.slice(0, maxLength)}\n…(已截断)…`;
    } catch {
        return "[无法序列化为 JSON]";
    }
};

const RESERVED_ARG_KEYS = new Set(["tenantId", "tableId", "values"]);

const extractLegacyValues = (args: AddTableRowArgs | undefined): Record<string, any> => {
    return Object.fromEntries(
        Object.entries(asRecordOrEmpty(args)).filter(
            ([key, value]) => !RESERVED_ARG_KEYS.has(key) && value !== undefined
        )
    );
};

/**
 * [Executor] 在指定表中新增一行
 *
 * - 底层 executor 显式要求 tenantId / tableId
 * - 从数据库/存储层显式加载 tableMeta，不依赖 UI currentTable
 */
export async function addTableRowFunc(
    args: AddTableRowArgs,
    thunkApi: any
): Promise<AddTableRowResult> {
    const { tenantId, tableId } = resolveTableIdentity(args);

    if (!tenantId || !tableId) {
        throw new Error(
            "addTableRow 必须显式提供 tenantId 和 tableId。"
        );
    }

    const normalizedValues =
        args?.values !== undefined ? args.values : extractLegacyValues(args);
    const values = (normalizedValues ?? {}) as Record<string, any>;

    if (!isRecord(values)) {
        throw new Error(
            'addTableRow.values 必须是一个对象（列名到值的映射，例如 { "name": "张三", "desc": "测试任务" }）。'
        );
    }

    const tableMeta = await loadTableMetaOrThrow(thunkApi, tenantId, tableId);

    // 兜底：禁止传空对象 {}，要求至少提供一个字段
    if (Object.keys(values).length === 0) {
        const knownCols = tableMeta && Array.isArray(tableMeta.columns)
            ? tableMeta.columns.map((c: any) => c.name).join(", ") || "(无列定义)"
            : "(目标表字段未知)";

        throw new Error(
            `addTableRow.values 不能为空：你需要至少为一个字段提供值。\n` +
            `请根据用户的输入，从以下字段中选择并填充值：${knownCols}`
        );
    }

    let sanitizedValues: Record<string, any> = values;
    let ignoredColumns: string[] = [];

    if (tableMeta && Array.isArray(tableMeta.columns) && tableMeta.columns.length > 0) {
        const allowedColumns = new Set(tableMeta.columns.map((c: any) => c.name));

        sanitizedValues = {};
        ignoredColumns = [];

        for (const [key, val] of Object.entries(values)) {
            if (allowedColumns.has(key)) {
                sanitizedValues[key] = val;
            } else {
                ignoredColumns.push(key);
            }
        }

        if (
            Object.keys(sanitizedValues).length === 0 &&
            Object.keys(values).length > 0
        ) {
            const knownCols =
                tableMeta.columns.map((c: any) => c.name).join(", ") || "(无列定义)";

            throw new Error(
                `addTableRow 失败：提供的字段名都不在目标表中。\n` +
                `已知字段: ${knownCols}\n` +
                `请仅使用这些字段名作为 key。`
            );
        }
    }

    try {
        const actionResult = await thunkApi.dispatch(
            addRow({ tenantId, tableId, values: sanitizedValues })
        );

        if (!addRow.fulfilled.match(actionResult)) {
            const msg =
                (actionResult.payload as string) ||
                actionResult.error?.message ||
                "新增表行失败";
            throw new Error(msg);
        }

        const createdRow = actionResult.payload as any;

        const tableLabel =
            tableMeta?.displayName ||
            tableMeta?.tableId ||
            tableId;

        const ignoredInfo =
            ignoredColumns.length > 0
                ? `\n\n注意：以下字段在目标表中不存在，已被忽略：${ignoredColumns.join(
                    ", "
                )}`
                : "";

        return {
            rawData: {
                ...createdRow,
                values: sanitizedValues,
            },
            displayData:
                `已在表「${tableLabel}」中新增一行数据。\n` +
                `rowId: ${createdRow.rowId ?? "（无 rowId 字段）"}\n\n` +
                `数据预览：\n${toPreviewJson(createdRow)}${ignoredInfo}`,
        };
    } catch (error: any) {
        throw new Error(
            `addTableRow 调用失败：${error?.message ?? "未知错误"}`
        );
    }
}
