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
        "Inbound email trigger. Cheap code-side filters are evaluated before starting an Agent run. " +
        "Set acceptAll=true to fire on every inbound email. Otherwise provide at least one of " +
        "fromContains, subjectContains, fromContainsAny, or subjectContainsAny — within a single " +
        "field, *Any arrays are OR'd; across fields they are AND'd.",
      properties: {
        type: { type: "string", enum: ["email"] },
        acceptAll: {
          type: "boolean",
          description:
            "When true the automation fires on every inbound email for the bound agent mailbox — no content filtering.",
        },
        fromContains: {
          type: "string",
          description: "Case-insensitive substring match against sender email address.",
        },
        subjectContains: {
          type: "string",
          description: "Case-insensitive substring match against email subject.",
        },
        fromContainsAny: {
          type: "array",
          description:
            "OR'd substring match against sender email — matches if ANY listed needle appears in the From header.",
          items: { type: "string" },
          minItems: 1,
        },
        subjectContainsAny: {
          type: "array",
          description:
            "OR'd substring match against email subject — matches if ANY listed needle appears in the Subject.",
          items: { type: "string" },
          minItems: 1,
        },
      },
      required: ["type"],
      anyOf: [
        { required: ["acceptAll"] },
        { required: ["fromContains"] },
        { required: ["subjectContains"] },
        { required: ["fromContainsAny"] },
        { required: ["subjectContainsAny"] },
      ],
      additionalProperties: false,
    },
  ],
};
