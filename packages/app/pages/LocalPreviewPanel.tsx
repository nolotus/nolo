import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import {
  LuEraser,
  LuMousePointerClick,
  LuPen,
  LuRefreshCw,
  LuX,
} from "react-icons/lu";

import Button from "render/web/ui/Button";
import { useAppSelector } from "app/store";
import {
  clearSelectedNode,
  setInspecting,
  setSelectedNode,
  useAppInspecting,
  useAppSelectedNode,
  useLocalPreviewUrl,
} from "app/appInspector/appInspectorStore";
import { useCurrentSpaceFromEntity } from "create/space/spaceCurrentSelectors";

const MESSAGE_SOURCE = "nolo-inspector";

/**
 * 绑定了本地文件夹的 Space，可以在这里预览该目录下的网页并标注元素。
 * 有 vite 走 vite（带 HMR），否则走内置静态服务器（带 mtime 轮询刷新）。
 * 选中的元素写进全局 appInspectorStore，随下一条对话消息带给 agent。
 *
 * 既作为空间的「预览」页，也作为对话页右侧栏的面板使用，所以这里不假设自己占满整屏。
 */
export default function LocalPreviewPanel() {
  const space = useCurrentSpaceFromEntity();
  const boundFolder = space?.boundFolder;
  const spaceId = space?.id;

  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const storePreviewUrl = useLocalPreviewUrl();
  const previewUrl = storePreviewUrl ?? localPreviewUrl;
  const setPreviewUrl = setLocalPreviewUrl;
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [drawing, setDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const inspecting = useAppInspecting();
  const selectedNode = useAppSelectedNode();

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const context = canvas.getContext("2d");
    if (!context) return;
    const image = canvas.width && canvas.height ? canvas.toDataURL() : null;
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (image) {
      const restored = new Image();
      restored.onload = () => context.drawImage(restored, 0, 0, rect.width, rect.height);
      restored.src = image;
    }
  }, []);

  useEffect(() => {
    if (!drawing) return;
    resizeCanvas();
    const observer = new ResizeObserver(resizeCanvas);
    if (canvasRef.current) observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, [drawing, resizeCanvas]);

  const clearDrawing = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const draw = useCallback((event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !drawingRef.current) return;
    const rect = canvas.getBoundingClientRect();
    context.lineTo(event.clientX - rect.left, event.clientY - rect.top);
    context.stroke();
  }, []);

  const stopDrawing = useCallback(() => {
    drawingRef.current = false;
  }, []);

  const startDrawing = useCallback((event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    canvas.setPointerCapture(event.pointerId);
    const rect = canvas.getBoundingClientRect();
    context.beginPath();
    context.moveTo(event.clientX - rect.left, event.clientY - rect.top);
    context.lineWidth = 3;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#ef4444";
    drawingRef.current = true;
  }, []);

  const start = useCallback(async () => {
    if (!boundFolder || !spaceId) return;
    setStarting(true);
    setError(null);
    try {
      const response = await fetch("/api/local-preview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previewId: spaceId, root: boundFolder }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "启动预览失败");
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

  useEffect(() => {
    // If agent opened a preview via store (openPreview tool), don't auto-start
    // the panel's own static-server — the iframe is already pointing elsewhere.
    if (storePreviewUrl) return;
    void start();
  }, [start, storePreviewUrl]);

  // 页面卸载时不停服务：用户通常会在预览和对话之间来回切，反复冷启动 vite 更难用。
  // 进程退出由 localPreviewRoutes 的 exit 钩子兜底。

  // 预览服务器活在宿主进程的内存里，宿主一重启（dev 模式每次热重载都重启）
  // 它就没了。iframe 会停在最后一帧，看着一切正常，实际上标注和刷新都失效。
  // 所以定期问宿主它是否还在服务，不在就重开并换上新地址。
  // store URL 模式（agent/点击打开的外部地址）不归这套自管服务管，跳过轮询，
  // 否则会误启静态服务、甚至用错误横幅顶掉正在显示的 iframe。
  useEffect(() => {
    if (storePreviewUrl || !previewUrl || !spaceId) return;
    let cancelled = false;

    const timer = setInterval(async () => {
      try {
        const response = await fetch("/api/local-preview/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ previewId: spaceId }),
        });
        const payload = (await response.json()) as { running?: boolean };
        if (cancelled || payload.running) return;
        await start();
        if (!cancelled) setNonce((prev) => prev + 1);
      } catch {
        /* 宿主自己也可能正在重启，下一轮再试 */
      }
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [previewUrl, spaceId, start, storePreviewUrl]);

  const previewOrigin = useMemo(
    () => (previewUrl ? new URL(previewUrl).origin : null),
    [previewUrl]
  );

  const postToPreview = useCallback(
    (message: Record<string, unknown>) => {
      if (!previewOrigin) return;
      iframeRef.current?.contentWindow?.postMessage(
        { source: MESSAGE_SOURCE, ...message },
        previewOrigin
      );
    },
    [previewOrigin]
  );

  useEffect(() => {
    if (!previewOrigin) return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== previewOrigin) return;
      const data = event.data;
      if (!data || data.source !== MESSAGE_SOURCE) return;
      if (data.type === "ready") {
        // HMR 刷新后脚本会重新加载，把当前标注状态补回去。
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

  useEffect(() => {
    postToPreview({ type: "set-inspecting", value: inspecting });
  }, [inspecting, postToPreview]);

  useEffect(() => () => setInspecting(false), []);

  // 无绑定文件夹的 space 也能预览：agent 或点击打开的 store URL 不依赖
  // boundFolder，只有面板自启动的本地静态服务才需要它。
  if (!boundFolder && !storePreviewUrl) {
    return (
      <div style={{ padding: 24 }}>
        当前空间没有绑定本地文件夹，无法预览。可以在空间设置里绑定一个目录。
      </div>
    );
  }

  return (
    <div className="LocalPreview">
      <div className="LocalPreview__toolbar">
        <Button
          size="small"
          variant={drawing ? "primary" : "secondary"}
          icon={<LuPen size={14} />}
          onClick={() => {
            setDrawing((value) => !value);
            setInspecting(false);
          }}
          disabled={!previewUrl}
          title="在预览上自由绘制"
        >
          {drawing ? "退出画笔" : "画笔"}
        </Button>
        {drawing ? (
          <Button
            size="small"
            variant="ghost"
            icon={<LuEraser size={14} />}
            onClick={clearDrawing}
            title="清空笔迹"
          >
            清空
          </Button>
        ) : null}
        <Button
          size="small"
          variant={inspecting ? "primary" : "secondary"}
          icon={<LuMousePointerClick size={14} />}
          onClick={() => {
            setInspecting(!inspecting);
            setDrawing(false);
          }}
          disabled={!previewUrl}
        >
          {inspecting ? "退出标注" : "标注"}
        </Button>
        <Button
          size="small"
          variant="ghost"
          icon={<LuRefreshCw size={14} />}
          onClick={() => setNonce((prev) => prev + 1)}
          disabled={!previewUrl}
          title="刷新预览"
        >
          刷新
        </Button>

        <span
          className="LocalPreview__path"
          title={storePreviewUrl ?? boundFolder}
        >
          {storePreviewUrl ?? boundFolder}
        </span>

        {selectedNode ? (
          <span className="LocalPreview__selected">
            <code>&lt;{selectedNode.tagName}&gt;</code>
            {selectedNode.noloLoc ? (
              <span className="LocalPreview__loc">{selectedNode.noloLoc}</span>
            ) : null}
            <Button
              size="small"
              variant="ghost"
              icon={<LuX size={14} />}
              onClick={() => clearSelectedNode()}
              title="取消选中"
            />
          </span>
        ) : null}
      </div>

      <div className="LocalPreview__body">
        {error ? (
          <div className="LocalPreview__message">
            <div className="LocalPreview__error">{error}</div>
            <Button size="small" variant="secondary" onClick={() => void start()}>
              重试
            </Button>
          </div>
        ) : previewUrl ? (
          <div className="LocalPreview__canvasArea">
            <iframe
              key={`${previewUrl}#${nonce}`}
              ref={iframeRef}
              src={previewUrl}
              title="本地预览"
              className="LocalPreview__frame"
            />
            <canvas
              ref={canvasRef}
              className="LocalPreview__brushCanvas"
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerCancel={stopDrawing}
              aria-label="预览画布"
              style={{ pointerEvents: drawing ? "auto" : "none", visibility: drawing ? "visible" : "hidden" }}
            />
          </div>
        ) : (
          <div className="LocalPreview__message">
            {starting ? "正在启动本地预览…" : "预览未启动"}
          </div>
        )}
      </div>

      <style>{`
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

        .LocalPreview__canvasArea {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 0;
        }

        .LocalPreview__frame {
          width: 100%;
          height: 100%;
          border: none;
          display: block;
        }

        .LocalPreview__brushCanvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
          touch-action: none;
          cursor: crosshair;
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
      `}</style>
    </div>
  );
}
