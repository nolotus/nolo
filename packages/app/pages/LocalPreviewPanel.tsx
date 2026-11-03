import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import {
  LuCheck,
  LuChevronDown,
  LuCode,
  LuCopy,
  LuEllipsis,
  LuEraser,
  LuExternalLink,
  LuEye,
  LuMousePointerClick,
  LuPen,
  LuRefreshCw,
  LuSave,
  LuX,
} from "react-icons/lu";

import Button from "render/web/ui/Button";
import {
  clearSelectedNode,
  getPreviewOpen,
  getPreviewTarget,
  openPreviewTarget,
  setInspecting,
  setSelectedNode,
  useAppInspecting,
  useAppSelectedNode,
  useLocalPreviewOpen,
  useLocalPreviewTarget,
  useLocalPreviewUrl,
} from "app/appInspector/appInspectorStore";
import {
  createHtmlArtifact,
  listHtmlArtifacts,
} from "app/appInspector/htmlArtifactClient";
import type { HtmlArtifact } from "app/appInspector/htmlArtifactClient";
import { useCurrentSpaceFromEntity } from "create/space/useCurrentSpaceFromEntity";
import { useCurrentDialogKey } from "chat/dialog/dialogRuntimeStore";
import { getIsDesktopApp } from "app/utils/env";
import { useLocalPreviewRoot } from "render/layout/TopbarLocalPreviewToggle";

const MESSAGE_SOURCE = "nolo-inspector";

