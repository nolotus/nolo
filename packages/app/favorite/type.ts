export type FavoriteTargetType = "agent" | "content" | "page" | "doc" | "file";

export interface ToggleFavoriteParams {
  targetType: FavoriteTargetType;
  /**
   * 当前阶段约定为完整 dbKey（例如 "agent-xxx" / "page-xxx" / "meta-xxx" / "image-xxx"）。
   * TODO: 如果以后要支持按逻辑 AgentId 收藏，可以新增一个字段：
   *       - targetId?: string (逻辑ID)
   *       或者再拆出一个单独的 RPC。
   */
  targetKey: string;
}

/**
 * 收藏关系记录里附带的「显示摘要」。
 *
 * 为什么需要它：侧边栏「我的收藏」分区会显示**最近窗口之外**的收藏项，这些 key
 * 往往从未被读过，本地没有实体记录，标题无从解析，只能显示类型标签
 * （"AI" / "对话" / "文档"…）。收藏写入时把显示摘要存进**正向关系记录**
 * （fav-agent-key-{userId}-{agentKey} / fav-page-key-{userId}-{targetKey}），
 * 读取时随 items 一起带出来，窗口外条目就能显示真名——全程仍然是零请求。
 *
 * 三态必须区分（否则会引发「反复补读」的死循环）：
 *  - `undefined`：**没有采到**（本特性上线前写的老记录没有这个字段；或采集时
 *    无权读取 / 记录不存在 / 采集出错）→ 允许后续修复
 *  - `""`：采集到了，但内容本来就没有标题/头像 → **终态，不要再试**
 *  - 非空字符串：采集到的显示名
 */
export interface FavoriteDisplaySummary {
  /** 内容的显示名（agent 用 name，其它类型按各自规则）；"" = 采集过但没有可用标题。 */
  displayTitle?: string;
  /** 头像文件 id；null = 采集过但没有头像。 */
  displayAvatarFileId?: string | null;
  /** 采集时间（毫秒时间戳）。 */
  displayCapturedAt?: number;
}

export interface ToggleFavoriteResult extends FavoriteDisplaySummary {
  targetType: FavoriteTargetType;
  targetKey: string;
  isFavorite: boolean;
  /** 当前该对象被多少人收藏（按 stats 计算） */
  favoriteCount: number;
}

export interface SetFavoriteParams extends ToggleFavoriteParams {
  isFavorite: boolean;
  favoritedAt?: number;
}

export type SetFavoriteResult = ToggleFavoriteResult;

export interface ListFavoritesParams {
  targetType: FavoriteTargetType | FavoriteTargetType[];
}

/** 列表项：老服务端只带 id + favoritedAt，摘要字段可选。 */
export interface FavoriteListItem extends FavoriteDisplaySummary {
  id: string;
  favoritedAt: number;
}

export interface ListFavoritesResult {
  targetType: FavoriteTargetType;
  /** 当前用户收藏的该类型对象的 key 列表 */
  ids: string[];
  /** 收藏时间（毫秒时间戳）+ 可选的显示摘要 */
  items?: FavoriteListItem[];
}
