import React from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "app/store";
import {
  // 聚合选择器，一次拿到所有编辑器配置
  selectEditorConfig,
  // 单独 action（去掉 setEditorDefaultMode）
  setEditorLightCodeTheme,
  setEditorDarkCodeTheme,
  toggleEditorWordCount,
  toggleEditorShortcut,
  setEditorFontSize,
  toggleEditorAutoSave,
  setEditorAutoSaveInterval,
} from "app/settings/settingSlice";
import {
  LuHeading,
  LuListOrdered,
  LuList,
  LuQuote,
  LuCode,
  LuSquareCheck,
  LuHash,
  LuSettings,
  LuClock,
} from "react-icons/lu";
import { Select, SelectItem } from "render/web/ui/Select";

// --- UI 组件 ---
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

const ShortcutToggle: React.FC<{
  icon: React.ReactNode;
  label: string;
  enabled: boolean;
  onToggle: () => void;
}> = ({ icon, label, enabled, onToggle }) => (
  <div className="shortcut-item">
    <div className="shortcut-label">
      <span className="shortcut-icon">{icon}</span>
      <span>{label}</span>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={onToggle}
      className={`toggle-switch ${enabled ? "enabled" : ""}`}
    >
      <span className="toggle-knob" />
    </button>
  </div>
);

