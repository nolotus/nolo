// packages/agent-runtime/localLoopContract.ts
// Local loop 契约层：observationStream 与 localLoop 之间共享的类型定义。
//
// 存在理由：observationStream（观测出口 boundary）需要 LocalAgentToolEvent 才能
// 描述 tool-event 载荷；若从 localLoop 反向 import 类型，就形成
// localLoop → observationStream → localLoop 的循环依赖。契约类型下沉到本文件后，
// 依赖方向变为单向：localLoop → observationStream → localLoopContract。
//
// 本文件只放跨模块共享的稳定契约类型，不放实现。localLoop 保留兼容 re-export，
// 既有消费方（cursorProvider、index.ts、测试）无需改动。

export type LocalAgentToolEvent = {
  type: "tool-call" | "tool-result" | "tool-error";
  round: number;
  toolCallId: string;
  toolName: string;
  argumentsPreview?: string;
  elapsedMs?: number;
  summary?: string;
  /** Full tool result text for UI expand (model path still uses turn messages). */
  content?: string;
  message?: string;
  metadata?: Record<string, unknown>;
};
