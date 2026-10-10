import { parseUiCard, uiCardFallback, type UiCard } from "./uiCardSchema";

export const showInteractionFunctionSchema = {
  name: "show_interaction",
  description:
    "在对话正文中展示结构化对比、关键指标、清单、只读表格与轻量选项。“展示结构化内容 + 让用户选择”同时出现时优先使用（展示结构化内容与选项在同一块呈现，提交后原位只读）。纯提问等待回答请用 ask_user。非阻塞：不会暂停等待用户回复，也不会自动执行卡片中的动作；用户若操作，选择将作为新消息回传。禁忌：一句话能讲清、闲聊、用户已授权直接执行时勿用；涉及多步流程、表单提交业务动作或持久工具时必须交付 App。能力边界：仅支持声明的 text/metric/list/table/choice/action 块；不支持图表、动态数据绑定或执行外部操作。",
  parameters: {
    type: "object",
    properties: {
      id: { type: "string", minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$", description: "卡片稳定标识（如 plan-summary:1）" },
      version: { type: "integer", enum: [1], description: "协议版本，固定为 1" },
      source: { type: "string", enum: ["tool"], description: "来源标识，固定为 tool" },
      blocks: {
        type: "array", maxItems: 32,
        description: "展示块列表（仅支持 text/metric/list/table/choice/action）",
        items: { oneOf: [
          { type: "object", properties: { type: { const: "text" }, text: { type: "string" } }, required: ["type", "text"], additionalProperties: false },
          { type: "object", properties: { type: { const: "metric" }, label: { type: "string" }, value: { type: "string" }, detail: { type: "string" } }, required: ["type", "label", "value"], additionalProperties: false },
          { type: "object", properties: { type: { const: "list" }, title: { type: "string" }, items: { type: "array", maxItems: 50, items: { type: "string" } } }, required: ["type", "items"], additionalProperties: false },
          { type: "object", properties: { type: { const: "table" }, columns: { type: "array", maxItems: 50, items: { type: "string" } }, rows: { type: "array", maxItems: 50, items: { type: "array", maxItems: 50, items: { type: "string" } } } }, required: ["type", "columns", "rows"], additionalProperties: false },
          { type: "object", properties: { type: { const: "choice" }, question: { type: "object", properties: { id: { type: "string" }, header: { type: "string" }, question: { type: "string" }, choices: { type: "array", maxItems: 50, items: { type: "object", properties: { id: { type: "string" }, label: { type: "string" }, detail: { type: "string" }, recommended: { type: "boolean" }, userMessage: { type: "string" } }, required: ["label"], additionalProperties: false } }, multiSelect: { type: "boolean" }, allowOther: { type: "boolean" }, required: { type: "boolean" } }, required: ["id", "question", "choices"], additionalProperties: false } }, required: ["type", "question"], additionalProperties: false },
          { type: "object", properties: { type: { const: "action" }, action: { oneOf: [
            { type: "object", properties: { type: { const: "submit" }, payload: { type: "object" } }, required: ["type"], additionalProperties: false },
            { type: "object", properties: { type: { const: "openApp" }, appId: { type: "string" }, url: { type: "string" } }, required: ["type", "appId"], additionalProperties: false },
          ] } }, required: ["type", "action"], additionalProperties: false },
        ] },
      },
    },
    required: ["id", "version", "source", "blocks"], additionalProperties: false,
  },
} as const;

export async function showInteractionFunc(args: unknown) {
  const parsed = parseUiCard(args);
  if (!parsed.ok) throw new Error(`Invalid show_interaction input: ${parsed.error}`);
  const card: UiCard = parsed.value;
  return { rawData: { type: "show_interaction" as const, card, fallbackText: uiCardFallback(card) } };
}
