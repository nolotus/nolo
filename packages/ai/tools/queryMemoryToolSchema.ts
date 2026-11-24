export const queryMemoryFunctionSchema = {
  name: "queryMemory",
  description: [
    "按需查询当前用户、Space 与当前助手主体的长期记忆；系统已自动预载少量高相关记忆，只有预载不足或用户提到过去约定/偏好/纠正/未完成事项时才调用，不要为普通事实问题查询，也不要同轮用近义词反复查。",
    "「未完成/还没做完」属于状态意图：用 mode=work 加 status 表达，不要把状态词写进 query。",
    "【召回规则】召回的记忆必须带完整历史上下文（来源、置信度、变更记录），禁止自行推理填补；inferred 来源必须标注存疑，验证后再采纳。",
    "【mode=work】返回的是工作记录（goal/constraints/openItems/nextStep）本身，不做「某个子事项完成没完成」的判断。",
    "- status 按记录保存的工作状态过滤，未提供 activityId 时默认 active（进行中）；按 activityId 精确读取时，省略 status 默认不过滤状态，返回该条记录自身的 status。active 只表示进行中，不等于「全部未完成」；paused 通常也算未完成，需要时单独查；all 不按状态过滤。",
    "- query 可省略，只对 goal/constraints/openItems/nextStep 做字面过滤（不区分大小写的子串匹配），不识别同义词，也不判断完成状态；查状态请用 status。",
    '示例：{ mode: "work" } = 有哪些正在做的事；{ mode: "work", status: "active", query: "部署" } = 部署还有哪些在进行；{ mode: "work", status: "paused" } = 仅暂停的工作；{ mode: "work", status: "all" } = 所有状态的工作（包含已完成/已取消），按每条自己的 status 区分。',
  ].join("\n"),
  parameters: {
    type: "object",
    properties: {
      storage: { type: "string", enum: ["local", "server"], description: "CLI 工作记忆存储，默认 local；两端独立不同步。" },
      mode: { type: "string", enum: ["work"], description: "work=工作接续查询；省略=普通长期记忆。状态是可能过时的记录者判断，不是验收结论或授权。" },
      activityId: { type: "string", description: "精确工作 ID。" },
      status: {
        type: "string",
        enum: ["active", "paused", "completed", "cancelled", "all"],
        description: "按记录保存的工作状态过滤，未提供 activityId 时默认 active（进行中）；按 activityId 精确读取时，省略 status 默认不过滤状态，返回该条记录自身的 status。",
      },
      discovery: { type: "string", enum: ["dialog", "scope"], description: "当前对话或同用户同空间范围。" },
      source: {
        type: "string",
        enum: ["archive"],
        description: "显式查旧版历史传 archive（只读，不代表当前结论）；仅当前用户，不支持 Space。",
      },
      limit: { type: "integer", minimum: 1, maximum: 100, description: "每页条数，默认 20；archive 每页最多扫描 100 条索引。" },
      cursor: { type: "string", description: "archive 首查省略（空串等价省略）；续查只能原样用上一页返回的非空 cursor，禁止构造（如 0），query 保持不变；空结果也可能 truncated，继续翻页；无快照一致性。" },
      query: {
        type: "string",
        description: "字面主题过滤，可省略：对 goal/constraints/openItems/nextStep 做不区分大小写的子串匹配，不识别同义词，不判断完成状态；普通记忆模式下作为检索问题或关键词。",
      },
    },
    required: [],
  } as const,
};
