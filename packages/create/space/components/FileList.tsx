// create/space/components/FileList.tsx
import React from "react";
import {
  LuDownload,
  LuEye,
  LuFile,
  LuFileCode2,
  LuFileImage,
  LuFileSpreadsheet,
  LuFileText,
  LuImport,
  LuTrash2,
} from "react-icons/lu";
import { useTheme } from "app/theme";
import EmptyState from "./EmptyState";

// 导出接口以便其他组件使用
export interface FileItem {
  id: string | number;
  name: string;
  type: string;
  size: string;
  updatedAt: string;
  url?: string;
}

interface FileListProps {
  files: FileItem[];
  onViewFile?: (fileId: string | number) => void;
  onDownloadFile?: (fileId: string | number) => void;
  onRemoveFile?: (fileId: string | number) => void;
  onImportFile?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  loading?: boolean;
  gridLayout?: boolean;
}

// 文件图标映射（纯装饰，文件名在旁可见）
const fileIconMap = {
  pdf: <LuFileText aria-hidden="true" />,
  docx: <LuFileText aria-hidden="true" />,
  doc: <LuFileText aria-hidden="true" />,
  xlsx: <LuFileSpreadsheet aria-hidden="true" />,
  xls: <LuFileSpreadsheet aria-hidden="true" />,
  md: <LuFileCode2 aria-hidden="true" />,
  txt: <LuFileText aria-hidden="true" />,
  png: <LuFileImage aria-hidden="true" />,
  jpg: <LuFileImage aria-hidden="true" />,
  jpeg: <LuFileImage aria-hidden="true" />,
  gif: <LuFileImage aria-hidden="true" />,
  webp: <LuFileImage aria-hidden="true" />,
  default: <LuFile aria-hidden="true" />,
};

// 获取文件类型样式，使用主题变量
const getFileTypeStyle = (fileType: string, theme: any) => {
  switch (fileType) {
    case "pdf":
      return {
        background: theme.errorLight || "rgba(239, 68, 68, 0.15)",
        color: theme.error || "rgb(239, 68, 68)",
      };
    case "doc":
    case "docx":
      return {
        background: theme.primaryLight,
        color: theme.primary,
      };
    case "xls":
    case "xlsx":
      return {
        background: "rgba(16, 185, 129, 0.15)",
        color: "rgb(16, 185, 129)",
      };
    case "md":
    case "markdown":
      return {
        background: "rgba(139, 92, 246, 0.15)",
        color: "rgb(139, 92, 246)",
      };
    case "txt":
      return {
        background: "rgba(245, 158, 11, 0.15)",
        color: "rgb(245, 158, 11)",
      };
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
      return {
        background: theme.primaryGhost,
        color: theme.primary,
      };
    default:
      return {
        background: theme.backgroundTertiary,
        color: theme.textSecondary,
      };
  }
};

