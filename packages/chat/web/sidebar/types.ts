import type { SpaceContent } from "app/types";

export interface ChatSidebarCategoryItem {
  id: string;
  name: string;
  order?: number;
}

export interface ChatSidebarGroupedData {
  uncategorized: SpaceContent[];
  categorized: Record<string, SpaceContent[]>;
  /**
   * 子对话（parentDialogId 非空）按 parentDialogId 分组。
   * key = parentDialogId，value = 该父对话下的子对话列表。
   * 侧边栏用这个把子对话折叠到父对话下。
   * 注意：parentDialogId 是 dialog id（不含 dialog-user- 前缀），
   * 而父对话的 contentKey 是完整 dbKey（dialog-user-xxx-id），
   * 消费时需要用 extractCustomId(contentKey) 提取 id 来匹配。
   */
  childrenByParent?: Record<string, SpaceContent[]>;
}
