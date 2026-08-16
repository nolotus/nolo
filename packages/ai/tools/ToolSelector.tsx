// 文件路径: ai/tools/ToolSelector.tsx

import "./styles.css";
import type React from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  toolDescriptions,
  toolDefinitionsByName,
  type ToolUiGroup,
  TOOL_GROUP_META,
} from "ai/tools";
import { isToolVisibleInUi } from "ai/tools/toolVisibility";
import { TOOL_PACKS, FORCED_TOOLS } from "ai/tools/toolPacks";
import { Checkbox } from "render/web/form/Checkbox";
import {
  LuSettings,
  LuFileText,
  LuImage,
  LuDatabase,
  LuBot,
  LuGlobe,
} from "react-icons/lu";

type ToolSelectorProps = {
  value: string[];
  onChange: (selectedToolIds: string[]) => void;
  className?: string;
  /** Tools the creator explicitly disabled — shown unchecked with a "disabled" state. */
  disabledTools?: string[];
  /** Called when a default-injected tool is toggled off (added to disabledTools). */
  onDisabledToolsChange?: (disabledTools: string[]) => void;
};

type ToolOption = {
  id: string; // schema.name
  nameKey: string;
  descriptionKey: string;
  group: ToolUiGroup;
};

type GroupedOptions = Record<ToolUiGroup, ToolOption[]>;

// 分组顺序：按照 TOOL_GROUP_META 的 order
const GROUP_ORDER: ToolUiGroup[] = TOOL_GROUP_META.slice()
  .sort((a, b) => a.order - b.order)
  .map((g) => g.id);

// 分组显示标题：目前直接使用 TOOL_GROUP_META.label
const GROUP_LABEL: Record<ToolUiGroup, string> = TOOL_GROUP_META.reduce(
  (acc, g) => {
    acc[g.id] = g.label;
    return acc;
  },
  {} as Record<ToolUiGroup, string>
);

// 每个分组对应的图标（UI 专用）
const GROUP_ICON: Record<ToolUiGroup, React.ComponentType<{ size?: number }>> =
{
  general: LuSettings,
  agent: LuBot,
  content: LuFileText,
  media: LuImage, // 图片 / 视频统一归为多媒体
  data: LuDatabase,
  external: LuGlobe,
};

/**
 * 兜底分组规则（当定义中未提供 uiGroup 时使用）
 * 根据工具的 category，在 TOOL_GROUP_META 的 fallbackCategories 中找匹配。
 */
const inferGroupFromCategory = (category?: string): ToolUiGroup => {
  if (!category) return "general";

  const matched = TOOL_GROUP_META.find((g) =>
    g.fallbackCategories?.includes(category)
  );

  return matched?.id ?? "general";
};

/**
 * 将 toolDescriptions / toolDefinitionsByName 转换成按分组的 options
 * 分组信息完全由 TOOL_GROUP_META 决定，避免分组配置散落在多个文件。
 */
const buildGroupedOptions = (): GroupedOptions => {
  // 初始化所有分组的 bucket
  const grouped = TOOL_GROUP_META.reduce(
    (acc, g) => {
      acc[g.id] = [];
      return acc;
    },
    {} as GroupedOptions
  );

  Object.entries(toolDescriptions).forEach(([id, info]) => {
    if (!isToolVisibleInUi(id)) return;
    const def = toolDefinitionsByName[id];
    const rawGroup: ToolUiGroup =
      (def?.uiGroup as ToolUiGroup | undefined) ??
      inferGroupFromCategory((info as any).category);

    // 再做一层兜底，防止未来 uiGroup 写错时崩溃
    const safeGroup: ToolUiGroup = (grouped as any)[rawGroup]
      ? rawGroup
      : "general";

    const option: ToolOption = {
      id,
      nameKey: info.name,
      descriptionKey: info.description,
      group: safeGroup,
    };

    grouped[safeGroup].push(option);
  });

  // 分组内按名称排序，便于扫读
  GROUP_ORDER.forEach((group) => {
    grouped[group].sort((a, b) =>
      a.nameKey.localeCompare(b.nameKey, "zh-Hans")
    );
  });

  return grouped;
};

