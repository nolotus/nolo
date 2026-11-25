export const queryMemoryFunctionSchema = {
  name: "queryMemory",
  description: [
    "按需查用户/Space/助手主体长期记忆：预载不足或提及既往约定、偏好、纠正、未完事项时查。普通事实不查，不换近义词反复查。",
    "保留来源、置信度和变更历史，不推断填补；inferred 标存疑，验证后采纳。",
    "状态意图用 mode=work + status，不写入 query。只返回工作记录，不判定子事项是否完成。",
  ].join("\n"),
  parameters: {
    type: "object",
    properties: {
      storage: { type: "string", enum: ["local", "server"], description: "CLI 工作存储；默认 local，两端不同步。" },
      mode: { type: "string", enum: ["work"], description: "省略=长期记忆；work=工作接续，记录者状态可能过时，非验收或授权。" },
      activityId: { type: "string", description: "精确工作 ID。" },
      status: {
        type: "string",
        enum: ["active", "paused", "completed", "cancelled", "all"],
        description: "无 activityId 默认 active；有 ID 时省略 status 则不过滤，返回原状态。active 仅进行中≠全部未完成；paused 通常也未完成，单独查；all 不限状态（含完成/取消）。",
      },
      discovery: { type: "string", enum: ["dialog", "scope"], description: "当前对话 / 同用户同空间。" },
      source: {
        type: "string",
        enum: ["archive"],
        description: "archive 只读旧史，非当前结论；仅当前用户，不支持 Space。",
      },
      limit: { type: "integer", minimum: 1, maximum: 100, description: "每页默认 20；archive 最多扫描 100 条索引/页。" },
      cursor: { type: "string", description: "archive 首查省略或空串；续查原样传上页非空 cursor，不构造，query 不变。空页也可能 truncated，须续查；无快照一致性。" },
      query: {
        type: "string",
        description: "可省略。work：goal/constraints/openItems/nextStep 的字面子串（忽略大小写），不识别同义词、不判状态；长期记忆：问题或关键词。",
      },
    },
    required: [],
  } as const,
};
