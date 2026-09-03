// packages/chat/web/AgentPickerControl.tsx
// 首页 QuickChat 与对话页 composer 共用的 agent 切换器：
// trigger 显示当前 agent 名，popover 列出可选 agent，点击切换。
// 支持 candidate 级元信息（收藏/自己创建/广场），用 badge 区分来源层。
// 首页可通过 defaultOption 提供「默认/自动」清空项。

import React, { memo, useMemo, useState } from "react";
import { DialogTrigger, Button as RACButton } from "react-aria-components";
import { LuBot, LuCheck, LuChevronDown, LuStar, LuUser, LuZap } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { Popover } from "render/web/ui/Popover";
import { useAppSelector } from "app/store";
import { useFetchData } from "app/hooks";
import { selectById } from "database/dbSlice";
import type { Agent } from "app/types";
import type { AgentPickerCandidate } from "../hooks/useAgentPickerCandidates";
import { applyBuiltinAgentRuntimeOverride } from "agent-runtime/builtinPlatformAgentConfigs";
import * as stylex from "@stylexjs/stylex";
import { agentPickerControlStyles as apStyles } from "./agentPickerControlStyles";
import { withLiteralClass } from "./withLiteralClass";
import "./chatStylexEscapeHatch.css";

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

/**
 * 实体缓存优先，未命中才拉取（popover 重挂载不重复请求）。
 *
 * 读出来的记录会套一层 `applyBuiltinAgentRuntimeOverride`：内置 agent 的
 * provider/model 由 catalog 托管，而数据库里存的可能是过期值（线上 nolo 的
 * model 就一直停在 kimi-k2.6，且刻意不迁移）。不套的话运行时跑的是新模型、
 * 列表里的副标题却写着旧型号——「用户看到的和实际跑的对不上」只修了一半。
 * 非内置 agent 原样返回（引用相等），不影响广场档与自建 agent。
 */
const useAgentEntity = (agentKey: string | null): Agent | undefined => {
  const cached = useAppSelector((state) =>
    agentKey
      ? (selectById(state as never, agentKey) as Agent | undefined)
      : undefined,
  );
  const { data: fetched } = useFetchData<Agent>(
    agentKey && !cached ? agentKey : null,
  );
  const agent = fetched ?? cached;
  // useMemo 只为引用稳定：DB 值过期期间 override 每次都会造新对象，将来若有人
  // 把返回值放进 memo 子组件的 props 或 useEffect deps，会平白多出失效。
  return useMemo(
    () => (agent && agentKey ? applyBuiltinAgentRuntimeOverride(agentKey, agent) : agent),
    [agentKey, agent],
  );
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
      {...stylex.props(apStyles.badge, apStyles.badgeFavorite)}
      aria-label={t("chat:favoriteAgent", "收藏")}
      title={t("chat:favoriteAgent", "收藏")}
    >
      <LuStar size={11} />
    </span>
  ) : candidate.isOwned ? (
    <span
      {...stylex.props(apStyles.badge, apStyles.badgeOwned)}
      aria-label={t("chat:myAgent", "我的")}
      title={t("chat:myAgent", "我的")}
    >
      <LuUser size={11} />
    </span>
  ) : (
    <span
      {...stylex.props(apStyles.badge, apStyles.badgePublic)}
      aria-label={t("ai:agentSquare", "广场")}
      title={t("ai:agentSquare", "广场")}
    >
      <LuBot size={11} />
    </span>
  );
  return (
    <li
      aria-current={isActive || undefined}
    >
      <button
        type="button"
        {...stylex.props(apStyles.itemBtn, isActive && apStyles.itemBtnActive)}
        onClick={() => onSelect(candidate.key)}
      >
        {badge}
        <span {...stylex.props(apStyles.itemText)}>
          <span {...stylex.props(apStyles.itemName)}>
            {agent?.name ?? candidate.key}
          </span>
          {(agent?.introduction || agent?.model) && (
            <span {...stylex.props(apStyles.itemIntro)}>
              {agent?.introduction || agent?.model}
            </span>
          )}
        </span>
        {isActive && (
          <span {...stylex.props(apStyles.itemCheck)} aria-hidden="true">
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

  return (
    <div
      {...withLiteralClass(className || "", apStyles.root)}
    >
      <DialogTrigger isOpen={open} onOpenChange={setOpen}>
        <RACButton
          {...withLiteralClass(
            "agent-picker__trigger",
            apStyles.trigger,
            open && apStyles.triggerOpen,
          )}
          aria-label={triggerAria}
        >
          <span {...stylex.props(apStyles.triggerIcon)} aria-hidden="true">
            {triggerIcon}
          </span>
          <span
            {...withLiteralClass("agent-picker__trigger-label", apStyles.triggerLabel)}
          >
            {triggerLabel}
          </span>
          <LuChevronDown
            size={12}
            {...stylex.props(apStyles.caret, open && apStyles.caretOpen)}
            aria-hidden="true"
          />
        </RACButton>
        <Popover
          placement="top start"
          offset={6}
          hideArrow
          {...withLiteralClass("nolo-select-popup select-popover", apStyles.popover)}
          style={{ width: 280, padding: 0 }}
        >
          {hint && <div {...stylex.props(apStyles.hint)}>{hint}</div>}
          <ul {...stylex.props(apStyles.list)}>
            {defaultOption && (
              <li
                aria-current={isDefaultActive || undefined}
              >
                <button
                  type="button"
                  {...stylex.props(
                    apStyles.itemBtn,
                    isDefaultActive && apStyles.itemBtnActive,
                  )}
                  onClick={() => handleSelect("")}
                >
                  <span
                    {...stylex.props(apStyles.badge, apStyles.badgeDefault)}
                    aria-hidden="true"
                  >
                    <LuZap size={11} />
                  </span>
                  <span {...stylex.props(apStyles.itemText)}>
                    <span {...stylex.props(apStyles.itemName)}>
                      {defaultOption.label}
                    </span>
                    {defaultOption.description && (
                      <span {...stylex.props(apStyles.itemIntro)}>
                        {defaultOption.description}
                      </span>
                    )}
                  </span>
                  {isDefaultActive && (
                    <span {...stylex.props(apStyles.itemCheck)} aria-hidden="true">
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
            <div {...stylex.props(apStyles.empty)}>
              {t("chat:noAvailableAgents", "暂无可用 Agent")}
            </div>
          )}
        </Popover>
      </DialogTrigger>
    </div>
  );
};

export const AgentPickerControl = memo(AgentPickerControlBase);