const EditorConfig: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  // 用聚合 selector，一次取出所有编辑器相关配置
  const {
    // defaultMode 已删除
    lightCodeTheme,
    darkCodeTheme,
    codeTheme, // 保留：当前实际生效的主题（展示用）
    wordCountEnabled,
    shortcuts,
    fontSize,
    autoSave,
    autoSaveInterval,
  } = useAppSelector(selectEditorConfig);

  const shortcutItems = [
    {
      key: "heading",
      label: t("editor.shortcuts.heading", "标题"),
      icon: <LuHeading size={16} aria-hidden="true" />,
    },
    {
      key: "ulist",
      label: t("editor.shortcuts.ulist", "无序列表"),
      icon: <LuList size={16} aria-hidden="true" />,
    },
    {
      key: "olist",
      label: t("editor.shortcuts.olist", "有序列表"),
      icon: <LuListOrdered size={16} aria-hidden="true" />,
    },
    {
      key: "tasklist",
      label: t("editor.shortcuts.tasklist", "任务列表"),
      icon: <LuSquareCheck size={16} aria-hidden="true" />,
    },
    {
      key: "quote",
      label: t("editor.shortcuts.quote", "引用"),
      icon: <LuQuote size={16} aria-hidden="true" />,
    },
    {
      key: "code",
      label: t("editor.shortcuts.code", "代码块"),
      icon: <LuCode size={16} aria-hidden="true" />,
    },
  ];

  // 这里的 value 要和 PRISM_CODE_THEMES 的 key 对得上
  const codeThemes = [
    { value: "default", label: t("editor.codeTheme.options.default", "Prism Default（浅色）") },
    { value: "okaidia", label: t("editor.codeTheme.options.okaidia", "Okaidia（深色 / Monokai）") },
    { value: "github-light", label: t("editor.codeTheme.options.githubLight", "GitHub Light") },
    { value: "github-dark", label: t("editor.codeTheme.options.githubDark", "GitHub Dark") },
  ];

  const fontSizes = [12, 13, 14, 15, 16, 17, 18];
  const autoSaveIntervals = [10, 30, 60, 120, 300]; // 秒

  return (
    <>
      

      <div className="editor-config-page">
        <h1 className="page-title">{t("editor.title", "编辑器设置")}</h1>

        {/* 代码块主题：白天 + 夜晚 各一个选择器 */}
        <SettingSection
          title={t("editor.codeTheme.title", "代码块主题")}
          description={t(
            "editor.codeTheme.description",
            "为编辑器中的代码块分别配置浅色模式和深色模式下使用的语法高亮主题。"
          )}
        >
          <div className="setting-group">
            <div className="setting-row">
              <span className="setting-label">
                {t("editor.codeTheme.light", "浅色模式代码主题")}
              </span>
              <Select
                selectedKey={lightCodeTheme}
                onSelectionChange={(key) =>
                  dispatch(setEditorLightCodeTheme(String(key ?? "")))
                }
              >
                {codeThemes.map((opt) => (
                  <SelectItem key={opt.value} id={opt.value} textValue={opt.label}>
                    {opt.label}
                  </SelectItem>
                ))}
              </Select>
            </div>

            <div className="setting-row">
              <span className="setting-label">
                {t("editor.codeTheme.dark", "深色模式代码主题")}
              </span>
              <Select
                selectedKey={darkCodeTheme}
                onSelectionChange={(key) =>
                  dispatch(setEditorDarkCodeTheme(String(key ?? "")))
                }
              >
                {codeThemes.map((opt) => (
                  <SelectItem key={opt.value} id={opt.value} textValue={opt.label}>
                    {opt.label}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </div>
        </SettingSection>

        {/* 编辑器偏好 */}
        <SettingSection
          title={t("editor.preferences.title", "编辑器偏好")}
          description={t(
            "editor.preferences.description",
            "配置编辑器的外观和行为设置。"
          )}
        >
          <div className="setting-group">
            <div className="setting-row">
              <span className="setting-label">
                <LuSettings size={16} aria-hidden="true" />
                {t("editor.fontSize", "字体大小")}
              </span>
              <Select
                style={{ width: "100px" }}
                selectedKey={fontSize}
                onSelectionChange={(key) =>
                  dispatch(setEditorFontSize(Number(key)))
                }
              >
                {fontSizes.map((s) => (
                  <SelectItem key={s} id={s} textValue={`${s}px`}>
                    {`${s}px`}
                  </SelectItem>
                ))}
              </Select>
            </div>

            <ShortcutToggle
              icon={<LuClock size={16} aria-hidden="true" />}
              label={t("editor.autoSave", "自动保存")}
              enabled={autoSave}
              onToggle={() => dispatch(toggleEditorAutoSave())}
            />

            {autoSave && (
              <div className="setting-row">
                <span className="setting-label">
                  {t("editor.autoSaveInterval", "自动保存间隔")}
                </span>
                <Select
                  style={{ width: "120px" }}
                  selectedKey={autoSaveInterval}
                  onSelectionChange={(key) =>
                    dispatch(setEditorAutoSaveInterval(Number(key)))
                  }
                >
                  {autoSaveIntervals.map((i) => {
                    const label =
                      i < 60
                        ? t("editor.autoSaveIntervalSeconds", "{{count}}秒", { count: i })
                        : t("editor.autoSaveIntervalMinutes", "{{count}}分钟", { count: i / 60 });
                    return (
                      <SelectItem key={i} id={i} textValue={label}>
                        {label}
                      </SelectItem>
                    );
                  })}
                </Select>
              </div>
            )}
          </div>
        </SettingSection>

        {/* 字数统计 */}
        <SettingSection
          title={t("editor.wordCount.title", "字数统计")}
          description={t(
            "editor.wordCount.description",
            "在编辑器底部显示实时字数、字符数和阅读时间统计。"
          )}
        >
          <ShortcutToggle
            icon={<LuHash size={16} aria-hidden="true" />}
            label={t("editor.wordCount.enable", "显示字数统计")}
            enabled={wordCountEnabled}
            onToggle={() => dispatch(toggleEditorWordCount())}
          />
        </SettingSection>

        {/* 文本快捷方式 */}
        <SettingSection
          title={t("editor.shortcuts.title", "文本快捷方式")}
          description={t(
            "editor.shortcuts.description",
            "在输入时自动将特定符号转换为格式化文本，例如输入 '-' 会创建一个列表项。"
          )}
        >
          <div className="shortcut-list">
            {shortcutItems.map((item) => (
              <ShortcutToggle
                key={item.key}
                icon={item.icon}
                label={item.label}
                enabled={shortcuts[item.key] ?? false}
                onToggle={() => dispatch(toggleEditorShortcut(item.key))}
              />
            ))}
          </div>
        </SettingSection>
      </div>
    </>
  );
};

export default EditorConfig;
