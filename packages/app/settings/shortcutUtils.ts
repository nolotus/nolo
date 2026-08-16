export interface ParsedShortcut {
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
  key: string;
}

/**
 * Checks if the current platform is macOS.
 */
export const getIsMac = (): boolean => {
  return (
    typeof window !== "undefined" &&
    /Mac|iPod|iPhone|iPad/.test(window.navigator.platform)
  );
};

/**
 * Parses a shortcut string into a structured ParsedShortcut object.
 * Format: "ctrl+shift+delete", "meta+backspace", etc. "mod" maps to "meta" on Mac and "ctrl" on others.
 */
export const parseShortcut = (shortcutStr: string): ParsedShortcut => {
  const parts = shortcutStr.toLowerCase().split("+");
  const parsed: ParsedShortcut = {
    ctrl: false,
    meta: false,
    alt: false,
    shift: false,
    key: "",
  };

  const isMac = getIsMac();

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed === "ctrl" || trimmed === "control") {
      parsed.ctrl = true;
    } else if (trimmed === "meta" || trimmed === "command" || trimmed === "cmd" || trimmed === "⌘") {
      parsed.meta = true;
    } else if (trimmed === "alt" || trimmed === "option" || trimmed === "opt") {
      parsed.alt = true;
    } else if (trimmed === "shift") {
      parsed.shift = true;
    } else if (trimmed === "mod") {
      if (isMac) {
        parsed.meta = true;
      } else {
        parsed.ctrl = true;
      }
    } else {
      parsed.key = trimmed;
    }
  }

  return parsed;
};

/**
 * Matches a React or DOM KeyboardEvent against a shortcut string.
 */
export const matchShortcut = (event: KeyboardEvent | React.KeyboardEvent, shortcutStr: string): boolean => {
  if (!shortcutStr) return false;

  const parsed = parseShortcut(shortcutStr);

  // Modifiers must match exactly
  if (event.ctrlKey !== parsed.ctrl) return false;
  if (event.metaKey !== parsed.meta) return false;
  if (event.altKey !== parsed.alt) return false;
  if (event.shiftKey !== parsed.shift) return false;

  const eventKey = event.key.toLowerCase();

  // Alias checks for keys
  if (parsed.key === "backspace" && eventKey === "backspace") return true;
  if (parsed.key === "delete" && eventKey === "delete") return true;
  if (parsed.key === "del" && eventKey === "delete") return true;
  if (parsed.key === "enter" && eventKey === "enter") return true;
  if (parsed.key === "esc" && eventKey === "escape") return true;
  if (parsed.key === "escape" && eventKey === "escape") return true;

  return eventKey === parsed.key;
};

/**
 * Formats a shortcut string into a user-friendly display string (e.g. "⌘ + ⌫" or "Ctrl + Backspace").
 */
export const formatShortcut = (shortcutStr: string, isMac?: boolean): string => {
  if (!shortcutStr) return "";

  const resolvedIsMac = isMac ?? getIsMac();
  const parsed = parseShortcut(shortcutStr);
  const parts: string[] = [];

  if (parsed.ctrl) parts.push("Ctrl");
  if (parsed.alt) parts.push(resolvedIsMac ? "Option" : "Alt");
  if (parsed.shift) parts.push("Shift");
  if (parsed.meta) parts.push(resolvedIsMac ? "⌘" : "Win");

  if (parsed.key) {
    let keyDisplay = parsed.key;
    if (keyDisplay === "backspace") {
      keyDisplay = resolvedIsMac ? "⌫" : "Backspace";
    } else if (keyDisplay === "delete") {
      keyDisplay = "Delete";
    } else if (keyDisplay === "enter") {
      keyDisplay = "Enter";
    } else if (keyDisplay === "escape" || keyDisplay === "esc") {
      keyDisplay = "Esc";
    } else {
      // Capitalize single letters or short key names
      keyDisplay = keyDisplay.charAt(0).toUpperCase() + keyDisplay.slice(1);
    }
    parts.push(keyDisplay);
  }

  return parts.join(" + ");
};
