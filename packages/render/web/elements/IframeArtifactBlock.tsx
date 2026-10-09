import React, {
  useCallback,
  useEffect,
  useInsertionEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { transform } from "sucrase";
import { toErrorMessage } from "core/errorMessage";
import {
  acceptArtifactMessage,
  ARTIFACT_MAX_MESSAGE_BYTES,
  sanitizeArtifactCode,
  type ArtifactPreviewBuildResult,
} from "./artifactPreviewCode";
import {
  preloadArtifactRuntimeResources,
  resolveArtifactRuntimeScriptUrl,
} from "./artifactRuntimePreload";

interface IframeArtifactBlockProps {
  rawCode: string;
  className?: string;
  fullscreen?: boolean;
  data?: unknown;
  onArtifactEvent?: (event: { type: string; payload: unknown }) => void;
  allowedEvents?: Record<string, (payload: unknown) => boolean>;
}

const ARTIFACT_READY = "nolo-artifact-ready";
const ARTIFACT_HEIGHT = "nolo-artifact-height";
const ARTIFACT_ERROR = "nolo-artifact-error";
const ARTIFACT_RUNTIME_LOADED = "nolo-artifact-runtime-loaded";
const ARTIFACT_EVENT = "nolo-artifact-event";
const INLINE_INITIAL_HEIGHT = 360;
const INLINE_MIN_HEIGHT = 220;
const INLINE_MAX_HEIGHT = 720;
const FULLSCREEN_INITIAL_HEIGHT = 720;
const MAX_RUNTIME_CODE_CACHE_SIZE = 50;
const runtimeCodeCache = new Map<string, ArtifactPreviewBuildResult>();
function shouldUseSrcDocRuntime() {
  if (typeof window === "undefined") return false;
  return (window as any).__IS_PRODUCTION_BUILD__ === false;
}

function buildRuntimeSrcDoc(scriptUrl: string) {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body><div id="root"></div><script type="module" src="${scriptUrl}"></script></body></html>`;
}

function buildIconFallbackDeclarations(code: string) {
  const iconNames = new Set<string>();
  const jsxIconRe = /\b(Lu[A-Z][A-Za-z0-9]*)\b/g;
  let match: RegExpExecArray | null;
  while ((match = jsxIconRe.exec(code))) {
    iconNames.add(match[1]);
  }
  if (iconNames.size === 0) return "";
  const names = Array.from(iconNames).sort();
  return [
    `__noloArtifactPreloadIcons(${JSON.stringify(names)});`,
    ...names.map((name) => `const ${name} = Icons.${name} || Icons.LuSparkles;`),
  ].join("\n");
}

function buildRunnableArtifactCode(rawCode: string): ArtifactPreviewBuildResult {
  const cached = runtimeCodeCache.get(rawCode);
  if (cached) return cached;

  const processed = sanitizeArtifactCode(rawCode);

  if (!processed.trim()) {
    return { code: null, error: null };
  }

  if (processed.includes("render(")) {
    return {
      code: null,
      error: "请勿手动调用 render()。只需定义 `function Example()`",
    };
  }

  if (!/function\s+Example\s*\(/.test(processed)) {
    return {
      code: null,
      error: "无法自动预览：未检测到顶层组件 `function Example() { ... }`",
    };
  }

  try {
    const code = transform(`${processed}\n`, {
      transforms: ["typescript", "jsx"],
      jsxPragma: "React.createElement",
      jsxFragmentPragma: "React.Fragment",
    }).code;
    const iconFallbacks = buildIconFallbackDeclarations(processed);

    const result = {
      code: iconFallbacks ? `${iconFallbacks}\n${code}` : code,
      error: null,
    };
    runtimeCodeCache.set(rawCode, result);
    if (runtimeCodeCache.size > MAX_RUNTIME_CODE_CACHE_SIZE) {
      const oldestKey = runtimeCodeCache.keys().next().value;
      if (oldestKey) runtimeCodeCache.delete(oldestKey);
    }
    return result;
  } catch (err) {
    return {
      code: null,
      error: toErrorMessage(err),
    };
  }
}

export function buildArtifactRuntimeCode(rawCode: string): ArtifactPreviewBuildResult {
  return buildRunnableArtifactCode(rawCode);
}

function ArtifactPlaceholder() {
  return (
    <div className="iframe-artifact-placeholder" aria-live="polite">
      <div className="iframe-artifact-placeholder__header">
        <span className="iframe-artifact-placeholder__dot" />
        <span>正在搭页面</span>
      </div>
      <div className="iframe-artifact-placeholder__canvas">
        <div className="iframe-artifact-placeholder__line iframe-artifact-placeholder__line--title" />
        <div className="iframe-artifact-placeholder__grid">
          <span />
          <span />
          <span />
        </div>
        <div className="iframe-artifact-placeholder__panel" />
      </div>
    </div>
  );
}

function IframeArtifactBlock({
  rawCode,
  className,
  fullscreen = false,
  data,
  onArtifactEvent,
  allowedEvents,
}: IframeArtifactBlockProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const onArtifactEventRef = useRef(onArtifactEvent);
  const allowedEventsRef = useRef(allowedEvents);
  onArtifactEventRef.current = onArtifactEvent;
  allowedEventsRef.current = allowedEvents;
  const [height, setHeight] = useState(
    fullscreen ? FULLSCREEN_INITIAL_HEIGHT : INLINE_INITIAL_HEIGHT
  );
  const [ready, setReady] = useState(false);
  const buildResult = useMemo(() => buildRunnableArtifactCode(rawCode), [rawCode]);
  useInsertionEffect(preloadArtifactRuntimeResources, []);
  const runtimeSrcDoc = useMemo(
    () =>
      shouldUseSrcDocRuntime()
        ? buildRuntimeSrcDoc(resolveArtifactRuntimeScriptUrl())
        : undefined,
    []
  );
  const runtimeUrl = useMemo(() => {
    if (typeof window === "undefined") return "/artifact-runtime";
    return new URL("/artifact-runtime", window.location.origin).toString();
  }, []);

  const postedRuntimeRef = useRef<Window | null>(null);
  const postRenderCode = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow || !buildResult.code) return;
    postedRuntimeRef.current = iframe.contentWindow;
    iframe.contentWindow.postMessage(
      {
        source: "nolo-artifact-host",
        type: "render",
        code: `${buildResult.code}\n//# sourceURL=nolo-artifact.js`,
        ...(data === undefined ? {} : { data }),
      },
      "*"
    );
  }, [buildResult.code, data]);

  useEffect(() => {
    if (!ready || data === undefined) return;
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(
      { source: "nolo-artifact-host", type: "data", data },
      "*"
    );
  }, [data, ready]);

  useEffect(() => {
    setReady(false);
    setHeight(fullscreen ? FULLSCREEN_INITIAL_HEIGHT : INLINE_INITIAL_HEIGHT);
  }, [buildResult.code, fullscreen]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleMessage = (event: MessageEvent) => {
      const message = event.data as Record<string, unknown> | null;
      const isHandshake = message?.source === "nolo-artifact-runtime"
        && (message.type === ARTIFACT_RUNTIME_LOADED || message.type === ARTIFACT_READY || message.type === ARTIFACT_HEIGHT || message.type === ARTIFACT_ERROR);
      if (isHandshake) {
        if (event.source !== iframe.contentWindow) return;
      } else if (message?.source === "nolo-artifact-runtime" && message.type === "nolo-artifact-event") {
        if (!acceptArtifactMessage(event, {
          iframeWindow: iframe.contentWindow,
          allowedEvents: allowedEventsRef.current,
          maxBytes: ARTIFACT_MAX_MESSAGE_BYTES,
          onEvent: event => onArtifactEventRef.current?.(event),
        })) return;
      } else {
        return;
      }

      if (event.data.type === ARTIFACT_READY) {
        setReady(true);
      }
      if (event.data.type === ARTIFACT_RUNTIME_LOADED) {
        // runtime-loaded 是「监听器已就绪」的唯一可靠信号：iframe onLoad 时
        // React runtime 可能还没挂上 message 监听，那次 render 会丢失，
        // 所以这里必须无条件重发（runtime 只发一次 runtime-loaded）。
        postRenderCode();
      }
      if (event.data.type === ARTIFACT_HEIGHT) {
        const nextHeight = Number(event.data.height);
        if (Number.isFinite(nextHeight)) {
          setHeight(
            Math.max(
              fullscreen ? 560 : INLINE_MIN_HEIGHT,
              Math.min(nextHeight, fullscreen ? FULLSCREEN_INITIAL_HEIGHT : INLINE_MAX_HEIGHT)
            )
          );
        }
      }
      if (event.data.type === ARTIFACT_ERROR) {
        setReady(true);
      }
    };

    window.addEventListener("message", handleMessage);
    // SSR 页面里 iframe 可能在宿主 hydrate 之前就加载完并发出 runtime-loaded，
    // 那条握手会丢失；挂上监听后主动 ping，让 runtime 补发一次握手。
    iframe.contentWindow?.postMessage(
      { source: "nolo-artifact-host", type: "ping" },
      "*"
    );
    return () => window.removeEventListener("message", handleMessage);
  }, [buildResult.code, fullscreen, postRenderCode]);

  if (buildResult.error && !buildResult.code) {
    return (
      <div className={`iframe-artifact-shell ${className || ""}`}>
        <ArtifactPlaceholder />
      </div>
    );
  }

  if (!buildResult.code) return null;

  return (
    <div
      className={`iframe-artifact-shell ${ready ? "iframe-artifact-shell--ready" : ""} ${className || ""}`}
    >
      {!ready && <ArtifactPlaceholder />}
      <iframe
        ref={iframeRef}
        className="iframe-artifact-frame"
        title="AI 生成页面"
        sandbox="allow-scripts"
        src={runtimeSrcDoc ? undefined : runtimeUrl}
        srcDoc={runtimeSrcDoc}
        loading="eager"
        {...({ fetchPriority: "high" } as any)}
        onLoad={postRenderCode}
        style={{ height: fullscreen ? "100%" : height }}
      />
    </div>
  );
}

export default IframeArtifactBlock;
