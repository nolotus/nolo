export interface CanDeleteSidebarItemOptions {
  type?: string;
  readOnly?: boolean;
  canDeleteContent?: boolean;
}

/**
 * 侧栏行删除权限门：
 * 1. app 类型不走通用软删除（有独立二次确认弹窗），返回 false；
 * 2. 优先遵循显式 canDeleteContent；
 * 3. 未显式指定时，非只读（!readOnly）才允许删除。
 */
export function canDeleteSidebarItem({
  type,
  readOnly = false,
  canDeleteContent,
}: CanDeleteSidebarItemOptions): boolean {
  if (type === "app") return false;
  return canDeleteContent ?? !readOnly;
}
