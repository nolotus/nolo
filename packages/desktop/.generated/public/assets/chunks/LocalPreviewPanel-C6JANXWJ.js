import {
  clearSelectedNode,
  setInspecting,
  setSelectedNode,
  useAppInspecting,
  useAppSelectedNode
} from "/public/assets/chunks/chunk-F6NU5WEW.js";
import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  selectCurrentSpace
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuMousePointerClick,
  LuRefreshCw,
  LuX
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import "/public/assets/chunks/chunk-UWXJIOEO.js";
import "/public/assets/chunks/chunk-TBNFSVJC.js";
import "/public/assets/chunks/chunk-SM3EH4JD.js";
import "/public/assets/chunks/chunk-JOOBQBMM.js";
import "/public/assets/chunks/chunk-7OO56Y7L.js";
import "/public/assets/chunks/chunk-NKT4VBPJ.js";
import "/public/assets/chunks/chunk-LPS7IE46.js";
import "/public/assets/chunks/chunk-RUG5F6GD.js";
import "/public/assets/chunks/chunk-XJRNNKKF.js";
import "/public/assets/chunks/chunk-IRTDRTXE.js";
import "/public/assets/chunks/chunk-XDKHKMJ3.js";
import "/public/assets/chunks/chunk-VCXOIOLL.js";
import "/public/assets/chunks/chunk-AHAP23JL.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import "/public/assets/chunks/chunk-3EHRYDZ6.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/pages/LocalPreviewPanel.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var MESSAGE_SOURCE = "nolo-inspector";
function LocalPreviewPanel() {
  const space = useAppSelector(selectCurrentSpace);
  const boundFolder = space?.boundFolder;
  const spaceId = space?.id;
  const [previewUrl, setPreviewUrl] = (0, import_react.useState)(null);
  const [error, setError] = (0, import_react.useState)(null);
  const [starting, setStarting] = (0, import_react.useState)(false);
  const [nonce, setNonce] = (0, import_react.useState)(0);
  const iframeRef = (0, import_react.useRef)(null);
  const inspecting = useAppInspecting();
  const selectedNode = useAppSelectedNode();
  const start = (0, import_react.useCallback)(async () => {
    if (!boundFolder || !spaceId) return;
    setStarting(true);
    setError(null);
    try {
      const response = await fetch("/api/local-preview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previewId: spaceId, root: boundFolder })
      });
      const payload = await response.json();
      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "\u542F\u52A8\u9884\u89C8\u5931\u8D25");
      }
      setPreviewUrl(payload.url);
    } catch (startError) {
      setError(
        startError instanceof Error ? startError.message : String(startError)
      );
    } finally {
      setStarting(false);
    }
  }, [boundFolder, spaceId]);
  (0, import_react.useEffect)(() => {
    void start();
  }, [start]);
  (0, import_react.useEffect)(() => {
    if (!previewUrl || !spaceId) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const response = await fetch("/api/local-preview/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ previewId: spaceId })
        });
        const payload = await response.json();
        if (cancelled || payload.running) return;
        await start();
        if (!cancelled) setNonce((prev) => prev + 1);
      } catch {
      }
    }, 5e3);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [previewUrl, spaceId, start]);
  const previewOrigin = (0, import_react.useMemo)(
    () => previewUrl ? new URL(previewUrl).origin : null,
    [previewUrl]
  );
  const postToPreview = (0, import_react.useCallback)(
    (message) => {
      if (!previewOrigin) return;
      iframeRef.current?.contentWindow?.postMessage(
        { source: MESSAGE_SOURCE, ...message },
        previewOrigin
      );
    },
    [previewOrigin]
  );
  (0, import_react.useEffect)(() => {
    if (!previewOrigin) return;
    const onMessage = (event) => {
      if (event.origin !== previewOrigin) return;
      const data = event.data;
      if (!data || data.source !== MESSAGE_SOURCE) return;
      if (data.type === "ready") {
        postToPreview({ type: "set-inspecting", value: inspecting });
        return;
      }
      if (data.type === "selected" && data.node && spaceId) {
        setSelectedNode({ appKey: spaceId, node: data.node });
        setInspecting(false);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [inspecting, postToPreview, previewOrigin, spaceId]);
  (0, import_react.useEffect)(() => {
    postToPreview({ type: "set-inspecting", value: inspecting });
  }, [inspecting, postToPreview]);
  (0, import_react.useEffect)(() => () => setInspecting(false), []);
  if (!boundFolder) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { padding: 24 }, children: "\u5F53\u524D\u7A7A\u95F4\u6CA1\u6709\u7ED1\u5B9A\u672C\u5730\u6587\u4EF6\u5939\uFF0C\u65E0\u6CD5\u9884\u89C8\u3002\u53EF\u4EE5\u5728\u7A7A\u95F4\u8BBE\u7F6E\u91CC\u7ED1\u5B9A\u4E00\u4E2A\u76EE\u5F55\u3002" });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "LocalPreview", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "LocalPreview__toolbar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        Button_default,
        {
          size: "small",
          variant: inspecting ? "primary" : "secondary",
          icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuMousePointerClick, { size: 14 }),
          onClick: () => setInspecting(!inspecting),
          disabled: !previewUrl,
          children: inspecting ? "\u9000\u51FA\u6807\u6CE8" : "\u6807\u6CE8"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        Button_default,
        {
          size: "small",
          variant: "ghost",
          icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuRefreshCw, { size: 14 }),
          onClick: () => setNonce((prev) => prev + 1),
          disabled: !previewUrl,
          title: "\u5237\u65B0\u9884\u89C8",
          children: "\u5237\u65B0"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "LocalPreview__path", title: boundFolder, children: boundFolder }),
      selectedNode ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "LocalPreview__selected", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("code", { children: [
          "<",
          selectedNode.tagName,
          ">"
        ] }),
        selectedNode.noloLoc ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "LocalPreview__loc", children: selectedNode.noloLoc }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          Button_default,
          {
            size: "small",
            variant: "ghost",
            icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuX, { size: 14 }),
            onClick: () => clearSelectedNode(),
            title: "\u53D6\u6D88\u9009\u4E2D"
          }
        )
      ] }) : null
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "LocalPreview__body", children: error ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "LocalPreview__message", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "LocalPreview__error", children: error }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button_default, { size: "small", variant: "secondary", onClick: () => void start(), children: "\u91CD\u8BD5" })
    ] }) : previewUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "iframe",
      {
        ref: iframeRef,
        src: previewUrl,
        title: "\u672C\u5730\u9884\u89C8",
        className: "LocalPreview__frame"
      },
      `${previewUrl}#${nonce}`
    ) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "LocalPreview__message", children: starting ? "\u6B63\u5728\u542F\u52A8\u672C\u5730\u9884\u89C8\u2026" : "\u9884\u89C8\u672A\u542F\u52A8" }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: `
        .LocalPreview {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
        }

        .LocalPreview__toolbar {
          display: flex;
          align-items: center;
          gap: var(--space-2, 8px);
          padding: var(--space-2, 8px) var(--space-3, 12px);
          border-bottom: 1px solid var(--border);
          background: var(--background);
        }

        .LocalPreview__path {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          direction: rtl;
          text-align: left;
          font-size: var(--fontSize-sm, 12px);
          color: var(--textTertiary);
        }

        .LocalPreview__selected {
          display: inline-flex;
          align-items: center;
          gap: var(--space-1, 4px);
          padding: 2px 2px 2px 8px;
          border-radius: var(--radius-sm, 6px);
          background: var(--primaryGhost, var(--backgroundSecondary));
          font-size: var(--fontSize-sm, 12px);
          white-space: nowrap;
        }

        .LocalPreview__selected code {
          font-family: var(--fontFamily-mono, monospace);
          color: var(--primary);
        }

        .LocalPreview__loc {
          color: var(--textTertiary);
          max-width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .LocalPreview__body {
          flex: 1;
          min-height: 0;
          background: var(--backgroundSecondary);
        }

        .LocalPreview__frame {
          width: 100%;
          height: 100%;
          border: none;
          display: block;
        }

        .LocalPreview__message {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--space-3, 12px);
          height: 100%;
          padding: var(--space-6, 24px);
          color: var(--textSecondary);
          font-size: var(--fontSize-sm, 13px);
          text-align: center;
        }

        .LocalPreview__error {
          color: var(--error);
        }
      ` })
  ] });
}
export {
  LocalPreviewPanel as default
};
