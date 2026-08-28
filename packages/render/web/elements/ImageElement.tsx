// 文件：render/web/elements/ImageElement.tsx

import React, { useEffect, useState } from "react";
import { Transforms } from "slate";
import {
  ReactEditor,
  useFocused,
  useSelected,
  useSlateStatic,
} from "slate-react";
import { LuTrash2, LuType, LuView } from "react-icons/lu";

import { useAppDispatch, useAppSelector } from "app/store";
import { selectRuntimeCurrentServer } from "app/stateViews/runtime";
import { readFileContent } from "database/dbSlice";
import { buildDatabaseFileContentUrl } from "database/fileUrl";
import ImagePreviewModal from "render/web/ui/modal/ImagePreviewModal";

interface ImageElementProps {
  attributes: any;
  children: React.ReactNode; // Caption 文本
  element: {
    url?: string;
    fileId?: string;
    alt?: string;
    align?: "left" | "center" | "right" | "justify";
    [key: string]: any;
  };
  style?: React.CSSProperties;
  readOnly?: boolean;
}

type FileContentResult = {
  fileId: string;
  blob: Blob;
  source: "local" | "remote";
};

/**
 * 将 readFileContent 返回的 Blob 转为 <img src> 可用的 object URL。
 * 返回：
 * - src:       可直接用于 <img src> 的字符串
 * - objectUrl: 若使用了 URL.createObjectURL，则返回该 URL，方便外部在适当时机 revoke
 */
const resolveImageSrcFromFileContent = (
  data: FileContentResult | null
): { src: string | null; objectUrl: string | null } => {
  if (!data || !(data.blob instanceof Blob)) {
    return { src: null, objectUrl: null };
  }

  const objectUrl = URL.createObjectURL(data.blob);
  return { src: objectUrl, objectUrl };
};

