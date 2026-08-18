import {
  require_client
} from "/public/assets/chunks/chunk-4N3VLX7A.js";
import "/public/assets/chunks/chunk-AHAP23JL.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  toErrorMessage
} from "/public/assets/chunks/chunk-3EHRYDZ6.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/web/artifactRuntime.tsx
var import_client = __toESM(require_client(), 1);

// packages/render/web/elements/ArtifactRuntimePage.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var HOST_SOURCE = "nolo-artifact-host";
var RUNTIME_SOURCE = "nolo-artifact-runtime";
var ARTIFACT_READY = "nolo-artifact-ready";
var ARTIFACT_HEIGHT = "nolo-artifact-height";
var ARTIFACT_ERROR = "nolo-artifact-error";
var ReactECharts = import_react.default.lazy(async () => {
  const mod = await import("/public/assets/chunks/esm-IMCWHUEJ.js");
  return { default: mod.default };
});
var iconCache = /* @__PURE__ */ new Map();
var iconLoaders = /* @__PURE__ */ new Map();
function FallbackIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      ...props,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" })
      ]
    }
  );
}
function preloadArtifactIcons(names) {
  const missing = Array.from(new Set(names)).filter(
    (name) => /^Lu[A-Z][A-Za-z0-9]*$/.test(name) && !iconCache.has(name)
  );
  if (missing.length === 0) return Promise.resolve();
  const url = `/artifact-icons?names=${encodeURIComponent(missing.sort().join(","))}`;
  const loader = import(
    /* @vite-ignore */
    url
  ).then((mod) => {
    for (const name of missing) {
      iconCache.set(name, mod[name] || FallbackIcon);
    }
  }).catch(() => {
    for (const name of missing) {
      iconCache.set(name, FallbackIcon);
    }
  });
  for (const name of missing) {
    iconLoaders.set(
      name,
      loader.then(() => iconCache.get(name) || FallbackIcon)
    );
  }
  return loader;
}
function createDeferredIcon(name) {
  const DeferredIcon = (props) => {
    const [Icon, setIcon] = (0, import_react.useState)(() => iconCache.get(name) || FallbackIcon);
    (0, import_react.useEffect)(() => {
      if (iconCache.has(name)) {
        setIcon(() => iconCache.get(name) || FallbackIcon);
        return;
      }
      let mounted = true;
      const loader = iconLoaders.get(name) || preloadArtifactIcons([name]).then(() => iconCache.get(name) || FallbackIcon);
      loader.then((loadedIcon) => {
        if (mounted) setIcon(() => loadedIcon || FallbackIcon);
      });
      return () => {
        mounted = false;
      };
    }, []);
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { ...props });
  };
  DeferredIcon.displayName = name;
  return DeferredIcon;
}
var Icons = new Proxy({ LuSparkles: FallbackIcon }, {
  get(target, prop) {
    if (typeof prop === "string" && prop.startsWith("Lu")) {
      if (!target[prop]) target[prop] = createDeferredIcon(prop);
      return target[prop];
    }
    return target[prop];
  }
});
function postToHost(payload) {
  window.parent.postMessage({ source: RUNTIME_SOURCE, ...payload }, "*");
}
function sendHeight() {
  const body = document.body;
  const doc = document.documentElement;
  postToHost({
    type: ARTIFACT_HEIGHT,
    height: Math.max(
      body.scrollHeight,
      body.offsetHeight,
      doc.clientHeight,
      doc.scrollHeight,
      doc.offsetHeight,
      180
    )
  });
}
function markArtifactReady() {
  postToHost({ type: ARTIFACT_READY });
  sendHeight();
  requestAnimationFrame(sendHeight);
}
function ArtifactRuntimePage() {
  const rootRef = (0, import_react.useRef)(null);
  const [Component, setComponent] = (0, import_react.useState)(null);
  const [failed, setFailed] = (0, import_react.useState)(false);
  (0, import_react.useEffect)(() => {
    const resizeObserver = new ResizeObserver(() => sendHeight());
    resizeObserver.observe(document.documentElement);
    resizeObserver.observe(document.body);
    const handleError = (message) => {
      setFailed(true);
      postToHost({ type: ARTIFACT_ERROR, message });
      sendHeight();
    };
    const onError = (event) => {
      handleError(event.message || "runtime error");
    };
    const onUnhandledRejection = (event) => {
      handleError(String(event.reason || "runtime error"));
    };
    const onMessage = (event) => {
      if (event.data?.source !== HOST_SOURCE) return;
      if (event.data?.type !== "render") return;
      if (typeof event.data?.code !== "string") return;
      try {
        setFailed(false);
        const runtimeScope = {
          React: import_react.default,
          ReactECharts,
          Icons,
          ...Icons,
          __noloArtifactPreloadIcons: preloadArtifactIcons,
          useState: import_react.default.useState,
          useEffect: import_react.default.useEffect,
          useMemo: import_react.default.useMemo,
          useCallback: import_react.default.useCallback,
          useRef: import_react.default.useRef,
          useReducer: import_react.default.useReducer,
          useContext: import_react.default.useContext
        };
        Object.assign(window, runtimeScope);
        const run = new Function(`${event.data.code}
return Example;`);
        const Example = run();
        if (typeof Example !== "function") {
          throw new Error("Example component not found");
        }
        setComponent(() => Example);
      } catch (error) {
        handleError(toErrorMessage(error));
      }
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    window.addEventListener("message", onMessage);
    postToHost({ type: "nolo-artifact-runtime-loaded" });
    sendHeight();
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("message", onMessage);
    };
  }, []);
  (0, import_react.useLayoutEffect)(() => {
    if (!Component || !rootRef.current) return;
    markArtifactReady();
  }, [Component]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", { className: "ArtifactRuntimePage", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "div",
      {
        ref: rootRef,
        "data-nolo-artifact-root": true,
        children: failed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nolo-artifact-error", children: "\u9875\u9762\u6B63\u5728\u751F\u6210\uFF0C\u8BF7\u7A0D\u5019\u91CD\u8BD5\u3002" }) : Component ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.default.Suspense, { fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nolo-artifact-loading", children: "\u56FE\u8868\u52A0\u8F7D\u4E2D\u2026" }), children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Component, {}) }) : null
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: `
        :root {
          color-scheme: light dark;
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: transparent;
          color: #111827;
        }
        * { box-sizing: border-box; }
        html, body, #root {
          margin: 0;
          min-height: 100%;
          background: transparent;
        }
        body {
          overflow: auto;
          overscroll-behavior: contain;
        }
        button, input, select, textarea {
          font: inherit;
        }
        a {
          color: inherit;
        }
        .ArtifactRuntimePage {
          min-height: 100%;
          background: transparent;
        }
        .nolo-artifact-error {
          min-height: 180px;
          display: grid;
          place-items: center;
          padding: 24px;
          color: #64748b;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
        }
        .nolo-artifact-loading {
          min-height: 180px;
          display: grid;
          place-items: center;
          padding: 24px;
          color: #64748b;
        }
      ` })
  ] });
}
var ArtifactRuntimePage_default = ArtifactRuntimePage;

// packages/web/artifactRuntime.tsx
var import_jsx_runtime2 = __toESM(require_jsx_runtime(), 1);
var root = document.getElementById("root");
if (root) {
  (0, import_client.createRoot)(root).render(/* @__PURE__ */ (0, import_jsx_runtime2.jsx)(ArtifactRuntimePage_default, {}));
}