/**
 * 样式：BEM + CSS 变量 + 响应式
 */

/**
 * Default-injected tools shown as pre-checked in the UI. These are the tools
 * the runtime auto-injects (CORE + LIGHT_WEB) minus FORCED_TOOLS (which are
 * always on and cannot be toggled off). When a user unchecks one, it moves to
 * disabledTools rather than being removed from the agent's explicit tools list.
 */
const DEFAULT_INJECTED_TOOLS = new Set<string>([
  ...TOOL_PACKS.CORE,
  ...TOOL_PACKS.LIGHT_WEB,
].filter((name) => !(FORCED_TOOLS as readonly string[]).includes(name)));

const FORCED_TOOL_SET = new Set<string>(FORCED_TOOLS);

export const ToolSelector: React.FC<ToolSelectorProps> = ({
  value = [],
  onChange,
  className = "",
  disabledTools = [],
  onDisabledToolsChange,
}) => {
  const { t } = useTranslation();
  const groupedOptions = useMemo(() => buildGroupedOptions(), []);

  const handleToolToggle = (toolId: string, isChecked: boolean) => {
    // Default-injected tools: toggling moves between "default on" and "disabled".
    // Explicit tools: toggling adds/removes from value.
    if (DEFAULT_INJECTED_TOOLS.has(toolId)) {
      if (isChecked) {
        // Re-enable: remove from disabledTools
        onDisabledToolsChange?.(disabledTools.filter((id) => id !== toolId));
      } else {
        // Disable: add to disabledTools (if not already there)
        if (!disabledTools.includes(toolId)) {
          onDisabledToolsChange?.([...disabledTools, toolId]);
        }
      }
      return;
    }
    const newSelectedTools = isChecked
      ? [...value, toolId]
      : value.filter((id) => id !== toolId);
    onChange(newSelectedTools);
  };

  // A tool is "checked" if it's explicitly selected OR default-injected (and not disabled).
  const isToolChecked = (toolId: string): boolean => {
    if (FORCED_TOOL_SET.has(toolId)) return true; // forced tools always checked, read-only
    if (value.includes(toolId)) return true;
    if (DEFAULT_INJECTED_TOOLS.has(toolId) && !disabledTools.includes(toolId)) return true;
    return false;
  };

  return (
    <>
      <div className={`agent-tools ${className}`}>
        {GROUP_ORDER.map((group) => {
          const options = groupedOptions[group];
          if (!options.length) return null;

          const Icon = GROUP_ICON[group];

          return (
            <section key={group} className="agent-tools__group">
              <header className="agent-tools__group-header">
                <span className="agent-tools__group-icon" aria-hidden="true">
                  <Icon size={16} />
                </span>
                <span className="agent-tools__group-title">
                  {GROUP_LABEL[group]}
                </span>
              </header>

              <div className="agent-tools__group-body">
                {options.map((tool) => {
                  const isChecked = isToolChecked(tool.id);
                  const isForced = FORCED_TOOL_SET.has(tool.id);
                  const isDefault = DEFAULT_INJECTED_TOOLS.has(tool.id);
                  return (
                    <label
                      key={tool.id}
                      className={
                        "agent-tools__item" +
                        (isChecked ? " agent-tools__item--selected" : "") +
                        (isDefault ? " agent-tools__item--default" : "")
                      }
                    >
                      <div className="agent-tools__item-header">
                        <Checkbox
                          id={`tool-${tool.id}`}
                          value={tool.id}
                          checked={isChecked}
                          disabled={isForced}
                          onChange={(e) =>
                            handleToolToggle(tool.id, e.target.checked)
                          }
                        />
                        <span className="agent-tools__item-name">
                          {t(tool.nameKey)}
                          {(isDefault || isForced) && (
                            <span className="agent-tools__item-badge">
                              {isForced ? "强制" : "默认"}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="agent-tools__item-description">
                        {t(tool.descriptionKey)}
                      </div>
                    </label>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
};

export default ToolSelector;
