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
}

const ARTIFACT_READY = "nolo-artifact-ready";
const ARTIFACT_HEIGHT = "nolo-artifact-height";
const ARTIFACT_ERROR = "nolo-artifact-error";
const ARTIFACT_RUNTIME_LOADED = "nolo-artifact-runtime-loaded";
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
}: IframeArtifactBlockProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
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

  const postRenderCode = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow || !buildResult.code) return;
    iframe.contentWindow.postMessage(
      {
        source: "nolo-artifact-host",
        type: "render",
        code: `${buildResult.code}\n//# sourceURL=nolo-artifact.js`,
      },
      "*"
    );
  }, [buildResult.code]);

  useEffect(() => {
    setReady(false);
    setHeight(fullscreen ? FULLSCREEN_INITIAL_HEIGHT : INLINE_INITIAL_HEIGHT);
  }, [buildResult.code, fullscreen]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;
      if (event.data?.source !== "nolo-artifact-runtime") return;

      if (event.data.type === ARTIFACT_READY) {
        setReady(true);
      }
      if (event.data.type === ARTIFACT_RUNTIME_LOADED) {
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