const FileList: React.FC<FileListProps> = ({
  files,
  onViewFile,
  onDownloadFile,
  onRemoveFile,
  onImportFile,
  emptyTitle = "还没有文件",
  emptyDescription = "上传您的第一个文件开始使用",
  loading = false,
  gridLayout = true,
}) => {
  const theme = useTheme();

  // 获取文件图标
  const getFileIcon = (fileType: string) => {
    return (fileIconMap as Record<string, React.ReactNode>)[fileType] || fileIconMap.default;
  };

  if (loading) {
    return (
      <div className="files-loading">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="file-skeleton">
            <div className="skeleton-icon"></div>
            <div className="skeleton-content">
              <div className="skeleton-line"></div>
              <div className="skeleton-line short"></div>
            </div>
          </div>
        ))}
        <style jsx>{`
          .files-loading {
            display: grid;
            grid-template-columns: ${gridLayout
            ? "repeat(auto-fill, minmax(280px, 1fr))"
            : "1fr"};
            gap: ${theme.space[4]};
            padding: ${theme.space[5]};
          }

          .file-skeleton {
            background: ${theme.backgroundSecondary};
            border-radius: var(--radius-sm);
            padding: ${theme.space[4]};
            display: flex;
            align-items: center;
          }

          .skeleton-icon {
            width: 40px;
            height: var(--control-lg);
            border-radius: var(--radius-md);
            background: linear-gradient(
              90deg,
              ${theme.backgroundTertiary} 25%,
              ${theme.background} 50%,
              ${theme.backgroundTertiary} 75%
            );
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            margin-right: ${theme.space[4]};
            flex-shrink: 0;
          }

          .skeleton-content {
            flex: 1;
          }

          .skeleton-line {
            height: 14px;
            width: 100%;
            background: linear-gradient(
              90deg,
              ${theme.backgroundTertiary} 25%,
              ${theme.background} 50%,
              ${theme.backgroundTertiary} 75%
            );
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: var(--radius-sm);
            margin-bottom: ${theme.space[2]};
          }

          .skeleton-line.short {
            width: 60%;
          }

          @keyframes shimmer {
            0% {
              background-position: 200% 0;
            }
            100% {
              background-position: -200% 0;
            }
          }
        `}</style>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <EmptyState
        icon={<LuFile />}
        title={emptyTitle}
        description={emptyDescription}
        actionText={
          onImportFile && (
            <>
              <LuImport style={{ marginRight: theme.space[2] }} aria-hidden="true" />
              导入文件
            </>
          )
        }
        onAction={onImportFile}
        secondaryAction={{
          text: "了解更多",
          onClick: () => window.open("/help/files", "_blank"),
        }}
      />
    );
  }

  return (
    <div className={gridLayout ? "file-grid" : "file-list"}>
      {files.map((file) => (
        <div
          key={file.id}
          className={`file-card ${file.url ? 'has-thumbnail' : ''}`}
          onClick={() => onViewFile && onViewFile(file.id)}
          style={{ cursor: onViewFile ? 'pointer' : 'default' }}
        >
          <div className="file-card-header">
            {file.url ? (
              <div
                className="file-thumbnail"
                style={{
                  backgroundImage: `url(${file.url})`,
                }}
              />
            ) : (
              <div
                className="file-type-icon"
                style={getFileTypeStyle(file.type, theme)}
              >
                {getFileIcon(file.type)}
              </div>
            )}
            <div className="file-actions" onClick={(e) => e.stopPropagation()}>
              {onViewFile && (
                <button
                  type="button"
                  className="action-button"
                  title="查看"
                  aria-label="查看"
                  onClick={() => onViewFile(file.id)}
                >
                  <LuEye aria-hidden="true" />
                </button>
              )}
              {onDownloadFile && (
                <button
                  type="button"
                  className="action-button"
                  title="下载"
                  aria-label="下载"
                  onClick={() => onDownloadFile(file.id)}
                >
                  <LuDownload aria-hidden="true" />
                </button>
              )}
              {onRemoveFile && (
                <button
                  type="button"
                  className="action-button delete"
                  title="删除"
                  aria-label="删除"
                  onClick={() => onRemoveFile(file.id)}
                >
                  <LuTrash2 aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
          <div className="file-card-body">
            <h3 className="file-name" title={file.name}>
              {file.name}
            </h3>
            <div className="file-meta">
              <span className="file-size">{file.size}</span>
              <span className="file-date">{file.updatedAt}</span>
            </div>
          </div>
        </div>
      ))}

      <style jsx>{`
        .file-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: ${theme.space[4]};
          padding: ${theme.space[5]};
        }

        .file-list {
          display: flex;
          flex-direction: column;
          gap: ${theme.space[3]};
          padding: ${theme.space[5]};
        }

        .file-card {
          background: ${theme.backgroundSecondary};
          border-radius: var(--radius-sm);
          overflow: hidden;
          transition:
            transform 0.2s,
            box-shadow 0.2s;
        }

        .file-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px ${theme.shadowMedium};
        }

        .file-card-header {
          padding: ${theme.space[4]};
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid ${theme.borderLight};
          position: relative;
        }

        .file-card.has-thumbnail .file-card-header {
          padding: 0;
          height: 160px;
          display: block;
        }

        .file-thumbnail {
          width: 100%;
          height: 100%;
          background-size: cover;
          background-position: center;
          transition: transform 0.3s;
        }
        
        .file-card.has-thumbnail:hover .file-thumbnail {
          transform: scale(1.05);
        }

        .file-card.has-thumbnail .file-actions {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(255, 255, 255, 0.9);
          border-radius: var(--radius-md);
          padding: 4px;
          opacity: 0;
          transition: opacity 0.2s;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .file-card.has-thumbnail:hover .file-actions {
          opacity: 1;
        }

        .file-type-icon {
          width: 40px;
          height: var(--control-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-md);
          font-size: var(--fontSize-lg);
        }

        .file-actions {
          display: flex;
          gap: ${theme.space[2]};
        }

        .action-button {
          width: 32px;
          height: var(--control-sm);
          border-radius: var(--radius-md);
          background: ${theme.background};
          color: ${theme.textSecondary};
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-button:hover {
          background: ${theme.backgroundHover};
          color: ${theme.text};
        }

        .action-button.delete:hover {
          background: ${(theme as any).errorLight || "rgba(220, 38, 38, 0.1)"};
          color: ${theme.error || "rgba(220, 38, 38, 1)"};
        }

        .file-card-body {
          padding: ${theme.space[4]};
        }

        .file-name {
          font-size: var(--fontSize-base);
          font-weight: 500;
          color: ${theme.text};
          margin: 0 0 ${theme.space[2]} 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .file-meta {
          display: flex;
          justify-content: space-between;
          font-size: var(--fontSize-sm);
          color: ${theme.textTertiary};
        }

        @media (max-width: 768px) {
          .file-grid {
            grid-template-columns: 1fr;
          }

          .file-actions {
            gap: ${theme.space[1]};
          }

          .action-button {
            width: 28px;
            height: var(--control-sm);
          }
        }
      `}</style>
    </div>
  );
};

export default FileList;
