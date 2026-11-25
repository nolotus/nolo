/**
 * 文件页的 3D 预览入口：判定 → 状态面板 → 浏览器侧按需加载真实渲染器。
 *
 * 这一层刻意**不 import three**：
 * - 文件页在 SSR 阶段也会渲染，three/WebGL 只能在浏览器里跑，所以真正的
 *   `GlbViewer` 走动态 `import()`，且要等挂载后才加载；
 * - 「是不是 GLB」的最终真值在内容（`isGlbBinary`）：扩展名/MIME 只说「值得尝试加载」。
 *   所以非 glb 的模型格式也会进 viewer，内容确实是 GLB 就正常预览，
 *   内容不是 GLB 时用扩展名对应的真实原因解释（STL/STEP/OBJ 的提示因此可达）。
 */
import React, { Suspense, lazy, useEffect, useState } from "react";
import { GlbViewerStatus } from "./GlbViewerStatus";
import { resolveGlbSource } from "./glbViewerModel";

const LazyGlbViewer = lazy(() => import("./GlbViewer"));

export interface GlbModelPreviewProps {
  /** 模型下载地址（对象 URL 或文件内容 URL）。 */
  url?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  /** 测试注入：替换真实渲染器，避免测试拉起 three/WebGL。 */
  renderViewer?: (props: {
    url: string;
    fileName?: string;
    formatHint?: string;
  }) => React.ReactNode;
}

export const GlbModelPreview: React.FC<GlbModelPreviewProps> = ({
  url,
  fileName,
  mimeType,
  renderViewer,
}) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const resolution = resolveGlbSource({ url, fileName, mimeType });

  if (resolution.state === "missing-url") {
    return (
      <GlbViewerStatus
        kind="error"
        message={resolution.message}
        detail="文件内容没有拿到可访问的地址，无法加载 3D 预览；可以重新打开这个文件页或重新下载。"
      />
    );
  }

  // 明确不是模型（图片/PDF/文本…）：不下载、不拉 three。
  if (resolution.state === "not-a-model") {
    return (
      <GlbViewerStatus
        kind="error"
        message="这个文件没有 3D 预览。"
        detail={resolution.message}
      />
    );
  }

  const formatHint =
    resolution.state === "unsupported-format" ? resolution.message : undefined;

  // 挂载前（含 SSR）只出加载态：three 与 WebGL 都还没被拉起。
  if (!mounted) {
    return <GlbViewerStatus kind="loading" message="正在准备 3D 预览…" />;
  }

  if (renderViewer) {
    return <>{renderViewer({ url: resolution.url, fileName: fileName ?? undefined, formatHint })}</>;
  }

  return (
    <Suspense fallback={<GlbViewerStatus kind="loading" message="正在加载 3D 渲染器…" />}>
      <LazyGlbViewer
        url={resolution.url}
        fileName={fileName ?? undefined}
        formatHint={formatHint}
      />
    </Suspense>
  );
};

export default GlbModelPreview;
