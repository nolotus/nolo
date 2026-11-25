export const deleteMemoryFunctionSchema = {
  name: "deleteMemory",
  description: [
    "仅用户明确要求才可物理删除（不可逆）；仅当前用户自有记忆（ownerType: user），禁止删他人/系统数据。",
    "禁止全量清空：至少一项过滤（ids / contentKeyword / kinds / tags）。",
    "confirmed:false（默认）预检匹配总数、预览和 deletionToken；给用户完整待删清单并获明确确认，才带 token 传 confirmed:true 执行。",
  ].join("\n"),
  parameters: {
    type: "object",
    properties: {
      ids: {
        type: "array",
        items: { type: "string" },
        description: "精确记忆 ID。",
      },
      contentKeyword: {
        type: "string",
        description: "内容子串。",
      },
      kinds: {
        type: "array",
        items: {
          type: "string",
          enum: ["episodic", "semantic", "procedural"],
        },
        description: "类型过滤。",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "标签过滤。",
      },
      confirmed: {
        type: "boolean",
        description: "默认仅预检。",
        default: false,
      },
      deletionToken: {
        type: "string",
        description: "确认时原样回传预检防篡改 token，保证原子性。",
      },
      reason: {
        type: "string",
        description: "必填。用户提出删除的原因或指令描述。",
      },
    },
    required: ["reason"],
  } as const,
};
