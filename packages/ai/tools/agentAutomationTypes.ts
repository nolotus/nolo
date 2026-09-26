export type CronAgentAutomationTrigger = {
  type: "cron";
  expression: string;
  timezone?: string;
  nextWakeAt: number;
};

export type EmailAgentAutomationTrigger = {
  type: "email";
  fromContains?: string;
  subjectContains?: string;
};

export type AgentAutomationTrigger =
  | CronAgentAutomationTrigger
  | EmailAgentAutomationTrigger;
