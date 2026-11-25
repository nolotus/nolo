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
    "记用户偏好、纠正、Space 共识；「记住/以后都/别再/下次」默认写。不记一次性细节；进度用 mode=work + patch。",
    "无 topicKey 时，调用本工具是写入新记录，底层不保证自动识别、合并或替代同一事实的旧记录；同一事实沿用 topicKey：退役旧版，留审计链。严禁模型自行调用 deleteMemory 维护版本或归档旧条。",
    "物理删除（deleteMemory）严格受限：仅在用户明确要求删除且仅限自身权限；冲突从当前输入。",
    "禁存易过期快照（配额、冷却、部署状态），实时查。kind=procedural 须 recurrenceEvidence，否则降级 episodic。",
    "须标 provenance：verified / stated / inferred；不确定用 inferred。默认静默写入。",
  ].join("\n"),
  parameters: {
    type: "object",
    properties: {
      storage: { type: "string", enum: ["local", "server"], description: "CLI 工作存储；默认 local，两端不同步。" },
      mode: { type: "string", enum: ["work"], description: "省略=长期记忆；work 状态可能过时，非验收或授权。" },
      itemKey: { type: "string", description: "新建：稳定项目键。" },
      activityId: { type: "string", description: "更新：已有工作 ID。" },
      expectedRevision: { type: "integer", minimum: 1, description: "更新：上次读取版本。" },
      changeId: { type: "string", description: "每逻辑请求新 ID，重试复用。" },
      patch: { type: "object", description: "work 专用；更新缺 goal 则沿用。", properties: { goal: { type: "string", description: "新建必填，非空，≤4096。" }, constraints: { type: "array", items: { type: "string" } }, openItems: { type: "array", items: { type: "string" } }, nextStep: { type: "string" }, status: { type: "string", enum: ["active", "paused", "completed", "cancelled"] } } },
      content: {
        type: "string",
        description:
          "一句能长期读懂的话。",
      },
      scope: {
        type: "string",
        enum: ["auto", "user", "space"],
        description:
          "space=协作共识；user=个人身份/偏好；auto=助手相关偏好（当前 auto/fixed 主体）。",
      },
      kind: {
        type: "string",
        enum: ["episodic", "semantic", "procedural"],
        description:
          "默认 episodic；procedural 仅限重复≥2次的稳定可执行流程。",
      },
      provenance: {
        type: "string",
        enum: ["verified", "stated", "inferred"],
        description: "verified=声明实测；stated=用户陈述；inferred=未验证推断。",
      },
      recurrenceEvidence: {
        type: "string",
        description:
          "同一问题的上次时间/场景/对话。",
      },
      topicKey: {
        type: "string",
        description:
          "可选稳定键（小写字母/数字/._:-，≤128 字符）。",
      },
    },
    required: [],
  } as const,
};
