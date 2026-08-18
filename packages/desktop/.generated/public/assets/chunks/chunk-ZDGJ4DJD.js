import {
  BaseModal
} from "/public/assets/chunks/chunk-XTMQULJ5.js";
import {
  useAppDispatch
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  shareResourceAction
} from "/public/assets/chunks/chunk-V2ALUAJU.js";
import {
  toast,
  toggleContentFavorite,
  useIsContentFavorited
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  LuShare2,
  LuStar
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

// packages/render/web/ui/modal/ImagePreviewModal.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var ImagePreviewModal = ({
  imageUrl,
  onClose,
  alt = "\u9884\u89C8\u56FE\u7247",
  contentKey,
  onShareSuccess
}) => {
  const [isLoaded, setIsLoaded] = (0, import_react.useState)(false);
  const [hasError, setHasError] = (0, import_react.useState)(false);
  const dispatch = useAppDispatch();
  const isFavorited = useIsContentFavorited(contentKey ?? "");
  const [isSharing, setIsSharing] = (0, import_react.useState)(false);
  (0, import_react.useEffect)(() => {
    if (imageUrl) {
      setIsLoaded(false);
      setHasError(false);
    }
  }, [imageUrl]);
  const handleFavorite = async (e) => {
    e.stopPropagation();
    if (!contentKey) return;
    try {
      await dispatch(toggleContentFavorite(contentKey)).unwrap();
      toast.success(isFavorited ? "\u5DF2\u53D6\u6D88\u6536\u85CF" : "\u5DF2\u6536\u85CF");
    } catch (err) {
      toast.error("\u64CD\u4F5C\u5931\u8D25");
    }
  };
  const handleShare = async (e) => {
    e.stopPropagation();
    if (!contentKey || isSharing) return;
    setIsSharing(true);
    try {
      const shareData = {
        id: contentKey,
        type: "image" /* IMAGE */,
        url: imageUrl,
        // Might be blob url (useless for remote) or http url
        // Ideally we need the fileId to reconstruct the URL on the other side
        fileId: contentKey.replace("image-", "").replace("file-", "").split("-").pop()
      };
      const result = await dispatch(shareResourceAction({
        type: "image" /* IMAGE */,
        data: shareData,
        title: alt || "\u5206\u4EAB\u56FE\u7247",
        description: "From Image Preview",
        visibility: "community"
        // Default to community for now based on user request? Or let user choose?
        // User said "separate share", implied simple action. Let's default to community or add a selector later.
        // For quick implementation, we can do community or private. 
        // Let's assume private first or prompt? 
        // User story: "单独分享" -> "优先展示图片"
        // Let's stick to the existing share flow which usually returns a token.
      })).unwrap();
      const shareUrl = `${window.location.origin}/share/${result.token}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("\u5206\u4EAB\u94FE\u63A5\u5DF2\u590D\u5236");
      if (onShareSuccess) onShareSuccess(result.token);
    } catch (err) {
      console.error(err);
      toast.error("\u5206\u4EAB\u5931\u8D25");
    } finally {
      setIsSharing(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    BaseModal,
    {
      isOpen: !!imageUrl,
      onClose,
      className: "image-preview-modal",
      children: imageUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "preview-container", children: [
        !isLoaded && !hasError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "loading-spinner", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { viewBox: "0 0 24 24", fill: "none", className: "spinner-icon", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "circle",
            {
              cx: "12",
              cy: "12",
              r: "10",
              stroke: "currentColor",
              strokeWidth: "4",
              className: "opacity-25"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "path",
            {
              fill: "currentColor",
              d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z",
              className: "opacity-75"
            }
          )
        ] }) }),
        hasError && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "preview-error", role: "status", "aria-live": "polite", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "preview-error__title", children: "\u56FE\u7247\u52A0\u8F7D\u5931\u8D25" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "preview-error__hint", children: "\u8FD9\u5F20\u56FE\u7247\u5F53\u524D\u4E0D\u53EF\u7528\uFF0C\u53EF\u80FD\u662F\u6587\u4EF6\u8D44\u6E90\u7F3A\u5931\u6216\u65E0\u6743\u9650\u8BBF\u95EE\u3002" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "img",
          {
            src: imageUrl,
            alt,
            className: `preview-image ${isLoaded ? "loaded" : "loading"}${hasError ? " failed" : ""}`,
            onLoad: () => {
              setIsLoaded(true);
              setHasError(false);
            },
            onError: () => {
              setIsLoaded(false);
              setHasError(true);
            }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "actions-bar", children: [
          contentKey && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                className: `action-button ${isFavorited ? "active" : ""}`,
                onClick: handleFavorite,
                title: isFavorited ? "\u53D6\u6D88\u6536\u85CF" : "\u6536\u85CF",
                "aria-label": isFavorited ? "\u53D6\u6D88\u6536\u85CF" : "\u6536\u85CF",
                children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuStar, { size: 20, fill: isFavorited ? "currentColor" : "none", "aria-hidden": "true" })
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                className: "action-button",
                onClick: handleShare,
                disabled: isSharing,
                title: "\u5206\u4EAB\u56FE\u7247",
                "aria-label": "\u5206\u4EAB\u56FE\u7247",
                children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuShare2, { size: 20, "aria-hidden": "true" })
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              className: "close-button",
              onClick: onClose,
              "aria-label": "\u5173\u95ED\u9884\u89C8",
              children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                "svg",
                {
                  width: "24",
                  height: "24",
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: "2",
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                  "aria-hidden": "true",
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", { x1: "6", y1: "6", x2: "18", y2: "18" })
                  ]
                }
              )
            }
          )
        ] })
      ] })
    }
  ) });
};
var ImagePreviewModal_default = ImagePreviewModal;

export {
  ImagePreviewModal_default
};
