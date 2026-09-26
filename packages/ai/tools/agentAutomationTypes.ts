export type CronAgentAutomationTrigger = {
  type: "cron";
  expression: string;
  timezone?: string;
  nextWakeAt: number;
};

export type EmailAgentAutomationTrigger = {
  type: "email";
  /**
   * When true the automation fires on every inbound email for the bound
   * agent mailbox — no content filtering. Mutually exclusive with the
   * contains-style filters below. Semantically equivalent to the
   * previously-required hack `fromContains: "@"` but declared explicitly
   * so automation UIs can render it as a first-class "all mail" option
   * rather than a magic substring.
   */
  acceptAll?: boolean;
  /** Case-insensitive substring match against sender email address. */
  fromContains?: string;
  /** Case-insensitive substring match against email subject. */
  subjectContains?: string;
  /**
   * OR'd substring match against sender email address — matches if ANY
   * listed needle appears in the `From` header. AND'd with `subjectContains`
   * / `subjectContainsAny` when those are also present.
   */
  fromContainsAny?: string[];
  /**
   * OR'd substring match against email subject — matches if ANY listed
   * needle appears in `Subject`. AND'd with `fromContains` /
   * `fromContainsAny` when those are also present.
   */
  subjectContainsAny?: string[];
};

export type AgentAutomationTrigger =
  | CronAgentAutomationTrigger
  | EmailAgentAutomationTrigger;
