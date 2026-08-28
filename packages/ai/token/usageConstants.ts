// Usage 域共享常量。
// 历史教训：模型筛选哨兵「全部模型」此前在 useRecords / UsageRecord / tokenThunks
// 各硬编码一份，一旦与真实模型名撞名即失效（计划 0.3 记录）。统一从本文件导出。

/** 模型筛选下拉的「全部」哨兵值（前端本地语义，不发给服务端）。 */
export const ALL_MODELS = "全部模型";

/**
 * 未登录本地账号的 userId 哨兵值。CLI 子进程 / 本地未登录场景以 userId="local"
 * 表示「用户自带订阅」，不计费。统一从本文件导出，避免各调用方硬编码：
 * resolveBillable（prepareTokenUsageData）与 runBilling 前置短路共用同一真值，
 * 判定前都应 trim 后再比较（本地账号不可能含前后空格）。
 */
export const LOCAL_USER_ID = "local";
