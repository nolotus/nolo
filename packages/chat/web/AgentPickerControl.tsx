// packages/chat/web/AgentPickerControl.tsx
// 首页 QuickChat 与对话页 composer 共用的 agent 切换器：
// trigger 显示当前 agent 名，popover 列出可选 agent，点击切换。
// 支持 candidate 级元信息（收藏/自己创建/广场），用 badge 区分来源层。
// 首页可通过 defaultOption 提供「默认/自动」清空项。

import React, { memo, useState } from "react";
import { DialogTrigger, Button as RACButton } from "react-aria-components";
import { LuBot, LuCheck, LuChevronDown, LuStar, LuUser, LuZap } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { Popover } from "render/web/ui/Popover";
import { useAppSelector } from "app/store";
import { useFetchData } from "app/hooks";
import { selectById } from "database/dbSlice";
import type { Agent } from "app/types";
import type { AgentPickerCandidate } from "../hooks/useAgentPickerCandidates";
import "./AgentPickerControl.css";

export type AgentPickerDefaultOption = {
  /** 列表行与空选态 trigger 标签，例如「默认」「自动」。 */
  label: string;
  /** 可选副标题。 */
  description?: string;
};

export type AgentPickerControlProps = {
  /** 有序候选列表（收藏 → 自己 → 广场），由 useAgentPickerCandidates 聚合。 */
  candidates: AgentPickerCandidate[];
  /** 当前选中；null/空串表示未选（配合 defaultOption 显示默认项）。 */
  activeAgentKey: string | null;
  onSelect: (agentKey: string) => void;
  /** 可选：列表顶部「默认/自动」行，选中时 onSelect("")。 */
  defaultOption?: AgentPickerDefaultOption;
  /** 弹层顶部提示文案。 */
  hint?: string;
  /** 空选态 trigger 回退标签（无 defaultOption 时使用）。 */
  placeholderLabel?: string;
  /** trigger 无障碍名称；默认「切换助手」。 */
  ariaLabel?: string;
  /** 根节点附加 class，便于首页 surface 尺寸覆盖。 */
  className?: string;
};

/** 实体缓存优先，未命中才拉取（popover 重挂载不重复请求）。 */
const useAgentEntity = (agentKey: string | null): Agent | undefined => {
  const cached = useAppSelector((state) =>
    agentKey
      ? (selectById(state as never, agentKey) as Agent | undefined)
      : undefined,
  );
  const { data: fetched } = useFetchData<Agent>(
    agentKey && !cached ? agentKey : null,
  );
  return fetched ?? cached;
};

const AgentPickerItem: React.FC<{
  candidate: AgentPickerCandidate;
  isActive: boolean;
  onSelect: (agentKey: string) => void;
}> = ({ candidate, isActive, onSelect }) => {
  const { t } = useTranslation(["chat", "ai"]);
  const agent = useAgentEntity(candidate.key);
  // 来源层 badge：收藏优先，其次自己创建，否则广场
  const badge = candidate.isFavorite ? (
    <span
      className="agent-picker__item-badge is-favorite"
      aria-label={t("chat:favoriteAgent", "收藏")}
      title={t("chat:favoriteAgent", "收藏")}
    >
      <LuStar size={11} />
    </span>
  ) : candidate.isOwned ? (
    <span
      className="agent-picker__item-badge is-owned"
      aria-label={t("chat:myAgent", "我的")}
      title={t("chat:myAgent", "我的")}
    >
      <LuUser size={11} />
    </span>
  ) : (
    <span
      className="agent-picker__item-badge is-public"
      aria-label={t("ai:agentSquare", "广场")}
      title={t("ai:agentSquare", "广场")}
    >
      <LuBot size={11} />
    </span>
  );
  return (
    <li
      className={`agent-picker__item${isActive ? " is-active" : ""}`}
      aria-current={isActive || undefined}
    >
      <button type="button" onClick={() => onSelect(candidate.key)}>
        {badge}
        <span className="agent-picker__item-text">
          <span className="agent-picker__item-name">
            {agent?.name ?? candidate.key}
          </span>
          {(agent?.introduction || agent?.model) && (
            <span className="agent-picker__item-intro">
              {agent?.introduction || agent?.model}
            </span>
          )}
        </span>
        {isActive && (
          <span className="agent-picker__item-check" aria-hidden="true">
            <LuCheck size={14} />
          </span>
        )}
      </button>
    </li>
  );
};

