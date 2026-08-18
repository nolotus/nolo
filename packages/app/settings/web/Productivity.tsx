import React, { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "app/store";
import { setSettings, selectDeleteShortcut } from "app/settings/settingSlice";
import { formatShortcut } from "app/settings/shortcutUtils";
import Kbd from "render/web/ui/Kbd";
import { LuRotateCcw, LuTrash2 } from "react-icons/lu";
import { toast } from "app/utils/toast"

const SettingSection: React.FC<{
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <section className="setting-section">
    <div className="section-header">
      <h2 className="section-title">{title}</h2>
      <p className="section-description">{description}</p>
    </div>
    <div className="section-content">{children}</div>
  </section>
);

const Productivity: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const isMac =
    typeof window !== "undefined" &&
    /Mac|iPod|iPhone|iPad/.test(window.navigator.platform);

  const deleteShortcut = useAppSelector(selectDeleteShortcut);
  const [isRecording, setIsRecording] = useState(false);
  const [tempKeys, setTempKeys] = useState<string[]>([]);

  useEffect(() => {
    if (!isRecording) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const key = e.key;

      if (key === "Escape") {
        setIsRecording(false);
        return;
      }

      const isModifier = ["control", "shift", "alt", "meta"].includes(key.toLowerCase());

      if (isModifier) {
        const pressed: string[] = [];
        if (e.ctrlKey) pressed.push("Ctrl");
        if (e.altKey) pressed.push(isMac ? "Option" : "Alt");
        if (e.shiftKey) pressed.push("Shift");
        if (e.metaKey) pressed.push(isMac ? "⌘" : "Win");
        setTempKeys(pressed);
        return;
      }

      const parts: string[] = [];
      if (e.ctrlKey) parts.push("ctrl");
      if (e.altKey) parts.push("alt");
      if (e.shiftKey) parts.push("shift");
      if (e.metaKey) parts.push("meta");

      parts.push(key.toLowerCase());

      const newShortcut = parts.join("+");
      void dispatch(setSettings({ deleteShortcut: newShortcut }));
      setIsRecording(false);
      toast.success(t("settings.productivity.shortcuts.updated", "快捷键已更新"));
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isRecording, isMac, dispatch, t]);

  const displayValue = useMemo(() => {
    if (isRecording) {
      return tempKeys.length > 0
        ? tempKeys.join(" + ") + " + ..."
        : t("settings.productivity.shortcuts.pressKeys", "按下快捷键...");
    }
    if (!deleteShortcut) {
      return t("settings.productivity.shortcuts.none", "已禁用");
    }
    // formatShortcut returns ⌘ / ⌫ on Mac; the recording button (a
    // single <button>, not a Kbd cap) can't render icons, so swap to
    // readable ASCII for the label.
    return formatShortcut(deleteShortcut, isMac)
      .replace(/\u2318/g, "Cmd")
      .replace(/\u232B/g, "Del");
  }, [isRecording, tempKeys, deleteShortcut, isMac, t]);

  return (
    <>
      <div className="productivity-page">
        <h1 className="page-title">
          {t("settings.productivity.title", "效率设置")}
        </h1>

        {/* 键盘快捷键 */}
        <SettingSection
          title={t("settings.productivity.shortcuts.title", "键盘快捷键")}
          description={t(
            "settings.productivity.shortcuts.description",
            "查看并管理常用操作的快捷键配置，让你的工作流更加顺畅。"
          )}
        >
          <ul className="shortcut-list">
            <li className="shortcut-item">
              <span className="shortcut-action">
                {t("toggleSidebar", "切换侧边栏")}
              </span>
              <Kbd shortcut="mod+b" />
            </li>

            <li className="shortcut-item">
              <span className="shortcut-action">
                {t("settings.productivity.shortcuts.sendMessage", "发送消息")}
              </span>
              <Kbd shortcut="mod+enter" />
            </li>

            <li className="shortcut-item">
              <span className="shortcut-action">
                {t("settings.productivity.shortcuts.newChat", "新建对话")}
              </span>
              <Kbd shortcut="mod+n" />
            </li>

            <li className="shortcut-item">
              <span className="shortcut-action">
                {t("settings.productivity.shortcuts.deleteDialog", "删除当前会话")}
              </span>
              <div className="shortcut-edit-container">
                <button
                  type="button"
                  className={`shortcut-kbd-btn ${isRecording ? "is-recording" : ""}`}
                  onClick={() => {
                    setIsRecording(true);
                    setTempKeys([]);
                  }}
                  title={t("settings.productivity.shortcuts.clickToRecord", "点击修改快捷键")}
                >
                  {displayValue}
                </button>
                {deleteShortcut && (
                  <button
                    type="button"
                    className="shortcut-reset-btn"
                    onClick={async () => {
                      try {
                        await dispatch(setSettings({ deleteShortcut: "" })).unwrap();
                        toast.success(t("settings.productivity.shortcuts.cleared", "快捷键已禁用"));
                      } catch (err) {
                        toast.error(t("settings.productivity.shortcuts.clearError", "禁用失败"));
                      }
                    }}
                    title={t("settings.productivity.shortcuts.clear", "禁用快捷键")}
                    aria-label={t("settings.productivity.shortcuts.clear", "禁用快捷键")}
                  >
                    <LuTrash2 size={14} aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  className="shortcut-reset-btn"
                  onClick={async () => {
                    const defaultShortcut = isMac ? "meta+backspace" : "ctrl+backspace";
                    try {
                      await dispatch(setSettings({ deleteShortcut: defaultShortcut })).unwrap();
                      toast.success(t("settings.productivity.shortcuts.resetSuccess", "快捷键已重置"));
                    } catch (err) {
                      toast.error(t("settings.productivity.shortcuts.resetError", "重置失败"));
                    }
                  }}
                  title={t("settings.productivity.shortcuts.reset", "重置为默认")}
                  aria-label={t("settings.productivity.shortcuts.reset", "重置为默认")}
                >
                  <LuRotateCcw size={14} aria-hidden="true" />
                </button>
              </div>
            </li>
          </ul>
        </SettingSection>
      </div>
    </>
  );
};

export default Productivity;
