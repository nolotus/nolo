import {
  PageLoading_default
} from "/public/assets/chunks/chunk-YCIZFIEN.js";
import {
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  selectRuntimeCurrentServer
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/web/ui/ReadOnlyMarkdownContent.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var MENTION_PATTERN = /@\[(\w+):([^\]|]+)\|([^\]]+)\]/;
var ReadOnlyMarkdownContent = ({
  markdown,
  fallback = null,
  className = ""
}) => {
  const [html, setHtml] = (0, import_react.useState)(null);
  const [isLoading, setIsLoading] = (0, import_react.useState)(false);
  const currentServer = useAppSelector(selectRuntimeCurrentServer);
  const normalizedMarkdown = (0, import_react.useMemo)(() => {
    if (typeof markdown !== "string") return "";
    const trimmed = markdown.trim();
    return trimmed;
  }, [markdown]);
  const canRenderMarkdown = normalizedMarkdown.length > 0 && !MENTION_PATTERN.test(normalizedMarkdown);
  const endpoint = (0, import_react.useMemo)(() => {
    if (!currentServer) return "/api/render-markdown";
    try {
      return new URL("/api/render-markdown", currentServer).toString();
    } catch {
      return "/api/render-markdown";
    }
  }, [currentServer]);
  (0, import_react.useEffect)(() => {
    if (!canRenderMarkdown) {
      setHtml(null);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    void fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ markdown: normalizedMarkdown })
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Render markdown failed: ${response.status}`);
      }
      return response.json();
    }).then((payload) => {
      if (cancelled) return;
      setHtml(typeof payload.html === "string" ? payload.html : null);
    }).catch(() => {
      if (cancelled) return;
      setHtml(null);
    }).finally(() => {
      if (cancelled) return;
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [canRenderMarkdown, endpoint, normalizedMarkdown]);
  if (html) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `ReadOnlyMarkdownContent ${className}`.trim(), children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "article",
      {
        className: "ReadOnlyMarkdownContent__body",
        dangerouslySetInnerHTML: { __html: html }
      }
    ) });
  }
  if (isLoading && canRenderMarkdown) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageLoading_default, { message: "\u6B63\u5728\u6E32\u67D3\u5185\u5BB9...", fullHeight: false });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: fallback });
};
var ReadOnlyMarkdownContent_default = ReadOnlyMarkdownContent;

export {
  ReadOnlyMarkdownContent_default
};