export default function LocalPreviewPanel() {
  const space = useCurrentSpaceFromEntity();
  const spaceId = space?.id;
  const dialogKey = useCurrentDialogKey();
  const root = useLocalPreviewRoot(space?.boundFolder ?? null);
  const previewId = spaceId ?? dialogKey ?? null;

  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const storePreviewUrl = useLocalPreviewUrl();
  const previewTarget = useLocalPreviewTarget();
  const previewOpen = useLocalPreviewOpen();
  const previewUrl = storePreviewUrl ?? localPreviewUrl;
  const setPreviewUrl = setLocalPreviewUrl;
  const isArtifact = previewTarget?.kind === "artifact";
  const isExternalUrl = previewTarget?.kind === "url";

  const [viewMode, setViewMode] = useState<"preview" | "source">("preview");
  const [copied, setCopied] = useState(false);

  // 持久化与状态管理
  const [artifactsList, setArtifactsList] = useState<HtmlArtifact[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"unsaved" | "saved" | "unreleased">("unreleased");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  // 更多操作下拉菜单
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuContainerRef = useRef<HTMLDivElement>(null);

  // 作品切换下拉菜单
  const [artifactPickerOpen, setArtifactPickerOpen] = useState(false);
  const artifactPickerContainerRef = useRef<HTMLDivElement>(null);

  // 监听外点与 Escape 关闭下拉菜单
  useEffect(() => {
    if (!moreMenuOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (
        moreMenuContainerRef.current &&
        !moreMenuContainerRef.current.contains(e.target as Node)
      ) {
        setMoreMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [moreMenuOpen]);

  useEffect(() => {
    if (!artifactPickerOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (
        artifactPickerContainerRef.current &&
        !artifactPickerContainerRef.current.contains(e.target as Node)
      ) {
        setArtifactPickerOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setArtifactPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [artifactPickerOpen]);

  // 竞态保护：记录当次对话 ID
  const activeDialogKeyRef = useRef(dialogKey);
  useEffect(() => {
    activeDialogKeyRef.current = dialogKey;
  }, [dialogKey]);

  // 对话切换时：竞态拉取当前对话的成品列表（纯更新 picker 列表，不在此处重复恢复 target，恢复交给顶层 hook）
  useEffect(() => {
    if (!dialogKey) {
      setArtifactsList([]);
      setListError(null);
      return;
    }
    let cancelled = false;
    listHtmlArtifacts(dialogKey)
      .then((list) => {
        if (!cancelled && activeDialogKeyRef.current === dialogKey) {
          setArtifactsList(list);
          setListError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled && activeDialogKeyRef.current === dialogKey) {
          setListError(err instanceof Error ? err.message : String(err));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dialogKey]);

  // 判别联合收窄 target 字段，保证依赖类型安全且不被绕过 (LOW7)
  const targetArtifactId = previewTarget?.kind === "artifact" ? previewTarget.artifactId : undefined;
  const targetHtml = previewTarget?.kind === "artifact" ? previewTarget.html : null;

  // 同步 target 的保存状态
  useEffect(() => {
    if (previewTarget?.kind === "artifact") {
      if (previewTarget.artifactId) {
        setSaveStatus("saved");
      } else {
        setSaveStatus("unsaved");
      }
    } else {
      setSaveStatus("unreleased");
    }
    setSaveError(null);
  }, [previewTarget?.kind, targetArtifactId, targetHtml]);

  const [artifactHostedUrl, setArtifactHostedUrl] = useState<string | null>(null);
  const [artifactRetry, setArtifactRetry] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 切换制品内容时立即清理旧的 URL，避免旧网页内容冒充新目标
    setArtifactHostedUrl(null);
    if (!targetHtml) {
      return;
    }
    let cancelled = false;
    setError(null);
    void fetch("/api/artifact-html", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html: targetHtml }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`加载制品失败 (${res.status})`);
        return res.json();
      })
      .then((data: { url?: string } | null) => {
        if (!cancelled && data?.url) {
          setArtifactHostedUrl(data.url);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [targetHtml, artifactRetry]);

  const [starting, setStarting] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [drawing, setDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const inspecting = useAppInspecting();
  const selectedNode = useAppSelectedNode();

  // 保存未保存成品为新成品 (LOW1: 删掉不可达的 update 分支及其竞态守卫)
  const handleSaveArtifact = useCallback(async () => {
    if (previewTarget?.kind !== "artifact" || !previewTarget.html) return;
    const currentTarget = previewTarget;
    const currentDialogKey = dialogKey ?? currentTarget.dialogKey;
    if (!currentDialogKey) {
      setSaveError("当前未关联任何对话，无法保存成品");
      setSaveStatus("unsaved");
      return;
    }
    const targetHtmlAtSaveStart = currentTarget.html;
    setSaving(true);
    setSaveError(null);

    try {
      const created = await createHtmlArtifact({
        title: currentTarget.title,
        html: currentTarget.html,
        dialogKey: currentDialogKey,
      });
      // 竞态守卫：确保保存返回时用户仍在此对话、工作台仍开启、且当前目标未被切走
      const latestTarget = getPreviewTarget();
      const isOpen = getPreviewOpen();
      if (
        isOpen &&
        activeDialogKeyRef.current === dialogKey &&
        latestTarget?.kind === "artifact" &&
        !latestTarget.artifactId &&
        latestTarget.html === targetHtmlAtSaveStart
      ) {
        openPreviewTarget({
          kind: "artifact",
          title: created.title,
          html: created.html,
          artifactId: created.id,
          dialogKey: created.dialogKey,
        });
        setSaveStatus("saved");
        setArtifactsList((prev) => [created, ...prev.filter((i) => i.id !== created.id)]);
      }
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : String(err));
      // 契约：失败绝不标保存
      setSaveStatus("unsaved");
    } finally {
      setSaving(false);
    }
  }, [previewTarget, dialogKey]);

  // 复制代码
  const handleCopySource = useCallback(async () => {
    if (!targetHtml) return;
    try {
      await navigator.clipboard.writeText(targetHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 剪贴板不可用时容错
    }
  }, [targetHtml]);

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
    if (!root || !previewId) return;
    setStarting(true);
    setError(null);
    try {
      const response = await fetch("/api/local-preview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previewId, root }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "启动预览失败");
      }
      setPreviewUrl(payload.url);
    } catch (startError) {
      setError(
        startError instanceof Error ? startError.message : "启动本地预览失败"
      );
    } finally {
      setStarting(false);
    }
  }, [previewId, root]);

  useEffect(() => {
    if (!root || !previewId || previewUrl || storePreviewUrl || isArtifact) return;
    void start();
  }, [previewId, previewUrl, root, start, storePreviewUrl, isArtifact]);

  useEffect(() => {
    if (!previewUrl || !previewId || storePreviewUrl || isArtifact) return;

    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const response = await fetch("/api/local-preview/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ previewId }),
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
  }, [previewId, previewUrl, start, storePreviewUrl, isArtifact]);

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
        postToPreview({ type: "set-inspecting", value: inspecting });
        return;
      }
      if (data.type === "selected" && data.node && previewId) {
        setSelectedNode({ appKey: previewId, node: data.node });
        setInspecting(false);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [inspecting, postToPreview, previewOrigin, previewId]);

  useEffect(() => {
    postToPreview({ type: "set-inspecting", value: inspecting });
  }, [inspecting, postToPreview]);

  useEffect(() => () => setInspecting(false), []);

  // 契约：无 root 且是 artifact 时，不得被本地目录空态挡住
  if (!root && !storePreviewUrl && !isArtifact) {
    return (
      <div style={{ padding: 24 }}>
        {getIsDesktopApp() ? (
          <>
            当前对话没有可预览的本地目录。先在侧栏「本地项目」里添加并选择一个文件夹，
            或把这个对话绑定到一个本地项目，预览就会自动打开。
          </>
        ) : (
          <>本地目录来自桌面端绑定的本地项目，网页端没有可预览的本地目录。</>
        )}
      </div>
    );
  }

  return (
    <div className="LocalPreview">
      <div className="LocalPreview__toolbar">
        {/* 预览与源码切换 (方案 4) */}
        {isArtifact ? (
          <div className="LocalPreview__viewToggle">
            <Button
              size="small"
              variant={viewMode === "preview" ? "primary" : "ghost"}
              icon={<LuEye size={14} />}
              onClick={() => setViewMode("preview")}
              title="预览效果"
            >
              预览
            </Button>
            <Button
              size="small"
              variant={viewMode === "source" ? "primary" : "ghost"}
              icon={<LuCode size={14} />}
              onClick={() => setViewMode("source")}
              title="查看 HTML 源码"
            >
              源码
            </Button>
          </div>
        ) : null}

        {/* HTML 工作台专属工具栏 (方案 2-6) */}
        {isArtifact ? (
          <>
            {viewMode === "source" ? (
              <Button
                size="small"
                variant="ghost"
                icon={copied ? <LuCheck size={14} /> : <LuCopy size={14} />}
                onClick={handleCopySource}
                title="复制源码"
              >
                {copied ? "已复制" : "复制代码"}
              </Button>
            ) : (
              <>
                <Button
                  size="small"
                  variant="secondary"
                  icon={<LuMousePointerClick size={14} />}
                  disabled={true}
                  title="HTML预览尚未接入点选标注"
                >
                  标注
                </Button>

                {/* 方案 5: 刷新常驻 */}
                <Button
                  size="small"
                  variant="ghost"
                  icon={<LuRefreshCw size={14} />}
                  onClick={() => setNonce((prev) => prev + 1)}
                  disabled={!previewUrl && !(isArtifact && previewTarget?.html)}
                  title="刷新预览"
                >
                  刷新
                </Button>

                {/* 方案 6: 处于绘画时，退出画笔与清空保持可发现 */}
                {drawing ? (
                  <>
                    <Button
                      size="small"
                      variant="primary"
                      icon={<LuPen size={14} />}
                      onClick={() => setDrawing(false)}
                      title="退出画笔"
                    >
                      退出画笔
                    </Button>
                    <Button
                      size="small"
                      variant="ghost"
                      icon={<LuEraser size={14} />}
                      onClick={clearDrawing}
                      title="清空笔迹"
                    >
                      清空
                    </Button>
                  </>
                ) : null}

                {/* 方案 5、6: 更多操作下拉菜单（含画笔与在新窗口打开） */}
                <div ref={moreMenuContainerRef} className="LocalPreview__moreMenuContainer">
                  <Button
                    size="small"
                    variant="ghost"
                    icon={<LuEllipsis size={14} />}
                    onClick={() => setMoreMenuOpen((v) => !v)}
                    title="更多操作"
                    aria-label="更多操作"
                    aria-haspopup="true"
                    aria-expanded={moreMenuOpen}
                  />
                  {moreMenuOpen ? (
                    <div className="LocalPreview__moreMenuDropdown">
                      {!drawing ? (
                        <button
                          type="button"
                          className="LocalPreview__menuItem"
                          onClick={() => {
                            setDrawing(true);
                            setInspecting(false);
                            setMoreMenuOpen(false);
                          }}
                          disabled={!previewUrl && !(isArtifact && previewTarget?.html)}
                        >
                          <LuPen size={14} className="LocalPreview__menuItemIcon" />
                          <span>画笔</span>
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="LocalPreview__menuItem"
                        onClick={() => {
                          const targetUrl = previewUrl || artifactHostedUrl;
                          if (targetUrl) {
                            window.open(targetUrl, "_blank", "noopener,noreferrer");
                          }
                          setMoreMenuOpen(false);
                        }}
                        disabled={!previewUrl && !artifactHostedUrl}
                      >
                        <LuExternalLink size={14} className="LocalPreview__menuItemIcon" />
                        <span>在新窗口打开</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            )}

            {/* 方案 2: 低调保存状态与未保存才显保存按钮 */}
            <div className="LocalPreview__artifactActions">
              <span
                className={`LocalPreview__statusText LocalPreview__statusBadge LocalPreview__statusBadge--${saveStatus}`}
                title={
                  saveStatus === "saved"
                    ? "成品已保存到个人空间"
                    : saveStatus === "unsaved"
                      ? "成品未保存"
                      : "未发布"
                }
              >
                {saveStatus === "saved" ? "已保存" : saveStatus === "unsaved" ? "未保存" : "未发布"}
              </span>
              {saveStatus === "unsaved" ? (
                <Button
                  size="small"
                  variant="secondary"
                  icon={<LuSave size={14} />}
                  loading={saving}
                  disabled={saving}
                  onClick={handleSaveArtifact}
                  title="保存为新成品"
                >
                  保存
                </Button>
              ) : null}
            </div>

            {/* 方案 3: 标题兼任作品切换，多件才显下拉提示，单件普通标题 */}
            {artifactsList.length > 1 ? (
              <div ref={artifactPickerContainerRef} className="LocalPreview__artifactPicker">
                <button
                  type="button"
                  className="LocalPreview__titleBtn"
                  onClick={() => setArtifactPickerOpen((v) => !v)}
                  title="切换作品"
                  aria-haspopup="true"
                  aria-expanded={artifactPickerOpen}
                >
                  <span className="LocalPreview__titleText">
                    {previewTarget?.title ?? "单文件 HTML 制品"}
                  </span>
                  <LuChevronDown size={14} className="LocalPreview__chevron" />
                </button>
                {artifactPickerOpen ? (
                  <div className="LocalPreview__artifactDropdown">
                    <div className="LocalPreview__artifactDropdownHeader">
                      <span>切换作品 ({artifactsList.length})</span>
                      <button
                        type="button"
                        className="LocalPreview__closePickerBtn"
                        onClick={() => setArtifactPickerOpen(false)}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="LocalPreview__artifactDropdownList">
                      {artifactsList.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`LocalPreview__artifactItem ${
                            previewTarget?.artifactId === item.id
                              ? "LocalPreview__artifactItem--active"
                              : ""
                          }`}
                          onClick={() => {
                            openPreviewTarget({
                              kind: "artifact",
                              title: item.title,
                              html: item.html,
                              artifactId: item.id,
                              dialogKey: item.dialogKey,
                            });
                            setArtifactPickerOpen(false);
                          }}
                        >
                          <span className="LocalPreview__artifactItemTitle">{item.title}</span>
                          <span className="LocalPreview__artifactItemDate">
                            {new Date(item.updatedAt).toLocaleTimeString()}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <span
                className="LocalPreview__path LocalPreview__title--static"
                title={previewTarget?.title ?? "单文件 HTML 制品"}
              >
                {previewTarget?.title ?? "单文件 HTML 制品"}
              </span>
            )}
          </>
        ) : (
          /* 非 HTML 本地开发预览原能力保留 */
          <>
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
              disabled={!previewUrl || isExternalUrl}
              title={
                isExternalUrl
                  ? "外部网页不支持标注"
                  : inspecting
                    ? "退出标注"
                    : "标注"
              }
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
              className="LocalPreview__badge"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "2px 6px",
                borderRadius: "4px",
                fontSize: "11px",
                fontWeight: 500,
                background: isExternalUrl
                  ? "var(--neutralGhost, #f1f5f9)"
                  : "var(--primaryGhost, #e0f2fe)",
                color: isExternalUrl
                  ? "var(--textSecondary, #475569)"
                  : "var(--primary, #0284c7)",
              }}
            >
              {isExternalUrl ? "🌐 网页" : "🔧 开发"}
            </span>

            <span
              className="LocalPreview__path"
              title={storePreviewUrl ?? root ?? undefined}
            >
              {storePreviewUrl ?? root}
            </span>

            {previewUrl ? (
              <Button
                size="small"
                variant="ghost"
                icon={<LuExternalLink size={14} />}
                onClick={() => {
                  if (previewUrl) window.open(previewUrl, "_blank", "noopener,noreferrer");
                }}
                title="在新窗口打开"
              />
            ) : null}
          </>
        )}

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

      {saveError ? (
        <div className="LocalPreview__saveErrorBanner">
          保存失败：{saveError}
        </div>
      ) : null}

      {listError ? (
        <div className="LocalPreview__saveErrorBanner LocalPreview__listErrorBanner">
          获取历史成品失败：{listError}
        </div>
      ) : null}

      <div className="LocalPreview__body">
        {viewMode === "source" ? (
          <div className="LocalPreview__sourceView">
            <textarea
              readOnly
              value={targetHtml ?? ""}
              className="LocalPreview__sourceTextarea"
              aria-label="HTML 源码"
            />
          </div>
        ) : error ? (
          <div className="LocalPreview__message">
            <div className="LocalPreview__error">{error}</div>
            <Button
              size="small"
              variant="secondary"
              onClick={() => {
                if (isArtifact) {
                  setArtifactRetry((r) => r + 1);
                } else {
                  void start();
                }
              }}
            >
              重试
            </Button>
          </div>
        ) : isArtifact && (artifactHostedUrl || previewTarget?.html) ? (
          <div className="LocalPreview__canvasArea">
            <iframe
              key={`artifact#${nonce}#${artifactHostedUrl ?? "pending"}`}
              ref={iframeRef}
              src={artifactHostedUrl ?? undefined}
              sandbox="allow-scripts"
              title={previewTarget?.title ?? "HTML 制品"}
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
              style={{
                pointerEvents: drawing ? "auto" : "none",
                visibility: drawing ? "visible" : "hidden",
              }}
            />
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
              style={{
                pointerEvents: drawing ? "auto" : "none",
                visibility: drawing ? "visible" : "hidden",
              }}
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

        .LocalPreview__viewToggle {
          display: inline-flex;
          border: 1px solid var(--border);
          border-radius: 6px;
          overflow: hidden;
        }

        .LocalPreview__viewToggle button {
          border-radius: 0;
          border: none;
        }

        .LocalPreview__artifactActions {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2, 8px);
        }

        .LocalPreview__statusText {
          display: inline-flex;
          align-items: center;
          font-size: 11px;
          padding: 0 4px;
          user-select: none;
        }

        .LocalPreview__statusBadge--saved {
          background: transparent;
          color: var(--textTertiary, #64748b);
        }

        .LocalPreview__statusBadge--unsaved {
          background: transparent;
          color: var(--warning, #d97706);
        }

        .LocalPreview__statusBadge--unreleased {
          background: transparent;
          color: var(--textTertiary, #64748b);
        }

        .LocalPreview__moreMenuContainer {
          position: relative;
          display: inline-flex;
          align-items: center;
        }

        .LocalPreview__moreMenuDropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          z-index: 100;
          min-width: 130px;
          background: var(--background, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
          display: flex;
          flex-direction: column;
          padding: 4px;
        }

        .LocalPreview__menuItem {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border: none;
          background: none;
          text-align: left;
          cursor: pointer;
          font-size: 12px;
          color: var(--textPrimary, #0f172a);
          border-radius: 4px;
          width: 100%;
        }

        .LocalPreview__menuItem:hover:not(:disabled) {
          background: var(--neutralGhost, #f1f5f9);
        }

        .LocalPreview__menuItem:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .LocalPreview__menuItemIcon {
          flex-shrink: 0;
        }

        .LocalPreview__artifactPicker {
          position: relative;
          display: inline-flex;
          align-items: center;
          max-width: 200px;
          min-width: 0;
        }

        .LocalPreview__titleBtn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border: 1px solid transparent;
          background: none;
          padding: 2px 6px;
          border-radius: 4px;
          cursor: pointer;
          font-size: var(--fontSize-xs, 12px);
          font-weight: 500;
          color: var(--textPrimary);
          max-width: 100%;
        }

        .LocalPreview__titleBtn:hover {
          background: var(--neutralGhost, #f1f5f9);
          border-color: var(--border, #e2e8f0);
        }

        .LocalPreview__titleText {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .LocalPreview__chevron {
          flex-shrink: 0;
          color: var(--textSecondary);
        }

        .LocalPreview__title--static {
          font-weight: 500;
          color: var(--textPrimary);
          cursor: default;
        }

        .LocalPreview__saveErrorBanner {
          background: #fee2e2;
          color: #b91c1c;
          padding: 4px 12px;
          font-size: 12px;
          border-bottom: 1px solid #fca5a5;
        }

        .LocalPreview__artifactDropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          z-index: 100;
          width: 240px;
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          display: flex;
          flex-direction: column;
        }

        .LocalPreview__artifactDropdownHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 600;
          border-bottom: 1px solid var(--border);
          background: var(--backgroundSecondary);
        }

        .LocalPreview__closePickerBtn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 11px;
          color: var(--textSecondary);
        }

        .LocalPreview__artifactDropdownList {
          max-height: 200px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .LocalPreview__artifactItem {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 10px;
          border: none;
          background: none;
          text-align: left;
          cursor: pointer;
          font-size: 12px;
        }

        .LocalPreview__artifactItem:hover {
          background: var(--neutralGhost, #f1f5f9);
        }

        .LocalPreview__artifactItem--active {
          background: var(--accentGhost, #ede9fe);
          font-weight: 600;
        }

        .LocalPreview__artifactItemTitle {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 150px;
        }

        .LocalPreview__artifactItemDate {
          font-size: 10px;
          color: var(--textTertiary);
        }

        .LocalPreview__path {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: var(--fontSize-xs, 12px);
          color: var(--textSecondary);
        }

        .LocalPreview__selected {
          display: inline-flex;
          align-items: center;
          gap: var(--space-1, 4px);
          font-size: var(--fontSize-xs, 12px);
          color: var(--textPrimary);
          background: var(--backgroundSecondary);
          border: 1px solid var(--border);
          padding: 2px 4px 2px 8px;
          border-radius: var(--radius-sm, 4px);
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

        .LocalPreview__sourceView {
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          padding: 12px;
        }

        .LocalPreview__sourceTextarea {
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          resize: none;
          font-family: var(--fontFamily-mono, monospace);
          font-size: 12px;
          line-height: 1.5;
          padding: 8px;
          border: 1px solid var(--border);
          border-radius: 4px;
          background: var(--background);
          color: var(--textPrimary);
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
