// render/web/ui/Kbd.tsx
//
// Renders a keyboard shortcut. A chord splits into one <kbd> per key, with a
// small "+" between caps.
//
//   <Kbd shortcut="mod+b" />          // "mod" = ⌘ on mac, Ctrl elsewhere
//   <Kbd>Esc</Kbd>                    // single literal key
//   <Kbd>⌘ + B</Kbd>                  // pre-formatted chord, auto-split
//
// ⌘ / ⌫ render as lucide icons (system fonts drop those glyphs in <kbd> on
// most Mac setups); Enter / Esc / letters stay as plain text.
import React from "react";
import * as stylex from "@stylexjs/stylex";
import {
  LuCommand,
  LuCornerDownLeft,
  LuDelete,
  LuOption,
} from "react-icons/lu";
import { formatShortcut } from "app/settings/shortcutUtils";

import { kbdStyles } from "./kbd.styles";

const ICON_SIZE = 11;

const iconProps = stylex.props(kbdStyles.icon);

const KEY_ICONS: Record<string, React.ReactNode> = {
  "\u2318": <LuCommand size={ICON_SIZE} aria-hidden="true" {...iconProps} />,
  "\u232B": <LuDelete size={ICON_SIZE} aria-hidden="true" {...iconProps} />,
  "\u2325": <LuOption size={ICON_SIZE} aria-hidden="true" {...iconProps} />,
  Enter: (
    <LuCornerDownLeft size={ICON_SIZE} aria-hidden="true" {...iconProps} />
  ),
};

const renderKey = (part: string): React.ReactNode =>
  KEY_ICONS[part] ?? part;

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  /** Platform-neutral chord, e.g. "mod+b", "meta+backspace", "ctrl+shift+delete". */
  shortcut?: string;
  /** Literal key label, or a pre-formatted chord containing " + ". */
  children?: React.ReactNode;
}

const Kbd: React.FC<KbdProps> = ({ shortcut, children, className, ...rest }) => {
  const label = shortcut ? formatShortcut(shortcut) : children;
  const capClass = [stylex.props(kbdStyles.kbd).className, className]
    .filter(Boolean)
    .join(" ");
  const parts = typeof label === "string" && label.includes(" + ")
    ? label.split(" + ")
    : null;

  if (parts) {
    return (
      <span {...stylex.props(kbdStyles.sequence)} {...rest}>
        {parts.map((part, i) => (
          <React.Fragment key={part}>
            {i > 0 && (
              <span {...stylex.props(kbdStyles.sequenceSep)}>+</span>
            )}
            <kbd className={capClass}>{renderKey(part)}</kbd>
          </React.Fragment>
        ))}
      </span>
    );
  }

  return (
    <kbd className={capClass} {...rest}>
      {typeof label === "string" ? renderKey(label) : label}
    </kbd>
  );
};

export default Kbd;