export const ImageElement: React.FC<ImageElementProps> = ({
  attributes,
  children,
  element,
  style,
  readOnly = false,
}) => {
  const dispatch = useAppDispatch();
  const currentServer = useAppSelector(selectRuntimeCurrentServer);
  const editor = useSlateStatic() as any;
  const selected = useSelected();
  const focused = useFocused();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const baseUrl = currentServer || "";

  // 原始 HTTP 直链作为回退方案
  const httpFallbackSrc =
    element.url ||
    buildDatabaseFileContentUrl(baseUrl, element.fileId) ||
    "";

  // 通过 readFileContent 解析后的 src，初始用 httpFallbackSrc
  const [fileContentSrc, setFileContentSrc] = useState<string | null>(
    httpFallbackSrc || null
  );

  // 优先级：
  // 1. element.url（已是可用 URL，不需要读取文件内容）
  // 2. 通过 readFileContent 从 IndexedDB / 服务器拿到 Blob → objectURL
  // 3. 回退到 httpFallbackSrc（直接访问远程内容接口）
  useEffect(() => {
    // 每次依赖变化先同步回退到 httpFallbackSrc，保证始终有一个兜底 src
    setFileContentSrc(httpFallbackSrc || null);

    // 有 url 时直接用，不再读文件内容
    if (element.url) return;

    // 没有 fileId 无法读取文件内容
    if (!element.fileId) return;

    let cancelled = false;
    let objectUrl: string | null = null;

    const loadFileContent = async () => {
      try {
        const data = (await dispatch(
          readFileContent({ fileId: element.fileId as string })
        ).unwrap()) as FileContentResult;

        const { src, objectUrl: nextObjectUrl } =
          resolveImageSrcFromFileContent(data);

        if (!cancelled && src) {
          setFileContentSrc(src);
          objectUrl = nextObjectUrl;
        }
        // 解析失败则保持 httpFallbackSrc，不做额外处理
      } catch {
        // 读取失败时保持 httpFallbackSrc，不额外报错
      }
    };

    loadFileContent();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [dispatch, element.fileId, element.url, httpFallbackSrc]);

  const imgSrc = fileContentSrc || "";

  // 去掉 ElementWrapper 注入的 textAlign，其他继续用
  const baseStyle: React.CSSProperties = (style || {}) as React.CSSProperties;
  const { textAlign: _ignore, ...restStyle } = baseStyle;

  const alignmentStyle: React.CSSProperties =
    element.align === "center"
      ? { marginLeft: "auto", marginRight: "auto", display: "block" }
      : element.align === "right"
        ? { marginLeft: "auto", display: "block" }
        : {};

  // 每张图片+Caption = 一张卡片
  const mergedStyle: React.CSSProperties = {
    display: element.align ? "block" : "inline-block",
    // 默认多图并排，卡片之间有间距
    ...(element.align ? {} : { marginRight: "var(--space-3)" }),
    marginBottom: "var(--space-3)",
    verticalAlign: "top",
    maxWidth: "100%",
    ...restStyle,
    ...alignmentStyle,
  };

  const isActive = selected && focused;

  // 删除当前图片节点
  const handleRemove = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const path = ReactEditor.findPath(editor, element as any);
    Transforms.removeNodes(editor, { at: path });
  };

  // 编辑 alt 文本（简单 prompt 版）
  const handleEditAlt = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const nextAlt = window.prompt("设置图片替代文本（alt）：", element.alt || "");
    if (nextAlt === null) return;

    const path = ReactEditor.findPath(editor, element as any);
    Transforms.setNodes(
      editor,
      { alt: nextAlt || undefined } as any,
      { at: path }
    );
  };

  // 打开预览
  const openPreview = () => {
    if (!imgSrc) return;
    setPreviewUrl(imgSrc);
  };

  // 图片本身的点击行为：
  // - 编辑模式：只选中，不预览（交给 Slate 处理 selection）
  // - 只读模式：点击直接预览
  const handleImageMouseDown = (event: React.MouseEvent) => {
    if (!readOnly) return; // 编辑模式：不拦截
    event.preventDefault();
    event.stopPropagation();
    openPreview();
  };

  const handlePreviewButton = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    openPreview();
  };

  return (
    <>
      <div {...attributes} style={mergedStyle}>
        <div
          style={{
            display: "inline-block",
            maxWidth: "100%",
          }}
        >
          {/* 图片 + 浮层按钮，contentEditable=false */}
          {imgSrc && (
            <div
              contentEditable={false}
              style={{
                position: "relative",
                display: "block",
                maxWidth: "100%",
              }}
            >
              <img
                src={imgSrc}
                alt={element.alt || ""}
                loading="lazy"
                onMouseDown={handleImageMouseDown}
                style={{
                  display: "block",
                  maxWidth: "100%",
                  maxHeight: "20em",
                  borderRadius: "var(--radius-md)",
                  boxShadow: isActive
                    ? "0 0 0 2px var(--primary)"
                    : "0 0 0 1px rgba(0, 0, 0, 0.12)",
                  cursor: readOnly ? "zoom-in" : "default",
                }}
              />

              {/* 只在编辑模式 + 选中时显示操作按钮 */}
              {isActive && !readOnly && (
                <div
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    display: "flex",
                    gap: 6,
                  }}
                >
                  <button
                    type="button"
                    onMouseDown={handleEditAlt}
                    style={iconButtonStyle}
                    title="编辑 Alt 文本"
                    aria-label="编辑 Alt 文本"
                  >
                    <LuType size={14} aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onMouseDown={handlePreviewButton}
                    style={iconButtonStyle}
                    title="预览大图"
                    aria-label="预览大图"
                  >
                    <LuView size={14} aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onMouseDown={handleRemove}
                    style={iconButtonStyle}
                    title="删除图片"
                    aria-label="删除图片"
                  >
                    <LuTrash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Caption：紧跟图片下方，宽度跟随图片 */}
          <div
            style={{
              marginTop: 6,
              minHeight: 18,
              fontSize: "var(--fontSize-sm)",
              color: "var(--textSecondary)",
              textAlign: "center",
              fontStyle: "italic",
            }}
          >
            {children}
          </div>
        </div>
      </div>

      {/* 大图预览 Modal */}
      <ImagePreviewModal
        imageUrl={previewUrl}
        alt={element.alt || ""}
        onClose={() => setPreviewUrl(null)}
        contentKey={element.fileId} 
      />
    </>
  );
};

const iconButtonStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 999,
  border: "none",
  padding: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  color: "#fff",
  cursor: "pointer",
};
