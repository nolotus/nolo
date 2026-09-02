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
    "仍然不要记：一次性任务细节、当前任务进度、很快过期的事实。",
    "【演进更新】同一事实的状态/结论变化（如「未 push→已 push」「配额耗尽→已恢复」）是更新而非新事实：写入时用取代后的表述一次性说清；若本条已取代某条旧记忆，调用 deleteMemory 归档旧条，避免同主题多版本并存。",
    "【时效状态禁入】配额余量、限流冷却期限、部署当前状态等很快过期的快照不进长期记忆；这类信息用实时查询（如 listAgents、部署日志）获取当下真值，不要落进记忆。",
    "【procedural 硬门】kind=procedural 必须同时传 recurrenceEvidence（说明同一问题此前在什么时候遇到过）；",
    "给不出复现证据的一律按 episodic 存储（不报错，但你会在返回值里看到降级提示）。",
    "判据：这个流程你**至少已经遇到过两次**才算 procedural。单次排障实录、某次事故的处理过程、",
    "一次性调研结论都不是 procedural——哪怕它写得很像操作手册，也应该用默认的 episodic。",
    "scope 按内容性质选，不固定优先某一层：",
    "  - Space 协作约定/团队规则 → scope=space（当前 dialog 绑定 space 时）",
    "  - 用户个人身份或纯个人偏好 → scope=user（严格保存为用户主体）",
    "  - 与当前助手关系挂钩的偏好或有效做法 → scope=auto（runtime 使用当前 auto/fixed 助手主体）",
    "  - 当前任务的临时进度 → 不要调用，走对话上下文",
    "写成一句简洁、未来仍可理解的话。默认静默执行，不用向用户汇报已记住。",
    "",
    "【关键规则】日常错误记忆优先通过 rememberMemory 修正并降权（降低置信度）或归档，保留档案与解释链。",
    "【强制删除例外】仅在用户明确/强制要求删除且在用户自身权限范围内时，才允许执行物理删除（调用 deleteMemory，严格限制于当前用户拥有的记忆）。",
    "",
    "【置信度来源】每条记忆必须标注来源（供召回时判断可信度）：",
    "  - verified：工具/命令实测验证过（高置信度）",
    "  - stated：用户明确陈述（中高置信度）",
    "  - inferred：模型推断/凭印象，未验证（低置信度——容易编造，优先标记存疑）",
    "调用时尽量明确来源，无法判断的保守标 inferred。",
  ].join("\n"),
  parameters: {
    type: "object",
    properties: {
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
      recurrenceEvidence: {
        type: "string",
        description:
          "kind=procedural 时必填：同一问题此前在什么时候遇到过（时间/场景/对话），用于证明它确实重复出现。" +
          "例如“2026-08-27 和 2026-09-01 两次部署都卡在同一处 PM2 残留实例”。缺失则本条降级为 episodic。",
      },
    },
    required: ["content"],
  } as const,
};
