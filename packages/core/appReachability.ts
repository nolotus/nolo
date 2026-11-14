/**
 * 应用「谁能打开」的唯一判定（产品真值：`docs/product-app-visibility.md` §2 A 轴）。
 *
 * 以前这条规则散在两处、而且两处说的不一样：
 * - 沙箱门（`appSandboxHandler`）只拦「有 spaceId 且 private」→ 没有空间归属的
 *   private 应用，匿名也能打开（和「private＝只有我」相反）；
 * - 前端文案自己猜（`visibility === "public" ? ... : spaceId ? ... : ...`）。
 *
 * 现在判定只在这里：`/api/app/get` 下发的 `reachability`、沙箱门、分享面板的
 * 权限说明全部读它，避免第三次说反（review HIGH-3）。
 */

/** A 轴：谁能打开这个应用。 */
export type AppReachability = "owner" | "space" | "link" | "public";

export interface AppReachabilityRecord {
  visibility?: string | null;
  spaceId?: string | null;
}

/**
 * 映射（旧 `visibility` 字段 → A 轴，迁移期的桥接）：
 * - `public` → `public`（所有人，含匿名）
 * - `unlisted` → `link`（持链接可看，不列出）
 * - `private` + spaceId → `space`（空间成员只读）
 * - `private` 无 spaceId（或未知值）→ `owner`（只有作者本人）
 */
export const resolveAppReachability = (
  record: AppReachabilityRecord | null | undefined
): AppReachability => {
  const visibility = typeof record?.visibility === "string" ? record.visibility : "private";
  const spaceId = typeof record?.spaceId === "string" ? record.spaceId.trim() : "";
  if (visibility === "public") return "public";
  if (visibility === "unlisted") return "link";
  return spaceId ? "space" : "owner";
};
