// 文件: render/table/rowOrderUtils.ts
//
// 手动行序（manualOrder）插入的纯函数工具，供 TablePage「行插入」功能
// 复用 handleRowDrop 的写路径（writeTablePrefs + setManualOrder）：
// - order 为 null 时先用当前可见行 dbKey 顺序物化整个数组，
//   保证视觉位置 = 持久位置；
// - newKey 已存在时先移除再插入，保证幂等、不产生重复 key。

export type RowOrderAnchor =
  | { type: "after"; key: string }
  | { type: "top" }
  | { type: "bottom" };

/**
 * 把 newKey 按 anchor 插入行序数组：
 * - after：插到 anchor.key 之后；锚点不在数组里（被过滤/已删除）时兜底追加末尾，
 *   与 applyManualOrder 对未知 key 的处理一致；
 * - top / bottom：分别插到最前 / 末尾。
 */
export const insertKeyIntoOrder = (
  order: string[] | null,
  visibleKeys: string[],
  newKey: string,
  anchor: RowOrderAnchor
): string[] => {
  const base = (order ?? visibleKeys).filter((key) => key !== newKey);

  if (anchor.type === "top") {
    return [newKey, ...base];
  }
  if (anchor.type === "bottom") {
    return [...base, newKey];
  }

  const anchorIndex = base.indexOf(anchor.key);
  if (anchorIndex < 0) {
    return [...base, newKey];
  }
  return [
    ...base.slice(0, anchorIndex + 1),
    newKey,
    ...base.slice(anchorIndex + 1),
  ];
};

/**
 * 「在上方插入一行」的锚点换算：目标行上方 = 当前可见序中前一行之后；
 * 目标是第一行时退化为 top。
 * targetKey 不在可见序（理论上不会出现，右键菜单只能从可见行打开）时
 * 兜底 bottom——与 insertKeyIntoOrder 对未知锚点「追加末尾」的语义一致。
 */
export const anchorForInsertAbove = (
  visibleKeys: string[],
  targetKey: string
): RowOrderAnchor => {
  const index = visibleKeys.indexOf(targetKey);
  if (index < 0) {
    return { type: "bottom" };
  }
  if (index === 0) {
    return { type: "top" };
  }
  return { type: "after", key: visibleKeys[index - 1] };
};
