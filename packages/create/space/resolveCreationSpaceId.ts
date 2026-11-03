/**
 * 创建内容（页面 / 表格）时的 space 落点解析。
 *
 * 关键语义（PR #209 复审 HIGH-3）：
 * - `customSpaceId === undefined`：调用方没有指定 space，沿用既有行为，
 *   回退到当前选中的 space。
 * - `customSpaceId === ""`：调用方明确要求「无 space」。
 *   必须与 undefined 区分开，否则会把内容落进当前选中的 space
 *   （项目没有 space 时的典型误落点）。
 */
export function resolveCreationSpaceId(
  customSpaceId: string | undefined | null,
  currentSpaceId: string | null,
): string | null {
  return (customSpaceId ?? currentSpaceId) || null;
}
