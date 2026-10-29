// packages/agent-runtime/executionGears.ts
//
// 6 个「执行档位」（execution gears）的纯数据定义。
//
// 纯数据契约，不写成 if 链。供路由、技能注册、会话策略与审计复用。
// 字段取自 executionEndpoint.ts 的一等类型：ExecutionPolicy、
// ExecutionSourceTrust、EndpointCapability、ExecutionPolicyRefusalCode。

import type {
  EndpointCapability,
  ExecutionPolicy,
  ExecutionPolicyRefusalCode,
  ExecutionSourceTrust,
} from "./executionEndpoint";

export const EXECUTION_GEAR_IDS = [
  "undeclared-control",
  "plain-chat",
  "run-script",
  "repo-work",
  "local-project",
  "third-party-skill",
] as const;

export type ExecutionGearId = (typeof EXECUTION_GEAR_IDS)[number];

export type ExecutionGearDefinition = {
  readonly id: ExecutionGearId;
  readonly userStory: string;
  /**
   * 只有 `undeclared-control` 对照组允许缺省——该档要测的正是「漏传 policy」。
   * 其余档位必须声明策略：源文件立场是「未声明 ≠ host-trusted」，不用可选性
   * 去表达「合法的无策略」。该约束由 `EXECUTION_GEARS` 的不变量测试兜住。
   */
  readonly executionPolicy?: ExecutionPolicy;
  readonly sourceTrust: ExecutionSourceTrust;
  readonly requiresCapabilities: readonly EndpointCapability[];
  readonly hostTrustAuthorized?: boolean;
  /**
   * 本档最具代表性的拒绝码，供测试钉住「拒绝理由有没有漂移」。
   *
   * 它落在哪一层**随档位而变**，消费方不要写「顶层 == 该码」这类通用断言：
   *   - `undeclared-control`：顶层 `selection.refusalCode`（此刻 `rejected` 为空）
   *   - `repo-work`：端点级 `selection.rejected[].refusalCode`，顶层是聚合码
   *     `no-isolated-endpoint-available`
   *   - `third-party-skill` / `local-project`：顶层与端点级同码
   */
  readonly expectedRejectionCode?: ExecutionPolicyRefusalCode;
};

export const UNDECLARED_CONTROL_GEAR: ExecutionGearDefinition = {
  id: "undeclared-control",
  userStory: "漏传策略的对照组：调用方没声明策略时不得被猜成允许在用户机器上执行",
  sourceTrust: "unknown",
  requiresCapabilities: ["shell"],
  expectedRejectionCode: "execution-policy-undeclared",
};

export const PLAIN_CHAT_GEAR: ExecutionGearDefinition = {
  id: "plain-chat",
  userStory: "纯问答/零能力任务：显式声明不需要任何端点能力，不因未声明而被拦截",
  executionPolicy: "isolated-strictly",
  // 这档不申请任何端点能力，来源不参与判定；取最保守值（网页访客），
  // 不写 "owner"——那会让人误读成「纯问答=可信来源」。
  sourceTrust: "untrusted",
  // 显式 [] 表示「确实不需要任何端点能力」，与 undefined（未声明）语义不同。
  requiresCapabilities: [],
};

export const RUN_SCRIPT_GEAR: ExecutionGearDefinition = {
  id: "run-script",
  userStory: "跑一段脚本：必须落在隔离边界内，没有隔离后端时拒绝执行而不是退回用户机器",
  executionPolicy: "isolated-strictly",
  sourceTrust: "untrusted",
  requiresCapabilities: ["shell"],
};

export const REPO_WORK_GEAR: ExecutionGearDefinition = {
  id: "repo-work",
  userStory: "改仓库代码并跑校验：shell 进了边界但文件工具还在边界外，这类任务当前不可承接",
  executionPolicy: "isolated-strictly",
  sourceTrust: "untrusted",
  requiresCapabilities: ["shell", "filesystem"],
  expectedRejectionCode: "capability-not-isolated",
};

export const LOCAL_PROJECT_GEAR: ExecutionGearDefinition = {
  id: "local-project",
  userStory: "在自己机器上改项目并提交：需要 owner 本人显式授权，授权缺失即拒绝",
  executionPolicy: "host-trusted",
  sourceTrust: "owner",
  requiresCapabilities: ["shell", "filesystem"],
  expectedRejectionCode: "host-trusted-unauthorized",
};

export const THIRD_PARTY_SKILL_GEAR: ExecutionGearDefinition = {
  id: "third-party-skill",
  userStory: "第三方不可信技能索要在用户机器上执行：自带授权标记也不算授权",
  executionPolicy: "host-trusted",
  sourceTrust: "untrusted",
  requiresCapabilities: ["shell"],
  hostTrustAuthorized: true,
  expectedRejectionCode: "untrusted-requires-isolation",
};

export const EXECUTION_GEARS: readonly ExecutionGearDefinition[] = [
  UNDECLARED_CONTROL_GEAR,
  PLAIN_CHAT_GEAR,
  RUN_SCRIPT_GEAR,
  REPO_WORK_GEAR,
  LOCAL_PROJECT_GEAR,
  THIRD_PARTY_SKILL_GEAR,
] as const;

export const EXECUTION_GEAR_MAP: Readonly<Record<ExecutionGearId, ExecutionGearDefinition>> =
  Object.fromEntries(EXECUTION_GEARS.map((gear) => [gear.id, gear])) as Record<
    ExecutionGearId,
    ExecutionGearDefinition
  >;
