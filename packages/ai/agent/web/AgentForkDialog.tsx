import React, { useState, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useAppDispatch } from "app/store";
import { useUserId } from "identity";
import { read } from "database/dbSlice";
import { createAgent } from "ai/agent/agentSlice";
import { toast } from "app/utils/toast";
import { addContentToSpace } from "create/space/spaceSlice";
import { useAllMemberSpaces } from "create/space/spaceMembershipStore";
import { selectCurrentServer } from "app/settings/settingSlice";
import { Dialog } from "render/web/ui/modal/Dialog";
import Button from "render/web/ui/Button";
import { buildForkAgentFormData } from "ai/agent/forkAgent";
import { getPublicAgentDbKey } from "ai/agent/publicAgentIdentity";
import { createAgentKey } from "database/keys";
import type { Agent } from "app/types";
import { ContentType } from "app/types";
import * as stylex from "@stylexjs/stylex";
import { agentForkDialogStyles as styles } from "./agentForkDialogStyles";

interface AgentForkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  agent: Agent;
}

/** undefined = 「全部（不放入空间）」；string = 放入指定 spaceId。 */
type ForkTarget = string | undefined;

/** 记录是否带非空系统提示词——summary 卡片会被剥掉 prompt。 */
const hasPrompt = (record: unknown): boolean =>
  !!record &&
  typeof record === "object" &&
  typeof (record as { prompt?: unknown }).prompt === "string" &&
  (record as { prompt: string }).prompt.trim().length > 0;

const AgentForkDialog: React.FC<AgentForkDialogProps> = ({
  isOpen,
  onClose,
  agent,
}) => {
  const { t } = useTranslation(["ai"]);
  const dispatch = useAppDispatch();
  const currentUserId = useUserId();
  const memberSpaces = useAllMemberSpaces();
  const currentServer = useSelector(selectCurrentServer);

  // 默认选中第一项「全部（不放入空间）」。
  const [target, setTarget] = useState<ForkTarget>(undefined);
  const [submitting, setSubmitting] = useState(false);
  // in-flight 守卫：防止用户连点导致重复提交（参考 AgentMoreActions syncInFlightRef）。
  const inFlightRef = useRef(false);

  // 空间选项：把 selectAllMemberSpaces 映射成 { id, name }。
  const spaceOptions = useMemo(
    () =>
      memberSpaces.map((ms) => ({
        id: ms.spaceId,
        name: ms.spaceName || ms.spaceId,
      })),
    [memberSpaces],
  );

  const handleClose = () => {
    // 请求进行中时不允许关闭，避免半截状态。
    if (submitting) return;
    setTarget(undefined);
    onClose();
  };

  const handleConfirm = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setSubmitting(true);
    try {
      // 1) 取完整公开记录。广场 summary 模式会剥掉 prompt 等字段（见
      //    publicAgentCatalog 的 CATALOG_SUMMARY_FIELDS），所以除非手上的记录
      //    本来就带 prompt（详情页等非 summary 场景），否则必须 read 一次。
      //    read 不到就中止 —— 静默用 summary 记录会创建出没有系统提示词的残废副本。
      let full: Agent = agent;
      if (!hasPrompt(agent)) {
        const lookupKey =
          agent.dbKey && agent.dbKey.trim()
            ? agent.dbKey
            : getPublicAgentDbKey(agent as any);
        if (!lookupKey) {
          toast.error(t("fork.failed", "复制失败，请稍后重试"));
          return;
        }
        const preferredServerOrigin =
          agent.authorityServer || agent.originServer || currentServer;
        let fetched: unknown;
        try {
          fetched = await dispatch(
            read({ dbKey: lookupKey, preferredServerOrigin })
          ).unwrap();
        } catch (err) {
          console.warn("[AgentForkDialog] read full agent record failed:", err);
          toast.error(t("fork.failed", "复制失败，请稍后重试"));
          return;
        }
        if (!hasPrompt(fetched)) {
          console.warn(
            "[AgentForkDialog] fetched record has no prompt:",
            lookupKey
          );
          toast.error(t("fork.failed", "复制失败，请稍后重试"));
          return;
        }
        full = fetched as Agent;
      }

      // 2) 构造 formData，不允许复制时提示并关闭。
      const formData = buildForkAgentFormData(full);
      if (!formData) {
        toast.error(t("fork.notAllowed", "这个 AI 不允许复制"));
        onClose();
        return;
      }

      // 3) 创建：spaceId 传 undefined = 「全部视图 / 不归属空间」。
      if (!currentUserId) {
        toast.error(t("fork.failed", "复制失败，请稍后重试"));
        return;
      }
      const createdAgent = await dispatch(
        createAgent({
          userId: currentUserId,
          // fork 产出的是「已裁剪的表单数据」，字段是 AgentFormData 的子集
          // （高级参数缺省时按约定不出现），故此处放宽类型。
          formData: formData as any,
          spaceId: target,
        }),
      ).unwrap();

      if (target) {
        const agentDbKey = createdAgent.isPublic
          ? createAgentKey.public(createdAgent.id)
          : createAgentKey.private(currentUserId, createdAgent.id);
        try {
          await dispatch(
            addContentToSpace({
              spaceId: target,
              title: createdAgent.name || "未命名智能体",
              type: ContentType.AGENT,
              contentKey: agentDbKey,
            })
          ).unwrap();
        } catch (err) {
          console.error("Failed to add agent to space sidebar:", err);
          toast.error(
            t(
              "fork.addToSpaceFailed",
              "已复制，但加入空间失败，可在「全部」里找到它"
            )
          );
        }
      }

      // 4) 成功提示并关闭。
      toast.success(t("fork.success", "已复制到你的 AI 列表"));
      onClose();
    } catch (err) {
      const message =
        err instanceof Error && err.message.trim()
          ? err.message
          : t("fork.failed", "复制失败，请稍后重试");
      toast.error(message);
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={t("fork.title", "复制这个 AI")}
      size="small"
      isActionDisabled={submitting}
      actions={
        <>
          <Button
            variant="secondary"
            size="medium"
            onClick={handleClose}
            disabled={submitting}
          >
            {t("cancel", "取消")}
          </Button>
          <Button
            variant="primary"
            size="medium"
            onClick={() => {
              void handleConfirm();
            }}
            loading={submitting}
            disabled={submitting}
          >
            {t("fork.confirm", "复制")}
          </Button>
        </>
      }
    >
      <div {...stylex.props(styles.body)}>
        <div {...stylex.props(styles.targetLabel)}>
          {t("fork.targetSpaceLabel", "放入空间")}
        </div>
        <ul {...stylex.props(styles.options)} role="radiogroup">
          <li {...stylex.props(styles.option)}>
            <label {...stylex.props(styles.optionLabel)}>
              <input
                {...stylex.props(styles.optionInput)}
                type="radio"
                name="fork-target"
                value=""
                checked={target === undefined}
                onChange={() => setTarget(undefined)}
                disabled={submitting}
              />
              <span>{t("fork.targetAll", "全部（不放入空间）")}</span>
            </label>
          </li>
          {spaceOptions.map((space) => (
            <li key={space.id} {...stylex.props(styles.option)}>
              <label {...stylex.props(styles.optionLabel)}>
                <input
                  {...stylex.props(styles.optionInput)}
                  type="radio"
                  name="fork-target"
                  value={space.id}
                  checked={target === space.id}
                  onChange={() => setTarget(space.id)}
                  disabled={submitting}
                />
                <span>{space.name}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
};

export default AgentForkDialog;