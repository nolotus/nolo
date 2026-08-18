export const CREATE_MENU_OPEN_COUNT_THRESHOLD = 3;

export type CreateMenuItemId =
  | "new-chat"
  | "new-page"
  | "new-table"
  | "create-agent-manual"
  | "scheduled-task"
  | "upload-file";

export const CREATE_MENU_ITEM_ORDER: readonly CreateMenuItemId[] = [
  "new-chat",
  "new-page",
  "new-table",
  "create-agent-manual",
  "scheduled-task",
  "upload-file",
] as const;

export function shouldShowCreateMenuLabel(args: {
  showLabel?: boolean;
  variant: string;
  createMenuOpenCount: number;
}): boolean {
  return Boolean(
    args.showLabel &&
      args.variant === "sidebar" &&
      args.createMenuOpenCount <= CREATE_MENU_OPEN_COUNT_THRESHOLD,
  );
}

export function isUploadMenuItemVisible(hasUploadHandler: boolean): boolean {
  return Boolean(hasUploadHandler);
}

/** Ordered create-menu ids with conditional items (e.g. upload) filtered out. */
export function getVisibleCreateMenuItemIds(args: {
  hasUploadHandler: boolean;
}): CreateMenuItemId[] {
  return CREATE_MENU_ITEM_ORDER.filter((id) => {
    if (id === "upload-file") {
      return isUploadMenuItemVisible(args.hasUploadHandler);
    }
    return true;
  });
}
