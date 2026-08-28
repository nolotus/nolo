// Usage 域共享常量。
// 历史教训：模型筛选哨兵「全部模型」此前在 useRecords / UsageRecord / tokenThunks
// 各硬编码一份，一旦与真实模型名撞名即失效（计划 0.3 记录）。统一从本文件导出。

/** 模型筛选下拉的「全部」哨兵值（前端本地语义，不发给服务端）。 */
export const ALL_MODELS = "全部模型";
