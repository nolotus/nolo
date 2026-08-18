import {
  LuCommand,
  LuCornerDownLeft,
  LuDelete,
  LuOption
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/settings/shortcutUtils.ts
var getIsMac = () => {
  return typeof window !== "undefined" && /Mac|iPod|iPhone|iPad/.test(window.navigator.platform);
};
var parseShortcut = (shortcutStr) => {
  const parts = shortcutStr.toLowerCase().split("+");
  const parsed = {
    ctrl: false,
    meta: false,
    alt: false,
    shift: false,
    key: ""
  };
  const isMac = getIsMac();
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed === "ctrl" || trimmed === "control") {
      parsed.ctrl = true;
    } else if (trimmed === "meta" || trimmed === "command" || trimmed === "cmd" || trimmed === "\u2318") {
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
var matchShortcut = (event, shortcutStr) => {
  if (!shortcutStr) return false;
  const parsed = parseShortcut(shortcutStr);
  if (event.ctrlKey !== parsed.ctrl) return false;
  if (event.metaKey !== parsed.meta) return false;
  if (event.altKey !== parsed.alt) return false;
  if (event.shiftKey !== parsed.shift) return false;
  const eventKey = event.key.toLowerCase();
  if (parsed.key === "backspace" && eventKey === "backspace") return true;
  if (parsed.key === "delete" && eventKey === "delete") return true;
  if (parsed.key === "del" && eventKey === "delete") return true;
  if (parsed.key === "enter" && eventKey === "enter") return true;
  if (parsed.key === "esc" && eventKey === "escape") return true;
  if (parsed.key === "escape" && eventKey === "escape") return true;
  return eventKey === parsed.key;
};
var formatShortcut = (shortcutStr, isMac) => {
  if (!shortcutStr) return "";
  const resolvedIsMac = isMac ?? getIsMac();
  const parsed = parseShortcut(shortcutStr);
  const parts = [];
  if (parsed.ctrl) parts.push("Ctrl");
  if (parsed.alt) parts.push(resolvedIsMac ? "Option" : "Alt");
  if (parsed.shift) parts.push("Shift");
  if (parsed.meta) parts.push(resolvedIsMac ? "\u2318" : "Win");
  if (parsed.key) {
    let keyDisplay = parsed.key;
    if (keyDisplay === "backspace") {
      keyDisplay = resolvedIsMac ? "\u232B" : "Backspace";
    } else if (keyDisplay === "delete") {
      keyDisplay = "Delete";
    } else if (keyDisplay === "enter") {
      keyDisplay = "Enter";
    } else if (keyDisplay === "escape" || keyDisplay === "esc") {
      keyDisplay = "Esc";
    } else {
      keyDisplay = keyDisplay.charAt(0).toUpperCase() + keyDisplay.slice(1);
    }
    parts.push(keyDisplay);
  }
  return parts.join(" + ");
};

// packages/render/web/ui/Kbd.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var ICON_SIZE = 11;
var KEY_ICONS = {
  "\u2318": /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCommand, { size: ICON_SIZE, "aria-hidden": "true" }),
  "\u232B": /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuDelete, { size: ICON_SIZE, "aria-hidden": "true" }),
  "\u2325": /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuOption, { size: ICON_SIZE, "aria-hidden": "true" }),
  Enter: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCornerDownLeft, { size: ICON_SIZE, "aria-hidden": "true" })
};
var renderKey = (part) => KEY_ICONS[part] ?? part;
var Kbd = ({ shortcut, children, className, ...rest }) => {
  const label = shortcut ? formatShortcut(shortcut) : children;
  const capClass = ["kbd", className].filter(Boolean).join(" ");
  const parts = typeof label === "string" && label.includes(" + ") ? label.split(" + ") : null;
  if (parts) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "kbd-sequence", ...rest, children: parts.map((part, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react.default.Fragment, { children: [
      i > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "kbd-sequence__sep", children: "+" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("kbd", { className: capClass, children: renderKey(part) })
    ] }, part)) });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("kbd", { className: capClass, ...rest, children: typeof label === "string" ? renderKey(label) : label });
};
var Kbd_default = Kbd;

export {
  matchShortcut,
  formatShortcut,
  Kbd_default
};
