export const queryMemoryFunctionSchema = {
  name: "queryMemory",
  description: [
    "按需查询当前用户、Space 和当前 auto/fixed 助手主体的长期记忆。",
    "对话开始前系统会自动载入少量高相关记忆；只有预载不足、用户提到过去约定/偏好/纠正/未完成事项时才调用。",
    "不要为了普通事实问题查询，也不要在同一轮用近义词反复查询。",
    "",
    "【召回规则】召回的记忆必须带完整历史上下文（来源、置信度、变更记录），禁止自行推理填补。",
    "如果记忆来源是 inferred（推断），必须明确标注存疑，不能当成验证过的事实使用。",
    "高置信度记忆（verified/stated）优先使用；低置信度记忆（inferred）需验证后再采纳。",
  ].join("\n"),
  parameters: {
    type: "object",
    properties: {
      storage: { type: "string", enum: ["local", "server"], description: "CLI 工作记忆存储；默认 local。两端独立，不自动同步。" },
      mode: { type: "string", enum: ["work"], description: "工作接续查询；省略为普通长期记忆。状态是可能过时的记录者判断，不是验收结论或行动授权；可从结果取得 activityId 和 revision。" },
      activityId: { type: "string", description: "精确工作 ID。" },
      status: { type: "string", enum: ["active", "paused", "completed", "cancelled", "all"] },
      discovery: { type: "string", enum: ["dialog", "scope"], description: "当前对话或同用户同空间范围。" },
      source: {
        type: "string",
        enum: ["archive"],
        description: "显式查旧版历史时传 archive（纯只读，不代表当前结论）；省略保持默认查询。仅当前用户 archive，不支持 Space。",
      },
      limit: { type: "integer", minimum: 1, maximum: 100, description: "archive 每页最多返回条数，默认20；每页最多扫描100条索引。" },
      cursor: { type: "string", description: "archive 首查省略 cursor（空字符串等价省略）；续查只能原样使用上一页返回的非空 cursor，禁止猜测或构造（如 0），保持 query 不变。空结果也可能 truncated，继续翻页。不提供快照一致性。" },
      query: {
        type: "string",
        description: "要从长期记忆中检索的自然语言问题或关键词。",
      },
    },
    required: [],
  } as const,
};
