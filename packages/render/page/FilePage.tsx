// 文件: render/page/FilePage.tsx

import "../page.css";
import React, { useEffect, useState } from "react";

import { useAppDispatch } from "app/store";
import {
  isAudioMimeType,
  isImageResourceLike,
  isPdfMimeType,
  isVideoMimeType,
} from "app/utils/fileUtils";
import { readFileContent, read } from "database/dbSlice";

import PageLoading from "render/web/ui/PageLoading";
import { LuDownload, LuInfo, LuFile } from "react-icons/lu";

interface FilePageProps {
  pageKey: string;
}

const FilePage: React.FC<FilePageProps> = ({ pageKey }) => {
  const dispatch = useAppDispatch();

  const [fileMetadata, setFileMetadata] = useState<any>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);

  const page = fileMetadata || {};
  const pageId = page.id;
  const isInitialized = !!fileMetadata;
  const isLoading = loadingMeta;

  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

  const isImage = isImageResourceLike({
    kind: page.type,
    mimeType: page.mimeType,
    fileCategory: page.fileCategory,
    fileName: page.originalName || page.title,
  });
  const isPdf = isPdfMimeType(page.mimeType);
  const isVideo = isVideoMimeType(page.mimeType);
  const isAudio = isAudioMimeType(page.mimeType);

  // 1. 加载文件元数据
  useEffect(() => {
    if (!pageKey) return;

    // pageKey 变化时重置所有状态，避免残留旧数据/已撤销的 objectUrl
    setFileMetadata(null);
    setMetaError(null);
    setFileUrl(null);
    setContentLoading(false);
    setContentError(null);

    let isMounted = true;
    const fetchMeta = async () => {
      try {
        setLoadingMeta(true);
        const data = await (dispatch as any)(read({ dbKey: pageKey })).unwrap();
        if (!isMounted) return;

        if (data) {
          setFileMetadata(data);
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
    };
  }, [dispatch, pageKey]);

  // 2. 加载文件/图片主体内容
  useEffect(() => {
    if (!isInitialized || !pageKey || !pageId) return;
    if (fileMetadata && fileMetadata.dbKey !== pageKey) return;

    let isMounted = true;
    let objectUrl: string | null = null;

    const fetchFile = async () => {
      try {
        setContentLoading(true);
        const result = await (dispatch as any)(
          readFileContent({ fileId: pageKey })
        ).unwrap();
        if (!isMounted) return;

        objectUrl = URL.createObjectURL(result.blob);
        setFileUrl(objectUrl);
        setContentError(null);
      } catch (err: any) {
        if (!isMounted) return;
        console.error("Failed to load file content:", err);
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
  }, [dispatch, isInitialized, pageId, pageKey, fileMetadata]);

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

  if (isLoading || !isInitialized) {
    return <PageLoading message="正在载入资源元数据..." />;
  }

  return (
    <div className="FilePage">
      <div className="FilePage__content">
        {contentLoading && !fileUrl ?
        <PageLoading
          message={`正在读取${isImage ? "图片" : isPdf ? "PDF" : isVideo ? "视频" : isAudio ? "音频" : "文件"}内容...`} /> :

        contentError ?
        <div className="FilePage__error">
            <LuInfo size={48} aria-hidden="true" />
            <p>{contentError}</p>
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
              该类型暂不支持直接预览，请通过右上角按钮查看详情。
            </p>
          </div>
        }

        {fileUrl &&
        <a
          href={fileUrl}
          download={page.title || "download"}
          className="FilePage__download-fab"
          aria-label="下载源文件">

            <LuDownload size={16} aria-hidden="true" />
          </a>
        }
      </div>

      
    </div>);

};

export default FilePage;
