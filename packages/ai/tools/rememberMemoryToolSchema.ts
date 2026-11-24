/**
 * rememberMemory 的 OpenAI function schema——唯一定义。
 *
 * 从 `rememberMemoryTool.ts` 抽出来是因为那个模块 import 了 Redux thunk/selector，
 * 只有渲染进程能加载；CLI/desktop 本地 runtime 需要同一份 schema，不能把 Redux
 * 拖进 CLI bundle。这里保持零依赖，执行器各 host 自己接。
 */
export const rememberMemoryFunctionSchema = {
  name: "rememberMemory",
  description: [
    "把值得长期记住的用户偏好、纠正或当前 Space 共识写成一条 memory。用户说「记住/以后都/别再/下次」时默认调用；不记一次性任务细节与当前进度，跨轮接续用 mode=work。",
    "【版本演进】未传 topicKey 时，调用本工具是写入新记录，底层不保证自动识别、合并或替代同一事实的旧记录；同一事实演进请传相同 topicKey，底层退役旧版本并保留审计链。严禁模型自行调用 deleteMemory 维护版本或归档旧条。",
    "【时效禁入】配额余量、限流冷却、部署当前状态等易过期快照不进长期记忆，用实时查询取当下真值。",
    "【procedural 硬门】kind=procedural 必须同时传 recurrenceEvidence（同一问题此前何时遇到过），给不出证据一律降级 episodic——只有至少遇到过两次的稳定流程才算 procedural。",
    "【删除边界】物理删除（deleteMemory）严格受限：仅在用户明确要求删除且在当前用户自身权限范围内时才允许；冲突与偏好演进靠当前输入覆盖，不靠擅自删除。",
    "【来源】每条须标 provenance（verified / stated / inferred）供召回判断置信度，无法判断的保守标 inferred。内容写成一句未来仍可理解的话，默认静默执行、不向用户汇报。",
  ].join("\n"),
  parameters: {
    type: "object",
    properties: {
      storage: { type: "string", enum: ["local", "server"], description: "CLI 工作记忆存储，默认 local；两端独立不同步。" },
      mode: { type: "string", enum: ["work"], description: "工作接续传 work；省略=普通长期记忆。状态是可能过时的记录者判断，不是验收结论、授权或任何行动权限；来源 ID 由宿主提供。" },
      itemKey: { type: "string", description: "创建工作时的稳定项目键。" },
      activityId: { type: "string", description: "更新时传已有工作 ID。" },
      expectedRevision: { type: "integer", minimum: 1, description: "更新时传上次读取的版本。" },
      changeId: { type: "string", description: "每次逻辑请求用新 ID；重试保持不变。" },
      patch: { type: "object", description: "仅 mode=work。新建必填非空 goal；更新已有工作可省略 goal 而沿用旧值。", properties: { goal: { type: "string", description: "新建必填；更新可省略。非空，长度 ≤ 4096。" }, constraints: { type: "array", items: { type: "string" } }, openItems: { type: "array", items: { type: "string" } }, nextStep: { type: "string" }, status: { type: "string", enum: ["active", "paused", "completed", "cancelled"] } } },
      content: {
        type: "string",
        description:
          "要记住的内容，写成一句未来仍可理解的简洁描述。",
      },
      scope: {
        type: "string",
        enum: ["auto", "user", "space"],
        description:
          "记忆范围：Space 协作共识传 space；用户个人身份/偏好传 user；与当前助手关系挂钩的偏好传 auto。auto 时 runtime 使用当前 auto/fixed 助手主体。",
      },
      kind: {
        type: "string",
        enum: ["episodic", "semantic", "procedural"],
        description:
          "记忆类型，默认 episodic。只有至少遇到过两次的可执行流程才用 procedural，且必须同时给 recurrenceEvidence，否则降级 episodic。",
      },
      provenance: {
        type: "string",
        enum: ["verified", "stated", "inferred"],
        description: "来源声明：verified=调用者声明实测，stated=用户陈述，inferred=推断（未验证）；无法判断时用 inferred。",
      },
      recurrenceEvidence: {
        type: "string",
        description:
          "kind=procedural 时必填：同一问题此前在什么时候遇到过（时间/场景/对话）。缺失则降级 episodic。",
      },
      topicKey: {
        type: "string",
        description:
          "可选稳定主题键（小写字母/数字/._:-，≤128 字符）。同一偏好或事实演进时传相同键，底层自动退役旧版本并保留审计链；不传则按独立新记录保留。",
      },
    },
    required: [],
  } as const,
};
