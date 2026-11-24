export const deleteMemoryFunctionSchema = {
  name: "deleteMemory",
  description: [
    "在用户明确要求下，删除当前用户自身权限范围内的长期记忆（物理删除，不可逆）。",
    "【两阶段确认】confirmed: false（默认）只做 Dry-Run 预检并返回匹配总数与预览；向用户汇报预检结果、得到明确确认后才传 confirmed: true 真正执行。",
    "【权限边界】仅限当前用户拥有的记忆（ownerType: user），严禁删除他人或系统数据。",
    "【禁止全量清空】必须至少给一项过滤条件（ids / contentKeyword / kinds / tags）。",
  ].join("\n"),
  parameters: {
    type: "object",
    properties: {
      ids: {
        type: "array",
        items: { type: "string" },
        description: "可选。要精确删除的记忆 ID 列表。",
      },
      contentKeyword: {
        type: "string",
        description: "可选。按内容关键词/子串匹配。",
      },
      kinds: {
        type: "array",
        items: {
          type: "string",
          enum: ["episodic", "semantic", "procedural"],
        },
        description: "可选。按记忆类型过滤。",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "可选。按标签过滤。",
      },
      confirmed: {
        type: "boolean",
        description: "可选。两阶段确认标志：初次 false（仅预览），用户明确确认后才传 true。",
        default: false,
      },
      deletionToken: {
        type: "string",
        description: "可选。预检返回的防篡改 token，确认阶段带回以保证原子性。",
      },
      reason: {
        type: "string",
        description: "必填。用户提出删除的原因或指令描述。",
      },
    },
    required: ["reason"],
  } as const,
};