const AgentPickerControlBase: React.FC<AgentPickerControlProps> = ({
  candidates,
  activeAgentKey,
  onSelect,
  defaultOption,
  hint,
  placeholderLabel,
  ariaLabel,
  className,
}) => {
  const { t } = useTranslation(["chat", "ai"]);
  const [open, setOpen] = useState(false);
  const normalizedActiveKey =
    typeof activeAgentKey === "string" && activeAgentKey.trim()
      ? activeAgentKey.trim()
      : null;
  const activeAgent = useAgentEntity(normalizedActiveKey);
  const isDefaultActive = normalizedActiveKey == null;

  if (candidates.length === 0 && !defaultOption) return null;

  const fallbackLabel =
    placeholderLabel ?? t("chat:selectAssistant", "选择助手");
  const triggerLabel = isDefaultActive
    ? (defaultOption?.label ?? fallbackLabel)
    : (activeAgent?.name ?? fallbackLabel);
  const triggerIcon = isDefaultActive && defaultOption ? (
    <LuZap size={14} aria-hidden="true" />
  ) : (
    <LuBot size={14} aria-hidden="true" />
  );
  const triggerAria =
    ariaLabel ??
    (isDefaultActive
      ? `${t("chat:switchAssistant", "切换助手")}：${triggerLabel}`
      : `${t("chat:switchAssistant", "切换助手")}：${triggerLabel}`);

  const handleSelect = (agentKey: string) => {
    setOpen(false);
    if (agentKey !== (normalizedActiveKey ?? "")) onSelect(agentKey);
  };

  const rootClass = ["agent-picker", open ? "is-open" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass}>
      <DialogTrigger isOpen={open} onOpenChange={setOpen}>
        <RACButton
          className="agent-picker__trigger"
          aria-label={triggerAria}
        >
          <span className="agent-picker__trigger-icon" aria-hidden="true">
            {triggerIcon}
          </span>
          <span className="agent-picker__trigger-label">{triggerLabel}</span>
          <LuChevronDown
            size={12}
            className="agent-picker__trigger-caret"
            aria-hidden="true"
          />
        </RACButton>
        <Popover
          placement="top start"
          offset={6}
          hideArrow
          className="agent-picker__popover nolo-select-popup select-popover"
          style={{ width: 280, padding: 0 }}
        >
          {hint && <div className="agent-picker__hint">{hint}</div>}
          <ul className="agent-picker__list">
            {defaultOption && (
              <li
                className={`agent-picker__item${isDefaultActive ? " is-active" : ""}`}
                aria-current={isDefaultActive || undefined}
              >
                <button type="button" onClick={() => handleSelect("")}>
                  <span
                    className="agent-picker__item-badge is-default"
                    aria-hidden="true"
                  >
                    <LuZap size={11} />
                  </span>
                  <span className="agent-picker__item-text">
                    <span className="agent-picker__item-name">
                      {defaultOption.label}
                    </span>
                    {defaultOption.description && (
                      <span className="agent-picker__item-intro">
                        {defaultOption.description}
                      </span>
                    )}
                  </span>
                  {isDefaultActive && (
                    <span className="agent-picker__item-check" aria-hidden="true">
                      <LuCheck size={14} />
                    </span>
                  )}
                </button>
              </li>
            )}
            {candidates.map((candidate) => (
              <AgentPickerItem
                key={candidate.key}
                candidate={candidate}
                isActive={candidate.key === normalizedActiveKey}
                onSelect={handleSelect}
              />
            ))}
          </ul>
          {candidates.length === 0 && defaultOption && (
            <div className="agent-picker__empty">
              {t("chat:noAvailableAgents", "暂无可用 Agent")}
            </div>
          )}
        </Popover>
      </DialogTrigger>
    </div>
  );
};

export const AgentPickerControl = memo(AgentPickerControlBase);
