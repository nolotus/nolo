// create/space/components/FileDropZone.tsx
import "./FileDropZone.css";
import React, { useState } from "react";
import { useTheme } from "app/theme";
import { LuUpload } from "react-icons/lu";
import { toast } from "app/utils/toast"

interface FileDropZoneProps {
  onFilesAdded: (files: File[]) => void;
  acceptedTypes?: string[];
  maxSize?: number; // 最大文件大小，单位字节
  children: React.ReactNode;
  disabled?: boolean;
}

type FileValidationResult = {
  validFiles: File[];
  invalidTypes: string[];
  oversizedFiles: string[];
};

export const validateDroppedFiles = (
  files: Iterable<File>,
  acceptedTypes: string[],
  maxSize: number
): FileValidationResult => {
  const invalidTypes: string[] = [];
  const oversizedFiles: string[] = [];
  const validFiles: File[] = [];

  for (const file of files) {
    const fileExt = "." + file.name.split(".").pop()?.toLowerCase();
    const mimeType = file.type;

    const isExtValid = acceptedTypes.some((type) => {
      if (type.startsWith(".")) {
        return type.toLowerCase() === fileExt;
      }
      return false;
    });

    const isMimeValid = acceptedTypes.some((type) => {
      if (type.endsWith("/*")) {
        const prefix = type.replace("/*", "");
        return Boolean(mimeType && mimeType.startsWith(prefix));
      }
      if (type.includes("/")) {
        return type === mimeType;
      }
      return false;
    });

    if (!isExtValid && !isMimeValid) {
      invalidTypes.push(file.name);
      continue;
    }

    if (file.size > maxSize) {
      oversizedFiles.push(file.name);
      continue;
    }

    validFiles.push(file);
  }

  return {
    validFiles,
    invalidTypes,
    oversizedFiles,
  };
};

const FileDropZone: React.FC<FileDropZoneProps> = ({
  onFilesAdded,
  acceptedTypes = [
    // 文档
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".txt",
    ".md",
    ".markdown",
    // 图片
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".svg"
  ],
  maxSize = 50 * 1024 * 1024, // 默认50MB
  children,
  disabled = false,
}) => {
  const theme = useTheme();
  const [dragActive, setDragActive] = useState(false);

  // Nested drop targets (dialog entries, quick-chat composer) own drops in
  // their subtree; this zone only handles drops on the space itself.
  const isFromNestedTarget = (e: React.DragEvent): boolean =>
    e.target instanceof HTMLElement &&
    !!e.target.closest("[data-file-drop-target]");

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;
    if (isFromNestedTarget(e)) {
      setDragActive(false);
      return;
    }

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFiles = (files: FileList): File[] => {
    const { validFiles, invalidTypes, oversizedFiles } = validateDroppedFiles(
      Array.from(files),
      acceptedTypes,
      maxSize
    );

    // 设置错误信息
    if (invalidTypes.length > 0) {
      toast.error(`不支持的文件类型: ${invalidTypes.join(", ")}`, {
        duration: 4000,
      });
    }

    if (oversizedFiles.length > 0) {
      toast.error(
        `文件过大: ${oversizedFiles.join(", ")}. 最大支持${(maxSize / 1024 / 1024).toFixed(0)}MB`,
        {
          duration: 4000,
        }
      );
    }

    return validFiles;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;
    if (isFromNestedTarget(e)) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = validateFiles(e.dataTransfer.files);

      if (validFiles.length > 0) {
        onFilesAdded(validFiles);
      }
    }
  };

  return (
    <div
      className={`file-drop-zone ${dragActive ? "active" : ""} ${disabled ? "disabled" : ""}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {children}

      {dragActive && !disabled && (
        <div className="drop-indicator">
          <div className="indicator-content">
            <div className="indicator-icon">
              <LuUpload size={36} aria-hidden="true" />
            </div>
            <p>释放鼠标添加文件</p>
          </div>
        </div>
      )}

      
    </div>
  );
};

export default FileDropZone;
