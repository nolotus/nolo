import React, { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { toErrorMessage } from "core/errorMessage";

const HOST_SOURCE = "nolo-artifact-host";
const RUNTIME_SOURCE = "nolo-artifact-runtime";
const ARTIFACT_READY = "nolo-artifact-ready";
const ARTIFACT_HEIGHT = "nolo-artifact-height";
const ARTIFACT_ERROR = "nolo-artifact-error";
const ReactECharts = React.lazy(async () => {
  const mod = await import("echarts-for-react");
  return { default: mod.default };
});

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

const iconCache = new Map<string, IconComponent>();
const iconLoaders = new Map<string, Promise<IconComponent>>();

function FallbackIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
    </svg>
  );
}

function preloadArtifactIcons(names: string[]) {
  const missing = Array.from(new Set(names)).filter(
    (name) => /^Lu[A-Z][A-Za-z0-9]*$/.test(name) && !iconCache.has(name)
  );
  if (missing.length === 0) return Promise.resolve();

  const url = `/artifact-icons?names=${encodeURIComponent(missing.sort().join(","))}`;
  const loader = import(/* @vite-ignore */ url)
    .then((mod) => {
      for (const name of missing) {
        iconCache.set(name, mod[name] || FallbackIcon);
      }
    })
    .catch(() => {
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

function createDeferredIcon(name: string): IconComponent {
  const DeferredIcon = (props: React.SVGProps<SVGSVGElement>) => {
    const [Icon, setIcon] = useState<IconComponent>(() => iconCache.get(name) || FallbackIcon);

    useEffect(() => {
      if (iconCache.has(name)) {
        setIcon(() => iconCache.get(name) || FallbackIcon);
        return;
      }
      let mounted = true;
      const loader =
        iconLoaders.get(name) ||
        preloadArtifactIcons([name]).then(() => iconCache.get(name) || FallbackIcon);
      loader.then((loadedIcon) => {
        if (mounted) setIcon(() => loadedIcon || FallbackIcon);
      });
      return () => {
        mounted = false;
      };
    }, []);

    return <Icon {...props} />;
  };
  DeferredIcon.displayName = name;
  return DeferredIcon;
}

const Icons = new Proxy({ LuSparkles: FallbackIcon } as Record<string, IconComponent>, {
  get(target, prop) {
    if (typeof prop === "string" && prop.startsWith("Lu")) {
      if (!target[prop]) target[prop] = createDeferredIcon(prop);
      return target[prop];
    }
    return target[prop as string];
  },
});

function postToHost(payload: Record<string, unknown>) {
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
    ),
  });
}

function markArtifactReady() {
  postToHost({ type: ARTIFACT_READY });
  sendHeight();
  requestAnimationFrame(sendHeight);
}

let currentArtifactData: unknown;
const artifactDataListeners = new Set<() => void>();

function setCurrentArtifactData(value: unknown) {
  currentArtifactData = value;
  for (const listener of artifactDataListeners) listener();
}

function useArtifactData() {
  return useSyncExternalStore(
    (listener) => {
      artifactDataListeners.add(listener);
      return () => artifactDataListeners.delete(listener);
    },
    () => currentArtifactData,
    () => undefined
  );
}

function ArtifactRuntimePage() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => sendHeight());
    resizeObserver.observe(document.documentElement);
    resizeObserver.observe(document.body);

    const handleError = (message: string) => {
      setFailed(message || "runtime error");
      postToHost({ type: ARTIFACT_ERROR, message });
      sendHeight();
    };

    const onError = (event: ErrorEvent) => {
      handleError(event.message || "runtime error");
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      handleError(String(event.reason || "runtime error"));
    };
    let runtimeLoadedSent = false;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.source !== HOST_SOURCE) return;
      if (event.data?.type === "data") {
        setCurrentArtifactData(event.data.data);
        return;
      }
      if (event.data?.type === "ping") {
        // 宿主晚于 iframe 挂上监听（SSR hydrate 前）时会 ping，补发握手。
        postToHost({ type: "nolo-artifact-runtime-loaded" });
        return;
      }
      if (event.data?.type !== "render") return;
      if (typeof event.data?.code !== "string") return;
      if (Object.prototype.hasOwnProperty.call(event.data, "data")) {
        setCurrentArtifactData(event.data.data);
      }

      try {
        setFailed(null);
        const runtimeScope = {
          React,
          ReactECharts,
          useArtifactData,
          emitArtifactEvent: (eventType: string, payload: unknown) => {
            const message = { source: RUNTIME_SOURCE, type: "nolo-artifact-event", eventType, payload };
            try {
              if (new Blob([JSON.stringify(message)]).size <= 1_000_000) {
                window.parent.postMessage(message, "*");
              }
            } catch {}
          },
          Icons,
          ...Icons,
          __noloArtifactPreloadIcons: preloadArtifactIcons,
          useState: React.useState,
          useEffect: React.useEffect,
          useMemo: React.useMemo,
          useCallback: React.useCallback,
          useRef: React.useRef,
          useReducer: React.useReducer,
          useContext: React.useContext,
        };
        Object.assign(window, runtimeScope);
        // eslint-disable-next-line react-doctor/no-eval
        const run = new Function(`${event.data.code}\nreturn Example;`);
        const Example = run();
        if (typeof Example !== "function") {
          throw new Error("Example component not found");
        }
        setComponent(() => Example as React.ComponentType);
      } catch (error) {
        handleError(toErrorMessage(error));
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    window.addEventListener("message", onMessage);
    if (!runtimeLoadedSent) {
      runtimeLoadedSent = true;
      postToHost({ type: "nolo-artifact-runtime-loaded" });
    }
    sendHeight();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("message", onMessage);
    };
  }, []);

  useLayoutEffect(() => {
    if (!Component || !rootRef.current) return;
    markArtifactReady();
  }, [Component]);

  return (
    <main className="ArtifactRuntimePage">
      <div
        ref={rootRef}
        data-nolo-artifact-root
      >
        {failed ? (
          <div className="nolo-artifact-error" data-nolo-artifact-error-message={failed}>内容渲染失败</div>
        ) : Component ? (
          <React.Suspense fallback={<div className="nolo-artifact-loading">图表加载中…</div>}>
            <Component />
          </React.Suspense>
        ) : null}
      </div>
      <style>{`
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
      `}</style>
    </main>
  );
}

export default ArtifactRuntimePage;
