import "./components.css";
import React from "react";
import { useTranslation } from "react-i18next";
import { LuCode } from "react-icons/lu";

interface AppSourceFile {
  name: string;
  code: string;
}

interface AppSourceFilesSidebarProps {
  files: AppSourceFile[];
  selectedName: string | null;
  onSelect: (name: string) => void;
}

const AppSourceFilesSidebar: React.FC<AppSourceFilesSidebarProps> = ({
  files,
  selectedName,
  onSelect,
}) => {
  const { t } = useTranslation();

  return (
    <div className="AppSourceFilesSidebar">
      <div className="AppSourceFilesSidebar__header">
        <div className="AppSourceFilesSidebar__eyebrow">
          <LuCode size={14} aria-hidden="true" />
          <span>{t("appEditor.sources", "源码")}</span>
        </div>
        <p className="AppSourceFilesSidebar__hint">
          {t(
            "appEditor_sidebarSourceHint",
            "点击文件即可弹窗查看源码；需要继续迭代时再从顶部打开助手。"
          )}
        </p>
      </div>

      <div className="AppSourceFilesSidebar__list">
        {files.length > 0 ? (
          files.map((file) => (
            <button
              key={file.name}
              type="button"
              className={`AppSourceFilesSidebar__item ${
                selectedName === file.name ? "is-active" : ""
              }`}
              onClick={() => onSelect(file.name)}
            >
              <span>{file.name}</span>
              <small>{file.code.split("\n").length} lines</small>
            </button>
          ))
        ) : (
          <div className="AppSourceFilesSidebar__empty">
            {t("appDetail.sourceFilesEmpty", "暂未返回源码文件。")}
          </div>
        )}
      </div>

      
    </div>
  );
};

export default AppSourceFilesSidebar;
