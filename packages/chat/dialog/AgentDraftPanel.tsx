import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "app/routing";
import {
  LuArrowRight,
  LuBookOpen,
  LuBot,
  LuCheck,
  LuFileText,
  LuFlaskConical,
  LuMessageSquarePlus,
  LuGlobe,
  LuLock,
  LuRoute,
  LuWrench,
  LuX,
} from "react-icons/lu";
import { useAppDispatch, useAppSelector } from "app/store";
import {
  handleSendMessage,
  useCurrentDialogKey,
} from "chat/dialog/dialogSlice";
import type { GuidedAgentDraft } from "ai/agent/guidedCreation/types";
import { getGuidedCapabilityLabels } from "ai/agent/guidedCreation/capabilityPresentation";
import type { Agent } from "app/types";
import { useAgentDialog } from "ai/agent/hooks/useAgentDialog";
import { resolveAgentCardDialogKey } from "chat/messages/web/resolveAgentCardDialogKey";
import { asNonEmptyStringArray } from "core/stringArray";
import "./AgentDraftPanel.css";

interface AgentDraftPanelProps {
  initialDraft: GuidedAgentDraft;
  version?: number | null;
  createdAgent?: Partial<Agent> | null;
  onClose: () => void;
}

const buildConfirmMessage = (draft: GuidedAgentDraft) =>
  [
    `确认创建这个 AI：${draft.name || "未命名 AI"}`,
    "请使用下面这份刚确认的草稿配置调用 createAgent，不要再要求我重复描述。",
    "注意：assemblyNotes、suggestedSkillIdeas、suggestedWorkflowIdeas、suggestedEvalCases 只服务创建 UI 和下一步建议；除非我另行确认创建 skill/workflow/eval 资产，不要把它们写入 Agent record。",
    "```json",
    JSON.stringify(draft, null, 2),
    "```",
  ].join("\n");

const splitCapabilityText = (value: string) =>
  value.split(",").flatMap((item) => {
    const trimmed = item.trim();
    return trimmed ? [trimmed] : [];
  });

