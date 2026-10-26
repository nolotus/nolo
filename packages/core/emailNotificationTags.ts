/**
 * 邮件通知标签的唯一真值清单。
 *
 * 生产端（auth/server）与设置页（app）都必须从这里取标签，禁止各自维护副本，
 * 否则退订白名单与界面开关会静默漂移。
 */

export type EmailNotificationGroup = "onboarding" | "retention" | "transactional";

export interface EmailNotificationTagDefinition {
  /** 与数据库 emailOptOutTags 中存储的值一致 */
  readonly id: string;
  readonly group: EmailNotificationGroup;
  /**
   * 事务性通知（充值、账号状态等）：不允许用户关闭，
   * 服务端应忽略针对这些 tag 的退订请求。
   */
  readonly transactional: boolean;
  /**
   * 是否会在用户生命周期内重复发生。
   * false = 一次性事件（发出即终态，如欢迎/新手引导/流程中断挽回）：
   *         不允许渲染成常驻开关，因为"关掉"它不会改变任何后续行为。
   * true  = 周期性可能再次触发（召回、余额提醒），用户才真正需要开关。
   */
  readonly recurring: boolean;
  /**
   * 不可配置：既不是周期性的，也不允许用户关闭（例如注册欢迎邮件）。
   * 与 transactional 的区别是"不是交易凭证"，但同样不提供控件。
   */
  readonly locked?: boolean;
}

export const EMAIL_NOTIFICATION_TAGS: readonly EmailNotificationTagDefinition[] = [
  { id: "signup-welcome", group: "onboarding", transactional: false, recurring: false, locked: true },
  { id: "onboarding-guide", group: "onboarding", transactional: false, recurring: false },
  { id: "flow-interruption", group: "onboarding", transactional: false, recurring: false },
  { id: "reengagement", group: "retention", transactional: false, recurring: true },
  { id: "low-balance-reminder", group: "retention", transactional: false, recurring: true },
  { id: "recharge-success", group: "transactional", transactional: true, recurring: false },
  { id: "recharge-failed", group: "transactional", transactional: true, recurring: false },
  { id: "account-disabled", group: "transactional", transactional: true, recurring: false },
  { id: "account-enabled", group: "transactional", transactional: true, recurring: false },
];

/** 可退订标签（含 "all" 这一全局语义），用于服务端校验 */
export const ALLOWED_EMAIL_TAGS: ReadonlySet<string> = new Set<string>([
  "all",
  ...EMAIL_NOTIFICATION_TAGS.map((tag) => tag.id),
]);

/** 事务性标签，退订请求必须被忽略 */
export const TRANSACTIONAL_EMAIL_TAGS: ReadonlySet<string> = new Set<string>(
  EMAIL_NOTIFICATION_TAGS.filter((tag) => tag.transactional).map((tag) => tag.id)
);

/**
 * 只能在调度 leader 实例上发送的标签（多实例下避免重复发信）。
 * 与 ONE_TIME_IDEMPOTENCY_EMAIL_TAGS 一样，必须取自上面的清单，
 * 否则新增标签时会静默绕过 leader 抑制或幂等保护。
 */
export const LEADER_ONLY_EMAIL_TAGS: ReadonlySet<string> = new Set<string>([
  "signup-welcome",
  "onboarding-guide",
  "flow-interruption",
  "reengagement",
  "low-balance-reminder",
]);

/** 一次性幂等标签：同一用户终生只发一次 */
export const ONE_TIME_IDEMPOTENCY_EMAIL_TAGS: ReadonlySet<string> = new Set<string>([
  "signup-welcome",
  "onboarding-guide",
  "flow-interruption",
]);

/** 不可配置标签：不提供开关，也不参与退订 */
export const LOCKED_EMAIL_TAGS: ReadonlySet<string> = new Set<string>(
  EMAIL_NOTIFICATION_TAGS.filter((tag) => tag.locked).map((tag) => tag.id)
);

export const isLockedEmailTag = (tag: string): boolean => LOCKED_EMAIL_TAGS.has(tag);

export const isTransactionalEmailTag = (tag: string): boolean =>
  TRANSACTIONAL_EMAIL_TAGS.has(tag);

export const isAllowedEmailTag = (tag: string): boolean => ALLOWED_EMAIL_TAGS.has(tag);
