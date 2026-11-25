// 文件: render/page/FilePage.tsx

import "../page.css";
import React, { Suspense, lazy, useEffect, useRef, useState } from "react";

import { useAppDispatch, useAppSelector, type AppExtra } from "app/store";
import {
  isAudioMimeType,
  isImageResourceLike,
  isPdfMimeType,
  isVideoMimeType,
} from "app/utils/fileUtils";
import { loadFilePageDownload } from "./filePageDownload";
import { useStableMediaPlayback } from "render/web/ui/useStableMediaPlayback";
import { useWebMediaSource } from "render/web/ui/useWebMediaSrc";
import { buildDatabaseFileContentUrl } from "database/fileUrl";
import { fileKey } from "database/keys";
import { readWebSpaceUploadFileId } from "database/spaceUploadFileMapping";
import { confirmPublicWebFile, parseWebMedia } from "render/web/ui/webMediaSources";
import { selectRuntimeSnapshot } from "app/stateViews/runtime";
import { useCurrentSpaceId } from "create/space/spaceCurrentStore";
import { readFileContent, read } from "database/dbSlice";

import PageLoading from "render/web/ui/PageLoading";
import GlbModelPreview from "render/web/three/GlbModelPreview";
import { isGlbViewerCandidate } from "render/web/three/glbViewerModel";
import { LuDownload, LuInfo, LuFile } from "react-icons/lu";
import PageObjectActions from "./PageObjectActions";
import { isEpubFile } from "create/space/epub/epubFile";

const EpubReaderView = lazy(() => import("create/space/epub/EpubReaderView"));

interface FilePageProps {
  pageKey: string;
}

type FilePreviewMetadata = {
  id: string;
  type?: string;
  mimeType?: string;
  fileCategory?: string;
  originalName?: string;
  title?: string;
  serverOrigin?: string;
  tenantId?: string;
  userId?: string;
  ownerDbKey?: string;
};

function matchesFileRequest(record: unknown, requestId: string, source: "local" | "remote", uploadedFileId?: string) {
  const data = record as FilePreviewMetadata | null | undefined;
  if (data?.id === requestId) return true;
  if (source === "local" && uploadedFileId && data?.id === uploadedFileId) return true;

  // Keep the canonical key for old owned records and the server's explicit
  // ownerDbKey link for custom-key uploads. Neither is a local byte-cache mapping.
  const tenantId = data?.tenantId ?? data?.userId;
  return typeof data?.id === "string" && typeof tenantId === "string"
    && (fileKey.single(tenantId, data.id) === requestId
      || (source === "remote" && data.tenantId === tenantId && data.ownerDbKey === requestId
        && requestId.startsWith(fileKey.single(tenantId, ""))));
}

function isImageFile(page: FilePreviewMetadata) {
  return isImageResourceLike({
    kind: page.type,
    mimeType: page.mimeType,
    fileCategory: page.fileCategory,
    fileName: page.originalName || page.title,
  });
}

function isEpubFileRenderable({ page, isImage, isPdf, isVideo, isAudio, is3dModel }: {
  page: FilePreviewMetadata; isImage: boolean; isPdf: boolean; isVideo: boolean; isAudio: boolean; is3dModel: boolean;
}) {
  return !isImage && !isPdf && !isVideo && !isAudio && !is3dModel && isEpubFile(page);
}

