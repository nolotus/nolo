import {
  LuBot,
  LuUser
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

// packages/render/web/ui/Avatar.tsx
var import_react2 = __toESM(require_react(), 1);

// packages/app/hooks/useImageLoadFallback.ts
var import_react = __toESM(require_react());
function useImageLoadFallback(src) {
  const [hasImageError, setHasImageError] = (0, import_react.useState)(false);
  (0, import_react.useEffect)(() => {
    setHasImageError(false);
  }, [src]);
  const handleImageError = (0, import_react.useCallback)(() => {
    setHasImageError(true);
  }, []);
  return {
    hasImageError,
    shouldRenderImage: Boolean(src) && !hasImageError,
    handleImageError
  };
}

// packages/render/web/ui/Avatar.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var Avatar = ({
  name = "",
  type = "auto",
  size = "medium",
  shape = "rounded",
  src,
  className = "",
  onClick,
  style = {},
  ...props
}) => {
  const { shouldRenderImage, handleImageError } = useImageLoadFallback(src);
  const avatarType = (0, import_react2.useMemo)(() => {
    if (type === "auto") {
      return name === "robot" ? "agent" : "user";
    }
    return type;
  }, [type, name]);
  const getIconSize = () => {
    switch (size) {
      case "small":
        return 16;
      case "large":
        return 24;
      case "xlarge":
        return 32;
      case "xxlarge":
        return 48;
      case "medium":
      default:
        return 20;
    }
  };
  const handleKeyDown = (0, import_react2.useCallback)(
    (event) => {
      if (!onClick) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onClick(event);
      }
    },
    [onClick]
  );
  const renderContent = () => {
    if (shouldRenderImage) {
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "img",
        {
          src,
          alt: name,
          className: "avatar-image",
          onError: handleImageError
        }
      );
    }
    const iconSize = getIconSize();
    switch (avatarType) {
      case "agent":
        return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuBot, { size: iconSize, "aria-hidden": "true" });
      case "user":
      default: {
        const initial = name ? name.trim().charAt(0).toUpperCase() : "";
        return initial ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "avatar-text", children: initial }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuUser, { size: iconSize, "aria-hidden": "true" });
      }
    }
  };
  const accessibleName = name.trim() || (avatarType === "agent" ? "Agent" : "User");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "div",
    {
      className: `avatar avatar--${size} avatar--${avatarType} avatar--shape-${shape} ${onClick ? "avatar--clickable" : ""} ${className}`,
      onClick,
      onKeyDown: onClick ? handleKeyDown : void 0,
      role: onClick ? "button" : void 0,
      tabIndex: onClick ? 0 : void 0,
      "aria-label": onClick ? accessibleName : void 0,
      style,
      ...props,
      children: renderContent()
    }
  );
};
var Avatar_default = Avatar;

export {
  useImageLoadFallback,
  Avatar_default
};
