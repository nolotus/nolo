import React from "react";
import { useTranslation } from "react-i18next";
import { LuMessageCircle, LuSparkles } from "react-icons/lu";
import "./SideDialogPanel.css";

export const SideDialogPanel: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="SideDialogPanel">
      <header className="SideDialogPanel-header">
        <div className="SideDialogPanel-title">
          <LuMessageCircle size={16} aria-hidden="true" />
          <span>{t("sideDialogPanel.title", "页面 AI")}</span>
        </div>
        <div className="SideDialogPanel-subtitle">
          {t(
            "sideDialogPanel.subtitle",
            "在这里与你的 AI 协作，针对当前页面或数据表提出问题、获得修改建议。"
          )}
        </div>
      </header>

      <div className="SideDialogPanel-body">
        <div className="SideDialogPanel-empty">
          <div className="SideDialogPanel-empty-icon">
            <LuSparkles size={20} aria-hidden="true" />
          </div>
          <div className="SideDialogPanel-empty-text">
            {t(
              "sideDialogPanel.empty.text",
              "未来这里会显示与当前页面或数据表相关的对话。"
            )}
          </div>
          <div className="SideDialogPanel-empty-hint">
            {t(
              "sideDialogPanel.empty.hint",
              "你可以在顶部工具栏中随时打开或关闭这个面板。"
            )}
          </div>
        </div>
      </div>

      <footer className="SideDialogPanel-footer">
        <div className="SideDialogPanel-input-placeholder">
          <span>
            {t(
              "sideDialogPanel.inputPlaceholder",
              "输入框区域 · 后续会接入对话能力"
            )}
          </span>
        </div>
      </footer>
    </div>
  );
};