const SignedInFilePage: React.FC<FilePageProps> = ({ pageKey }) => {
  const dispatch = useAppDispatch();
  const { currentServer, currentUserId } = useAppSelector(selectRuntimeSnapshot);
  const [file, setFile] = useState<{ metadata: FilePreviewMetadata; localFileId?: string } | null>(null);
  const fileMetadata = file?.metadata;
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [blob, setBlob] = useState<{ key: string; url: string } | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

  const isMedia = !!fileMetadata && (isImageFile(fileMetadata) || isVideoMimeType(fileMetadata.mimeType) || isAudioMimeType(fileMetadata.mimeType));

  // 1. 加载文件元数据
  useEffect(() => {
    if (!pageKey) return;

    // pageKey 变化时重置所有状态，避免残留旧数据/已撤销的 objectUrl
    setFile(null);
    setMetaError(null);
    setBlob(null);
    setContentLoading(false);
    setContentError(null);

    let isMounted = true;
    const controller = new AbortController();
    const fetchMeta = async () => {
      try {
        setLoadingMeta(true);
        const uploadedFileId = currentUserId ? await dispatch(
          (_dispatch: unknown, _getState: unknown, { db }: AppExtra) => readWebSpaceUploadFileId(db, currentUserId, pageKey),
        ) : undefined;
        if (!isMounted) return;
        const data = await dispatch(read({
          dbKey: pageKey,
          signal: controller.signal,
          validateRecord: (record: unknown, source: "local" | "remote") => matchesFileRequest(record, pageKey, source, uploadedFileId),
        })).unwrap();
        if (!isMounted) return;

        if (data) {
          setFile({ metadata: data, localFileId: uploadedFileId === data.id ? uploadedFileId : undefined });
        } else {
          setMetaError("未找到文件数据");
        }
      } catch (e: any) {
        if (isMounted) {
          setMetaError(e.message || "加载失败");
        }
      } finally {
        if (isMounted) setLoadingMeta(false);
      }
    };

    fetchMeta();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [dispatch, pageKey, currentUserId]);

  // 2. 加载文件/图片主体内容
  useEffect(() => {
    if (!fileMetadata) return;

    let isMounted = true;
    let objectUrl: string | null = null;

    const fetchFile = async () => {
      try {
        setContentLoading(true);
        const result = await (dispatch as any)(
          readFileContent({ fileId: pageKey, localFileId: file?.localFileId, useServerFallback: !isMedia })
        ).unwrap();
        if (!isMounted) return;

        objectUrl = URL.createObjectURL(result.blob);
        setBlob({ key: pageKey, url: objectUrl });
        setContentError(null);
      } catch (err: any) {
        if (!isMounted) return;
        if (!isMedia) console.error("Failed to load file content:", err);
        setContentError(err.message || "内容加载失败");
      } finally {
        if (isMounted) {
          setContentLoading(false);
        }
      }
    };

    fetchFile();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [dispatch, pageKey, file, fileMetadata, isMedia]);

  if (metaError) {
    return (
      <div className="FilePage">
        <div className="FilePage__content">
          <div className="FilePage__error">
            <LuInfo size={48} aria-hidden="true" />
            <p>{metaError}</p>
          </div>
        </div>
      </div>);

  }

  if (loadingMeta || !fileMetadata) {
    return <PageLoading message="正在载入资源元数据..." />;
  }

  const source = isMedia ? buildDatabaseFileContentUrl(fileMetadata.serverOrigin || currentServer, pageKey) : null;
  return <FilePreview page={fileMetadata} pageKey={pageKey} source={source} localUrl={blob?.key === pageKey ? blob.url : null}
    contentLoading={contentLoading} contentError={contentError} />;
};

type FilePreviewProps = {
  page: FilePreviewMetadata;
  /** 路由里的文件 key；EPUB 阅读进度与文件助手上下文都按它归属。 */
  pageKey?: string;
  source: string | null;
  localUrl?: string | null;
  confirmedPublic?: boolean;
  contentLoading?: boolean;
  contentError?: string | null;
};

const FilePreview: React.FC<FilePreviewProps> = ({ page, pageKey, source, localUrl, confirmedPublic, contentLoading, contentError }) => {
  const spaceId = useCurrentSpaceId();
  const isImage = isImageFile(page);
  const isPdf = isPdfMimeType(page.mimeType);
  const isVideo = isVideoMimeType(page.mimeType);
  const isAudio = isAudioMimeType(page.mimeType);
  const media = useWebMediaSource(localUrl || source, { spaceId, trustedAccessPolicy: confirmedPublic ? "public" : undefined });
  const player = useRef<HTMLMediaElement>(null);
  const playback = useStableMediaPlayback(media, player);
  const fileUrl = isAudio || isVideo ? playback.src : localUrl || media.src;
  const downloadTask = useRef<AbortController | null>(null);
  const [download, setDownload] = useState<{ identity: object; pending: boolean; error?: string }>();
  useEffect(() => () => { downloadTask.current?.abort(); downloadTask.current = null; }, [media.identity]);

  const downloadRemote = async () => {
    if (downloadTask.current) return;
    const task = new AbortController();
    downloadTask.current = task;
    setDownload({ identity: media.identity, pending: true });
    try {
      const file = await loadFilePageDownload(media.getFresh, task.signal);
      task.signal.throwIfAborted();
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = page.title || "download";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1_000);
      setDownload({ identity: media.identity, pending: false });
    } catch {
      if (!task.signal.aborted) setDownload({ identity: media.identity, pending: false, error: "文件下载失败，请重试" });
    } finally {
      if (downloadTask.current === task) downloadTask.current = null;
    }
  };
  const downloadState = download?.identity === media.identity ? download : undefined;
  // 3D 预览：模型类文件（.glb 与其它已知 3D 格式、model/* MIME）交给 3D viewer。
  // 「到底是不是 GLB」由 viewer 按文件内容判定；非 glb 格式在那里拿到具体原因，
  // 而不是在文件页上统一说「暂不支持预览」。
  const is3dModel = isGlbViewerCandidate({
    fileName: page.title,
    originalName: page.originalName,
    mimeType: page.mimeType,
  });
  // EPUB 阅读器：mime 与 .epub 扩展名都认；与 3D / 图片 / PDF / 音视频互斥。
  const isEpub = isEpubFileRenderable({ page, isImage, isPdf, isVideo, isAudio, is3dModel });

  const downloadControl = localUrl ?
  <a
    href={localUrl}
    download={page.title || "download"}
    className="FilePage__download-fab"
    aria-label="下载源文件">

    <LuDownload size={16} aria-hidden="true" />
  </a> : source ? (
  <button type="button" className="FilePage__download-fab" aria-label="下载源文件"
    disabled={downloadState?.pending} onClick={() => void downloadRemote()}>
    <LuDownload size={16} aria-hidden="true" />
  </button>
  ) : null;

  const showEpubReader = isEpub && !!fileUrl && !contentError;
  if (showEpubReader) {
    // 主区域阅读页：占满容器，下载入口与对象动作（文件助手 / 详情）收进阅读器顶栏右侧。
    return (
      <div className="FilePage FilePage--reader">
        <Suspense fallback={<PageLoading message="正在打开书籍..." />}>
          <EpubReaderView
            contentKey={pageKey ?? page.id}
            title={page.title || page.originalName || "EPUB"}
            fileUrl={fileUrl}
            trailing={
              <div className="FilePage__reader-actions">
                <PageObjectActions />
                {downloadControl ? <span className="FilePage__reader-download">{downloadControl}</span> : null}
              </div>
            } />
        </Suspense>
        {downloadState?.error ? <p role="alert" className="FilePage__reader-error">{downloadState.error}</p> : null}
      </div>);
  }

  return (
    <div className="FilePage">
      <div className="FilePage__content">
        <PageObjectActions />
        {contentLoading && !fileUrl ?
        <PageLoading
          message={`正在读取${isImage ? "图片" : isPdf ? "PDF" : isVideo ? "视频" : isAudio ? "音频" : is3dModel ? " 3D 模型" : "文件"}内容...`} /> :

        contentError && !fileUrl ?
        <div className="FilePage__error">
            <LuInfo size={48} aria-hidden="true" />
            <p>{contentError}</p>
          </div> :
        is3dModel && fileUrl ?
        <div className="FilePage__model-preview">
            <GlbModelPreview
              url={fileUrl}
              fileName={page.originalName || page.title}
              mimeType={page.mimeType} />
          </div> :
        isImage && fileUrl ?
        <div className="FilePage__image-preview">
            <img src={fileUrl} alt={page.title || "image"} />
          </div> :
        isPdf && fileUrl ?
        <div className="FilePage__document-preview">
            <iframe
              src={fileUrl}
              title={page.title || "pdf"}
              className="FilePage__document-frame"
            />
          </div> :
        isVideo && fileUrl ?
        <div className="FilePage__media-preview">
            <video
              ref={player as React.RefObject<HTMLVideoElement>}
              {...playback.events}
              src={fileUrl}
              controls
              className="FilePage__media-player"
              preload="metadata"
            />
          </div> :
        isAudio && fileUrl ?
        <div className="FilePage__audio-preview">
            <div className="FilePage__audio-card">
              <h2 className="FilePage__title">{page.title || "音频资源"}</h2>
              <audio
                ref={player as React.RefObject<HTMLAudioElement>}
                {...playback.events}
                src={fileUrl}
                controls
                className="FilePage__audio-player"
                preload="metadata"
              />
            </div>
          </div> :

        <div className="FilePage__hero">
            <div className="FilePage__icon-wrapper">
              <LuFile size={64} className="FilePage__large-icon" aria-hidden="true" />
            </div>
            <h2 className="FilePage__title">{page.title || "文件资源"}</h2>
            <p className="FilePage__subtitle">
              该类型暂不支持直接预览，{confirmedPublic ? "请下载源文件。" : "请通过右上角按钮查看详情。"}
            </p>
          </div>
        }

        {playback.unavailable && (isAudio || isVideo) && <p role="status">媒体暂不可播放</p>}
        {downloadState?.error && <p role="alert">{downloadState.error}</p>}
        {downloadControl}
      </div>

      
    </div>);

};

function GuestFilePage({ pageKey, source }: FilePageProps & { source: string | null }) {
  const [result, setResult] = useState<{ mimeType: string } | null>();
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      if (!source) return null;
      const media = parseWebMedia(source, undefined);
      if (!media || media.id !== pageKey || !await confirmPublicWebFile(media, fetch, controller.signal)) return null;
      // The confirmation only gives a boolean. Read the content headers to
      // choose a player without reading legacy metadata or buffering the file.
      const response = await fetch(source, {
        method: "HEAD", credentials: "omit", redirect: "error", cache: "no-store",
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]),
      });
      const mimeType = response.headers.get("Content-Type")?.split(";", 1)[0]?.trim().toLowerCase();
      return response.ok && mimeType ? { mimeType } : null;
    };
    void load().catch(() => null).then((next) => {
      if (!controller.signal.aborted) setResult(next);
    });
    return () => controller.abort();
  }, [pageKey, source]);

  if (result === undefined) return <PageLoading message="正在确认公开文件..." />;
  if (!result) return (
    <div className="FilePage">
      <div className="FilePage__error" role="status">请登录后查看文件详情</div>
    </div>
  );
  return <FilePreview page={{ id: pageKey, ...result }} pageKey={pageKey} source={source} confirmedPublic />;
}

const FilePage: React.FC<FilePageProps> = ({ pageKey }) => {
  const { currentToken, currentServer } = useAppSelector(selectRuntimeSnapshot);
  if (currentToken?.trim()) return <SignedInFilePage key={pageKey} pageKey={pageKey} />;
  const source = buildDatabaseFileContentUrl(currentServer, pageKey);
  return <GuestFilePage key={JSON.stringify([currentServer, pageKey])} pageKey={pageKey} source={source} />;
};

export default FilePage;
