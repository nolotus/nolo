/**
 * CLI 兼容层：credential 级 429 冷却读写的实现已下沉到
 * `agent-runtime/credentialAvailability`，供 CLI / desktop-runtime / agent-runtime
 * 共用同一套文件读写逻辑（各宿主各写一份必然语义漂移，CLI 与 server 曾因此把
 * 同一个 quota 缺陷只修在一侧）。
 *
 * 本文件只 re-export，既有调用点（agentListCommands、cooldownCommands、
 * client/agentRun、client/localRuntimeAdapter、server 准入、测试）无需改动。
 * 需要改冷却读写行为时，改 agent-runtime 侧的实现。
 */
export * from "agent-runtime/credentialAvailability";
