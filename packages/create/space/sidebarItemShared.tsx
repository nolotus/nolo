// sidebarItemShared.tsx
// Shared primitives for SidebarItem (NavLink row) and SidebarItemRow (virtualized
// row): icon size, the content-type icon map, and the context-menu portal.
// Extracted to remove verbatim duplication between the two components.
//
// `SidebarItemContextMenuPortal` is the same in-house floating portal used by
// the non-virtualized SidebarItem on main.
//
// View Transition names for card icon/title live in `app/viewTransitions`
// (`card-icon-*` / `card-title-*`). Space content cards and agent list/detail
// own those names. Sidebar rows intentionally do NOT set view-transition-name:
// when a detail page is open the active sidebar row stays mounted, and dual
// names for the same contentKey would 串场 / break the shared-element pair.

import React, { useEffect } from "react";
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
} from "@floating-ui/react";
import {
  LuMessageSquare,
  LuFileText,
  LuImage,
  LuBook,
  LuFileCode,
  LuFile,
  LuBot,
  LuLayoutGrid,
  LuCalendarClock,
  LuGrid2X2,
} from "react-icons/lu";

export const ICON_SIZE = 16 as const;

export const ITEM_ICONS = {
  dialog: LuMessageSquare,
  page: LuFileText,
  image: LuImage,
  doc: LuBook,
  code: LuFileCode,
  file: LuFile,
  table: LuGrid2X2,
  agent: LuBot,
  app: LuLayoutGrid,
  task: LuCalendarClock,
} as const;

export type ItemType = keyof typeof ITEM_ICONS;

type PendingAttachmentType =
  | "dialog"
  | "page"
  | "table"
  | "agent"
  | "image"
  | "file"
  | "app";

const SIDEBAR_PENDING_TYPE_BY_ITEM_TYPE: Partial<Record<ItemType, PendingAttachmentType>> = {
  dialog: "dialog",
  page: "page",
  table: "table",
  agent: "agent",
  image: "image",
  file: "file",
  app: "app",
};

export const resolvePendingAttachmentType = (
  type: ItemType,
  fileCategory?: string | null
): PendingAttachmentType => {
  if (type === "file" && fileCategory === "image") return "image";
  return SIDEBAR_PENDING_TYPE_BY_ITEM_TYPE[type] ?? "page";
};

export type SidebarItemContextMenuPortalProps = {
  open: boolean;
  referenceElement: HTMLElement | null;
  onClose: () => void;
  children: React.ReactNode;
};

export function SidebarItemContextMenuPortal({
  open,
  referenceElement,
  onClose,
  children,
}: SidebarItemContextMenuPortalProps) {
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: (nextOpen) => {
      if (!nextOpen) onClose();
    },
    placement: "right-start",
    strategy: "fixed",
    middleware: [
      offset(4),
      flip(),
      shift({ padding: 8, rootBoundary: "viewport" }),
    ],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    refs.setReference(referenceElement);
  }, [referenceElement, refs]);

  const dismiss = useDismiss(context);
  const { getFloatingProps } = useInteractions([dismiss]);

  if (!open || !referenceElement) {
    return null;
  }

  return (
    <FloatingPortal>
      <div
        ref={refs.setFloating}
        style={{ ...floatingStyles, zIndex: 1000 }}
        {...getFloatingProps()}
      >
        {children}
      </div>
    </FloatingPortal>
  );
}
