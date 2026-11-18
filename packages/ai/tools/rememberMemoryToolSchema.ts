/**
 * rememberMemory 的 OpenAI function schema——唯一定义。
 *
 * 从 `rememberMemoryTool.ts` 抽出来是因为那个模块 import 了
 * `create/space` 的 Redux thunk/selector 模块和 `./toolApiClient`，只有渲染进程能加载。
 * CLI/desktop 本地 runtime 需要同一份 schema 来向模型声明工具，但不能把
 * Redux 拖进 CLI bundle。
 *
 * 这里保持零依赖：任何 host 都可以直接 import。执行器各 host 自己接
 * （web 走 toolApiClient，CLI 走 /api/memory/remember 代理）。
 */
export const rememberMemoryFunctionSchema = {
  name: "rememberMemory",
  description: [
    "把值得长期记住的用户偏好、纠正、决策习惯或当前 Space 共识写成一条 memory。",
    "默认倾向于记：用户说出「记住/记得/别忘了/以后都/别再/我喜欢/我不喜欢/下次」这类话时，默认就调用本工具，不要反复自问是否够格。",
    "普通长期记忆仍不记一次性任务细节、当前任务进度或很快过期的事实；需跨轮接续的工作用 mode=work。",
    "【版本与演进说明】未传 topicKey 时，调用本工具是写入新记录，底层不保证自动识别、合并或替代同一事实的旧记录；若同一偏好/事实发生演进，请传相同的稳定 topicKey（如 \"code-formatter\"）以自动退役旧版本并保留历史审计链。严禁模型自行调用 deleteMemory 维护版本或清理旧条。",
    "【时效状态禁入】配额余量、限流冷却期限、部署当前状态等很快过期的快照不进长期记忆；这类信息用实时查询（如 listAgents、部署日志）获取当下真值，不要落进记忆。",
    "【procedural 硬门】kind=procedural 必须同时传 recurrenceEvidence（说明同一问题此前在什么时候遇到过）；",
    "给不出复现证据的一律按 episodic 存储（不报错，但你会在返回值里看到降级提示）。",
    "判据：这个流程你**至少已经遇到过两次**才算 procedural。单次排障实录、某次事故的处理过程、",
    "一次性调研结论都不是 procedural——哪怕它写得很像操作手册，也应该用默认的 episodic。",
    "scope 按内容性质选，不固定优先某一层：",
    "  - Space 协作约定/团队规则 → scope=space（当前 dialog 绑定 space 时）",
    "  - 用户个人身份或纯个人偏好 → scope=user（严格保存为用户主体）",
    "  - 与当前助手关系挂钩的偏好或有效做法 → scope=auto（runtime 使用当前 auto/fixed 助手主体）",
    "  - 工作接续信息使用 mode=work，不写入普通长期记忆；短暂进度仍留在对话上下文。",
    "写成一句简洁、未来仍可理解的话。默认静默执行，不用向用户汇报已记住。",
    "",
    "【删除权限安全边界】物理删除（deleteMemory）严格受限：仅在用户明确要求删除且在当前用户自身权限范围内时允许执行；严禁模型自行调用 deleteMemory 维护版本或归档旧条。冲突或偏好演进时优先依靠当前输入覆盖，不通过擅自删除来解决。",
    "",
    "【置信度来源】每条记忆必须标注来源（供召回时判断可信度）：",
    "  - verified：调用者声明工具/命令实测过（宿主未独立验证）",
    "  - stated：用户明确陈述（中高置信度）",
    "  - inferred：模型推断/凭印象，未验证（低置信度——容易编造，优先标记存疑）",
    "调用时尽量明确来源，无法判断的保守标 inferred。",
  ].join("\n"),
  parameters: {
    type: "object",
    properties: {
      storage: { type: "string", enum: ["local", "server"], description: "CLI 工作记忆存储；默认 local。两端独立，不自动同步。" },
      mode: { type: "string", enum: ["work"], description: "工作接续用 work；省略为普通长期记忆。状态是基于用户消息或执行证据的记录者判断，可能过时，不是验收结论、授权或任何行动权限。先查询获得 activityId 和 revision，不要求用户提供 ID。" },
      itemKey: { type: "string", description: "创建工作时的稳定项目键。" },
      activityId: { type: "string", description: "更新时传已有工作 ID。" },
      expectedRevision: { type: "integer", minimum: 1, description: "更新时传上次读取的版本。" },
      changeId: { type: "string", description: "每次不同逻辑请求使用新 ID；重试保持不变。无变化不记录去重回执。" },
      patch: { type: "object", description: "创建默认 active；状态按来源作记录者判断，不是行动授权或验收。", properties: { goal: { type: "string" }, constraints: { type: "array", items: { type: "string" } }, openItems: { type: "array", items: { type: "string" } }, nextStep: { type: "string" }, status: { type: "string", enum: ["active", "paused", "completed", "cancelled"] } } },
      content: {
        type: "string",
        description:
          "要记住的内容。请写成一句未来仍然可理解的简洁描述，例如“这个用户在复杂问题里更喜欢先看结论”。",
      },
      scope: {
        type: "string",
        enum: ["auto", "user", "space"],
        description:
          "记忆范围。Space 协作共识传 space；用户个人身份/偏好传 user；与当前助手关系挂钩的偏好传 auto。auto 时 runtime 使用当前 auto/fixed 助手主体。",
      },
      kind: {
        type: "string",
        enum: ["episodic", "semantic", "procedural"],
        description:
          "记忆类型。默认 episodic。只有你至少遇到过两次的可执行流程/稳定 runbook 才用 procedural，" +
          "且必须同时提供 recurrenceEvidence，否则会被降级为 episodic。单次排障实录用 episodic。",
      },
      provenance: {
        type: "string",
        enum: ["verified", "stated", "inferred"],
        description: "来源声明：verified 为调用者声明实测，stated 为用户陈述，inferred 为推断；均不代表用户要求常驻或宿主已验证。无法判断时用 inferred。",
      },
      recurrenceEvidence: {
        type: "string",
        description:
          "kind=procedural 时必填：同一问题此前在什么时候遇到过（时间/场景/对话），用于证明它确实重复出现。" +
          "例如“2026-08-27 和 2026-09-01 两次部署都卡在同一处 PM2 残留实例”。缺失则本条降级为 episodic。",
      },
      topicKey: {
        type: "string",
        description:
          "可选稳定主题键（如 \"code-formatter\"、\"report-language\"，仅用小写字母/数字/._:-，≤128 字符）。" +
          "同一偏好或事实演进时传相同稳定键，底层会自动退役同主体同类型的旧版本并保留历史审计链；不传则按独立新记录保留。",
      },
    },
    required: [],
  } as const,
};