const AssemblySection = ({
  icon,
  title,
  items,
  empty,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  empty: string;
}) => (
  <div className="AgentDraftPanel__assemblySection">
    <div className="AgentDraftPanel__assemblySectionTitle">
      {icon}
      <span>{title}</span>
    </div>
    {items.length > 0 ? (
      <ul>
        {items.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    ) : (
      <p>{empty}</p>
    )}
  </div>
);

export const AgentDraftPanel: React.FC<AgentDraftPanelProps> = ({
  initialDraft,
  version = null,
  createdAgent = null,
  onClose,
}) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const currentDialogKey = useCurrentDialogKey();
  const createdAgentKey = createdAgent
    ? resolveAgentCardDialogKey(createdAgent)
    : "";
  const { isStarting, startDialog } = useAgentDialog(createdAgentKey);
  const [isConfirming, setIsConfirming] = useState(false);
  const [name, setName] = useState(initialDraft.name || "");
  const [introduction, setIntroduction] = useState(
    initialDraft.introduction || ""
  );
  const [prompt, setPrompt] = useState(initialDraft.prompt || "");
  const [isPublic, setIsPublic] = useState(!!initialDraft.isPublic);
  const [capabilityText, setCapabilityText] = useState(
    Array.isArray(initialDraft.capabilityIds)
      ? initialDraft.capabilityIds.join(", ")
      : ""
  );

  useEffect(() => {
    setName(initialDraft.name || "");
    setIntroduction(initialDraft.introduction || "");
    setPrompt(initialDraft.prompt || "");
    setIsPublic(!!initialDraft.isPublic);
    setCapabilityText(
      Array.isArray(initialDraft.capabilityIds)
        ? initialDraft.capabilityIds.join(", ")
        : ""
    );
  }, [initialDraft]);

  const updatedDraft = useMemo<GuidedAgentDraft>(
    () => ({
      ...initialDraft,
      name,
      introduction,
      prompt,
      isPublic,
      capabilityIds: splitCapabilityText(capabilityText) as any,
    }),
    [capabilityText, initialDraft, introduction, isPublic, name, prompt]
  );
  const isDirty = useMemo(() => {
    const initialCapabilityText = Array.isArray(initialDraft.capabilityIds)
      ? initialDraft.capabilityIds.join(", ")
      : "";
    return (
      name !== (initialDraft.name || "") ||
      introduction !== (initialDraft.introduction || "") ||
      prompt !== (initialDraft.prompt || "") ||
      isPublic !== !!initialDraft.isPublic ||
      capabilityText !== initialCapabilityText
    );
  }, [capabilityText, initialDraft, introduction, isPublic, name, prompt]);

  const isCreated = !!createdAgentKey;
  const capabilityLabels = getGuidedCapabilityLabels(
    splitCapabilityText(capabilityText)
  );
  const selectedReferences = Array.isArray(updatedDraft.references)
    ? updatedDraft.references.flatMap((reference) => {
        if (reference.selected !== true) return [];
        const label = reference.title || reference.dbKey;
        return label ? [label] : [];
      })
    : [];
  const toolItems = Array.from(new Set(updatedDraft.toolIds ?? [])).filter(Boolean);
  const assemblyNotes = asNonEmptyStringArray(updatedDraft.assemblyNotes);
  const suggestedSkillIdeas = asNonEmptyStringArray(updatedDraft.suggestedSkillIdeas);
  const suggestedWorkflowIdeas = asNonEmptyStringArray(updatedDraft.suggestedWorkflowIdeas);
  const suggestedEvalCases = asNonEmptyStringArray(updatedDraft.suggestedEvalCases);
  const promptItems = [
    updatedDraft.promptSummary || prompt.slice(0, 120),
    ...assemblyNotes,
  ].filter(Boolean);
  const reusableAbilityItems = [...suggestedSkillIdeas, ...suggestedWorkflowIdeas];
  const isImageCompressionAgent =
    updatedDraft.capabilityIds?.includes("imageProcessing") ||
    (updatedDraft.toolIds?.includes("execShell") &&
      /压缩图片|图片压缩|compress image|reduce image size/i.test(
        `${updatedDraft.name} ${updatedDraft.introduction} ${updatedDraft.prompt}`
      ));
  const createdHint = isImageCompressionAgent
    ? "上传图片后，它会自动压缩并返回结果。"
    : "直接开始用；我会根据这个 Agent 自动处理需要的能力。";
  const confirmDisabled = isCreated
    ? isStarting
    : !currentDialogKey || isConfirming;
  const confirmTitle = isCreated
    ? "Agent 已创建，可以开始对话"
    : !currentDialogKey
    ? "当前对话尚未准备好，无法创建"
    : undefined;

  const handleConfirm = async () => {
    const dialogKey = currentDialogKey;
    if (!dialogKey || isConfirming) return;
    setIsConfirming(true);
    try {
      await (dispatch as any)(
        handleSendMessage({
          dialogKey,
          userInput: buildConfirmMessage(updatedDraft),
        })
      ).unwrap?.();
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <aside className="AgentDraftPanel" aria-label="Agent 配置草稿">
      <div className="AgentDraftPanel__header">
        <div className="AgentDraftPanel__titleWrap">
          <div className="AgentDraftPanel__title">
            <LuBot size={18} aria-hidden="true" />
            <span>
              {isCreated
                ? "Agent 已创建"
                : version
                ? `Agent 草稿 v${version}`
                : "Agent 草稿"}
            </span>
          </div>
          {isCreated ? (
            <span className="AgentDraftPanel__createdState">可以开始使用</span>
          ) : isDirty ? (
            <span className="AgentDraftPanel__dirtyState">已本地修改</span>
          ) : null}
        </div>
        <button
          type="button"
          className="AgentDraftPanel__iconButton"
          onClick={onClose}
          aria-label="关闭草稿面板"
        >
          <LuX size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="AgentDraftPanel__body">
        <label className="AgentDraftPanel__field">
          <span>名称</span>
          <input
            value={name}
            disabled={isCreated}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label className="AgentDraftPanel__field">
          <span>简介</span>
          <textarea
            value={introduction}
            disabled={isCreated}
            onChange={(event) => setIntroduction(event.target.value)}
            rows={3}
          />
        </label>

        <label className="AgentDraftPanel__field">
          <span>Prompt</span>
          <textarea
            value={prompt}
            disabled={isCreated}
            onChange={(event) => setPrompt(event.target.value)}
            rows={9}
          />
        </label>

        <div className="AgentDraftPanel__field">
          <span>能力</span>
          {capabilityLabels.length > 0 && (
            <div className="AgentDraftPanel__capabilityPills" aria-label="已选择能力">
              {capabilityLabels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          )}
          <details className="AgentDraftPanel__technicalDetails">
            <summary>高级技术标识</summary>
            <input
              value={capabilityText}
              disabled={isCreated}
              onChange={(event) => setCapabilityText(event.target.value)}
              aria-label="能力技术标识"
              placeholder="用英文逗号分隔技术标识"
            />
          </details>
        </div>

        <details className="AgentDraftPanel__assembly" open={!isCreated}>
          <summary>能力装配</summary>
          <div className="AgentDraftPanel__assemblyGrid">
            <AssemblySection
              icon={<LuFileText size={14} aria-hidden="true" />}
              title="指令"
              items={promptItems}
              empty="当前草稿还没有 prompt 摘要。"
            />
            <AssemblySection
              icon={<LuBookOpen size={14} aria-hidden="true" />}
              title="知识"
              items={selectedReferences}
              empty="没有已确认挂载的知识引用。"
            />
            <AssemblySection
              icon={<LuWrench size={14} aria-hidden="true" />}
              title="工具"
              items={toolItems}
              empty="没有已确认启用的工具。"
            />
            <AssemblySection
              icon={<LuRoute size={14} aria-hidden="true" />}
              title="可沉淀能力"
              items={reusableAbilityItems}
              empty="没有待沉淀的 skill/workflow 建议。"
            />
            <AssemblySection
              icon={<LuFlaskConical size={14} aria-hidden="true" />}
              title="评估"
              items={suggestedEvalCases}
              empty="没有 eval case 草稿。"
            />
          </div>
        </details>

        <div className="AgentDraftPanel__field">
          <span>可见性</span>
          <div className="AgentDraftPanel__toggleGroup">
            <button
              type="button"
              className={!isPublic ? "is-active" : ""}
              disabled={isCreated}
              onClick={() => setIsPublic(false)}
            >
              <LuLock size={14} aria-hidden="true" />
              私有
            </button>
            <button
              type="button"
              className={isPublic ? "is-active" : ""}
              disabled={isCreated}
              onClick={() => setIsPublic(true)}
            >
              <LuGlobe size={14} aria-hidden="true" />
              公开
            </button>
          </div>
        </div>
      </div>

      <div className="AgentDraftPanel__footer">
        {isCreated && (
          <div className="AgentDraftPanel__nextSteps" aria-label="创建后自动能力提示">
            <span>已准备好</span>
            <p>{createdHint}</p>
          </div>
        )}
        <button
          type="button"
          className="AgentDraftPanel__primary"
          onClick={isCreated ? () => startDialog() : handleConfirm}
          disabled={confirmDisabled}
          title={confirmTitle}
          aria-label={isCreated ? "开始和已创建 Agent 对话" : confirmTitle || "确认创建 Agent"}
        >
          {isCreated ? <LuMessageSquarePlus size={16} aria-hidden="true" /> : <LuCheck size={16} aria-hidden="true" />}
          {isCreated ? (isStarting ? "正在打开" : "开始和它对话") : isConfirming ? "正在确认" : "确认创建"}
        </button>
        <button
          type="button"
          className="AgentDraftPanel__secondary"
          onClick={() =>
            navigate("/create/agent", {
              state: { initialDraft: isCreated ? createdAgent : updatedDraft },
            })
          }
        >
          {isCreated ? "查看 Agent 配置" : "高级编辑"}
          <LuArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
};
