import "../page.css";
import React, { useEffect, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "app/store";
import { read, readFileContent } from "database/dbSlice";
import { format } from "date-fns";
import { LuDownload, LuFileText, LuInfo, LuCalendar, LuTag, LuType, LuUser, LuHardDrive, LuTrash2, LuInbox } from "react-icons/lu";
import PageLoading from "render/web/ui/PageLoading";
import { deleteDbKey, getDeleteErrorMessage } from "app/hooks/deleteDbKey";
import { useTranslation } from "react-i18next";
import { toast } from "app/utils/toast"
import { useNavigate } from "app/routing";
import { useCurrentSpaceId } from "create/space/spaceCurrentStore";

interface FileInfoPanelProps {
  pageKey: string;
}

const FileInfoPanel: React.FC<FileInfoPanelProps> = ({ pageKey }) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const currentSpaceId = useCurrentSpaceId();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);

  const [isDeleting, setDeleting] = useState(false);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  useEffect(() => {
    setData(null);
    setFileSize(null);
    setFileUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    let isMounted = true;
    let objectUrl: string | null = null;
    const fetchData = async () => {
      try {
        setLoading(true);
        const metadata = await (dispatch as any)(read({ dbKey: pageKey })).unwrap();
        if (isMounted && metadata) {
          setData(metadata);

          if (metadata.id) {
            const content = await (dispatch as any)(readFileContent({ fileId: pageKey })).unwrap();
            if (isMounted) {
              objectUrl = URL.createObjectURL(content.blob);
              setFileUrl(objectUrl);
              setFileSize(content.blob.size);
            }
          }
        }
      } catch (e) {
        console.error("Failed to load file info:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [pageKey, dispatch]);

  const handleDelete = useCallback(async () => {
    if (!data || !pageKey) return;
    if (isDeleting) return;

    const spaceId = data.spaceId || currentSpaceId;
    setDeleting(true);
    try {
      await (dispatch as any)(deleteDbKey(pageKey, spaceId));
      toast.success(t("deleteMovedToTrash", { title: data.title || pageKey }));
      navigate(-1);
    } catch (err) {
      const message = getDeleteErrorMessage(err, t("deleteFailed"));
      console.error("Failed to delete file:", message, err);
      toast.error(message === t("deleteFailed") ? message : `${t("deleteFailed")}: ${message}`);
    } finally {
      setDeleting(false);
    }
  }, [data, pageKey, currentSpaceId, dispatch, isDeleting, navigate, t]);

  if (loading) return <PageLoading message="加载详情..." />;
  if (!data) return <div className="FileInfoPanel__error">未找到文件数据</div>;

  const metadataItems = [
  { label: "名称", value: data.title || "未命名资源", icon: LuFileText },
  { label: "类型", value: data.type?.toUpperCase() || "UNKNOWN", icon: LuType },
  { label: "大小", value: fileSize ? formatSize(fileSize) : "未知", icon: LuHardDrive },
  { label: "创建者", value: data.creator || "未知", icon: LuUser },
  { label: "空间 ID", value: data.spaceId || currentSpaceId || "未知", icon: LuInbox },
  {
    label: "更新时间",
    value: data.lastSavedAt ? format(new Date(data.lastSavedAt), "yyyy-MM-dd HH:mm:ss") : "未知",
    icon: LuCalendar
  },
  { label: "标签", value: data.tags?.join(", ") || "无", icon: LuTag },
  { label: "资源 ID", value: data.pageKey || "未知", icon: LuInfo }];


  return (
    <div className="FileInfoPanel">
      <div className="FileInfoPanel__section">
        <h3 className="FileInfoPanel__section-title">
          <LuInfo size={16} aria-hidden="true" />
          基本信息
        </h3>
        <div className="FileInfoPanel__meta-list">
          {metadataItems.map((item) =>
          <div key={item.label} className="FileInfoPanel__meta-item">
              <item.icon size={14} className="FileInfoPanel__meta-icon" aria-hidden="true" />
              <div className="FileInfoPanel__meta-content">
                <span className="FileInfoPanel__meta-label">{item.label}</span>
                <span className="FileInfoPanel__meta-value">{item.value}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="FileInfoPanel__actions">
        {fileUrl &&
        <a
          href={fileUrl}
          download={data.title || "download"}
          className="FileInfoPanel__btn FileInfoPanel__btn--primary">

            <LuDownload size={16} aria-hidden="true" />
            下载源文件
          </a>
        }

        <button
          type="button"
          onClick={handleDelete}
          className="FileInfoPanel__btn FileInfoPanel__btn--danger"
          disabled={isDeleting}>

          <LuTrash2 size={16} aria-hidden="true" />
          删除文件
        </button>
      </div>


      
    </div>);

};

export default FileInfoPanel;
