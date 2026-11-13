// sidebarTypeIcons.tsx
// Single source of truth for the sidebar *type identity* icons.
//
// The type switch (packages/chat/web/sidebar/SidebarTypeFilter.tsx) and the
// sidebar item rows (packages/create/space/sidebarItemShared.tsx) must show
// the same icon for the same type, so the mapping lives here instead of being
// duplicated per call site.
//
// This module stays free of business dependencies (no `create/` / `chat/`
// imports) so both sides can depend on it without a cycle.

import React from "react";
import type { IconType } from "react-icons";
import {
  PiChatCircle,
  PiChatCircleFill,
  PiFileText,
  PiFileTextFill,
  PiTable,
  PiTableFill,
  PiPaperclip,
  PiPaperclipFill,
  PiAppWindow,
  PiAppWindowFill,
} from "react-icons/pi";
import NoloHeadMark from "./NoloHeadMark";

export type SidebarTypeIconId =
  | "agent"
  | "dialog"
  | "page"
  | "table"
  | "attachment"
  | "app";

export type SidebarTypeIconSpec = {
  /** Outline icon; `null` means the type uses its own mark (Nolo head mark). */
  Icon: IconType | null;
  /** Filled icon for the selected state; `null` when the type has no fill variant. */
  ActiveIcon: IconType | null;
};

/** Type identity as shown in the type switch. */
export const SIDEBAR_TYPE_ICONS: Record<SidebarTypeIconId, SidebarTypeIconSpec> = {
  agent: { Icon: null, ActiveIcon: null },
  dialog: { Icon: PiChatCircle, ActiveIcon: PiChatCircleFill },
  page: { Icon: PiFileText, ActiveIcon: PiFileTextFill },
  table: { Icon: PiTable, ActiveIcon: PiTableFill },
  attachment: { Icon: PiPaperclip, ActiveIcon: PiPaperclipFill },
  app: { Icon: PiAppWindow, ActiveIcon: PiAppWindowFill },
};

export type NoloHeadMarkIconProps = {
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
} & React.AriaAttributes;

/**
 * The agent type identity: the Nolo head mark instead of a bot glyph.
 * Wrapped in a span so the row styles (color / transition) still apply.
 */
export const NoloHeadMarkIcon = ({
  size = 16,
  className,
  style,
  title,
  ...rest
}: NoloHeadMarkIconProps) => {
  const numericSize = typeof size === "number" ? size : Number.parseInt(size, 10) || 16;
  return (
    <span
      {...rest}
      className={className}
      title={title}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", ...style }}
    >
      <NoloHeadMark size={numericSize} />
    </span>
  );
};

/** Outline variant of every type identity (agent -> Nolo head mark). */
export const SIDEBAR_TYPE_OUTLINE_ICONS: Record<SidebarTypeIconId, IconType> = {
  agent: NoloHeadMarkIcon,
  dialog: PiChatCircle,
  page: PiFileText,
  table: PiTable,
  attachment: PiPaperclip,
  app: PiAppWindow,
};

export type SidebarTypeIconProps = {
  id: SidebarTypeIconId;
  size?: number;
  active?: boolean;
  className?: string;
};

/** Renders the identity icon of one sidebar type. */
export const SidebarTypeIcon: React.FC<SidebarTypeIconProps> = ({
  id,
  size = 16,
  active = false,
  className,
}) => {
  const spec = SIDEBAR_TYPE_ICONS[id];
  if (!spec.Icon) {
    return <NoloHeadMarkIcon size={size} className={className} aria-hidden="true" />;
  }
  const Icon = active && spec.ActiveIcon ? spec.ActiveIcon : spec.Icon;
  return <Icon size={size} className={className} aria-hidden="true" />;
};
