// 文件: core/events/types.ts

export type ULID = string;

/* --------------------------------------------------------------------------
 * 1. 领域事件（DomainEvent）
 * ------------------------------------------------------------------------*/

/**
 * 事件作用的实体类型：
 * - table   ：表（行增删改等）
 * - page    ：页面 / 文档
 * - dialog  ：对话
 * - agent   ：Agent
 * - space   ：空间（Space）
 * - system  ：系统级事件（定时任务、后台任务等）
 */
export type EventEntityType =
    | "table"
    | "page"
    | "dialog"
    | "agent"
    | "space"
    | "system";

/**
 * 事件上下文：可选的元信息，便于追踪谁触发了事件、从哪里来的
 */
export interface DomainEventContext {
    userId?: string;
    agentKey?: string;      // 触发事件的 Agent key（dbKey 或逻辑 ID）
    requestId?: string;     // 本次请求的追踪 ID
    [key: string]: any;
}

/**
 * 领域事件：
 * - 描述系统中「某件事」发生的事实
 * - Trigger / Job 都基于事件运作
 */
export interface DomainEvent {
    id: ULID;               // eventId
    tenantId: string;
    entityType: EventEntityType;
    entityKey: string;      // 具体实体的 dbKey，如 meta-dbKey / page-dbKey / dialog-dbKey / "system"

    /** 事件类型，如 "row_created" / "row_updated" / "page_created" / "cron_tick" 等 */
    eventType: string;

    occurredAt: string;     // ISO 时间戳

    /** 事件前后的快照（可选），便于触发器判断条件和 Job 路由 */
    before?: any;
    after?: any;

    /** 额外上下文（触发人/触发 Agent/RequestId 等） */
    context?: DomainEventContext;
}

/* --------------------------------------------------------------------------
 * 2. 通用 Trigger 定义
 * ------------------------------------------------------------------------*/

/**
 * Trigger 作用域类型：
 * - table   ：某张表（一个 TableMeta）
 * - page    ：某个 Page
 * - dialog  ：某个 Dialog
 * - space   ：某个 Space
 * - global  ：全局范围（不限定具体实体）
 */
export type TriggerScopeType = "table" | "page" | "dialog" | "space" | "global";

/**
 * Trigger 动作类型：
 * - agent   ：调用 Agent 做后处理
 * - webhook ：调用外部 HTTP 接口
 * - custom  ：预留，将来可以挂自定义 Runner
 */
export type TriggerActionType = "agent" | "webhook" | "custom";

/**
 * 通用 Trigger 定义：
 * - Trigger 是“静态规则”：什么事件 + 什么作用域 + 条件 → 触发什么动作
 * - BaseTrigger 不关心具体实体类型，scopeType + scopeKey 描述范围
 */
export interface BaseTrigger {
    id: ULID;
    name: string;
    description?: string;
    enabled: boolean;

    /** 作用域类型 + 范围 */
    scopeType: TriggerScopeType;
    scopeKey: string; // 对应实体 dbKey 或 "global"

    /** 关心的事件类型，如 "row_created" / "page_created" / "cron_tick" 等 */
    eventType: string;

    /** 条件（可选）：例如根据列值/字段值过滤。结构后续可以演进为 DSL。 */
    condition?: any;

    /** 动作定义 */
    actionType: TriggerActionType;
    actionConfig?: any;
}

/* --------------------------------------------------------------------------
 * 3. Job（工作单）
 * ------------------------------------------------------------------------*/

/**
 * Job 状态
 */
export type JobStatus = "pending" | "running" | "succeeded" | "failed";

/**
 * Job：
 * - 由 Trigger + DomainEvent 实例化出的“工作单”
 * - 可以被 Job Runner / Agent Runner 消费执行
 */
export interface Job {
    id: ULID;
    tenantId: string;

    /** 源 Trigger / 触发规则 */
    triggerId: ULID;

    /** 源事件快照 */
    event: DomainEvent;

    /** 执行动作（由 Trigger 决定） */
    actionType: TriggerActionType;
    actionConfig?: any;

    status: JobStatus;
    attempts: number;
    maxAttempts: number;

    createdAt: string;
    updatedAt: string;

    result?: any;
    error?: string;
}