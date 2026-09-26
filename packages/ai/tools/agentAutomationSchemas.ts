export const agentAutomationTriggerSchema = {
  oneOf: [
    {
      type: "object",
      description: "Cron trigger.",
      properties: {
        type: { type: "string", enum: ["cron"] },
        expression: {
          type: "string",
          description: "Cron expression, e.g. 0 9 * * *.",
        },
        timezone: {
          type: "string",
          description: "Optional timezone, e.g. Asia/Shanghai.",
        },
      },
      required: ["type", "expression"],
      additionalProperties: false,
    },
    {
      type: "object",
      description:
        "Inbound email trigger. Cheap code-side filters are evaluated before starting an Agent run. When both are present they use AND semantics.",
      properties: {
        type: { type: "string", enum: ["email"] },
        fromContains: {
          type: "string",
          description: "Case-insensitive substring match against sender email address.",
        },
        subjectContains: {
          type: "string",
          description: "Case-insensitive substring match against email subject.",
        },
      },
      required: ["type"],
      anyOf: [
        { required: ["fromContains"] },
        { required: ["subjectContains"] },
      ],
      additionalProperties: false,
    },
  ],
};
