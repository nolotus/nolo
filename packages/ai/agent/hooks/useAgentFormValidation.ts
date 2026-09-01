// 路径: app/features/ai/agent/hooks/useAgentValidation.ts

import { useForm } from "form/useForm";
import { useCallback } from "react";
import { useAppDispatch } from "app/store";
import { useIdentity } from "identity";
import { useCreateDialog } from "chat/dialog/useCreateDialog";
import { createAgentKey } from "database/keys";
import { useTranslation } from "react-i18next";
import { useCurrentSpaceId } from "create/space/spaceCurrentStore";
import { useCurrentSpaceFromEntity } from "create/space/spaceCurrentSelectors";
import { addContentToSpace, updateContentTitle } from "create/space/content/contentThunks";
import {
  getCreateAgentSchema,
  FormData,
  normalizeReferences,
} from "../createAgentSchema";
import { createAgent, updateAgent } from "ai/agent/agentSlice";
import { ContentType } from "app/types";
import { DEFAULT_MODEL } from "ai/llm/providers";
import { markRecentlyCreated } from "chat/web/sidebar/recentlyCreatedStore";
import { asOptionalTrimmedString } from "core/optionalString";

type AgentEditIdentityInput = Partial<ExtendedFormData> & {
  dbKey?: string;
  contentKey?: string;
};

// extractAgentId 函数：兼容 id 是 `agent-<userId>-<id>` 路径或纯 id 的老数据
export const extractAgentId = (value: string): string => {
  const raw = value.trim();
  if (raw.startsWith("agent-")) {
    const parts = raw.split("-");
    if (parts.length >= 3) return parts.slice(2).join("-");
  }
  return raw;
};

// ExtendedFormData：在原有表单数据上加上一些 meta 字段
interface ExtendedFormData extends FormData {
  id?: string;
  createdAt?: number;
  dialogCount?: number;
  messageCount?: number;
  tokenCount?: number;
}

export const resolveAgentEditIdentity = (
  initialValues?: AgentEditIdentityInput
) => {
  const rawAgentKey =
    asOptionalTrimmedString(initialValues?.dbKey) ??
    asOptionalTrimmedString(initialValues?.contentKey);

  const rawAgentId =
    asOptionalTrimmedString(initialValues?.id) ?? rawAgentKey;

  const agentId = rawAgentId ? extractAgentId(rawAgentId) : undefined;

  return {
    agentKey: rawAgentKey,
    agentId,
    isEditing: Boolean(agentId),
  };
};

export const useAgentValidation = (initialValues?: ExtendedFormData) => {
  const dispatch = useAppDispatch();
  const { createNewDialog } = useCreateDialog();
  const { currentUser: user } = useIdentity();
  const { t } = useTranslation("ai");
  const currentSpaceId = useCurrentSpaceId();
  const currentSpace = useCurrentSpaceFromEntity();
  const { agentId: resolvedAgentId, isEditing } =
    resolveAgentEditIdentity(initialValues);

  const form = useForm<FormData>({
    schema: getCreateAgentSchema(t) as any,
    defaultValues: (isEditing && initialValues
      ? {
        ...initialValues,
        // 如果老数据里没有 apiSource，则默认 platform
        apiSource: initialValues.apiSource ?? "platform",
        machineId: (initialValues as any).machineId ?? (initialValues as any).runtimeBinding?.machineId ?? "",
        tags: Array.isArray(initialValues.tags)
          ? initialValues.tags.join(", ")
          : (initialValues.tags as any) || "",
        references: normalizeReferences(initialValues.references || []),
        whitelist: initialValues.whitelist || [],
      }
      : {
        greeting: t("form.defaults.greeting"),
        useServerProxy: true,
        isPublic: false,
        whitelist: [],
        // 新建时默认为平台 API
        apiSource: "platform",
        provider: DEFAULT_MODEL.provider,
        model: DEFAULT_MODEL.name,
        // avatarFileId 必须有初始值，否则 BasicInfoTab 用 setValue 写入后
        // 不会把未注册字段放进 submit data，导致头像上传后保存丢失
        avatarFileId: null,
      }) as FormData,
  });

  const onSubmit = useCallback(
    async (data: FormData) => {
      const effectiveUserId = user?.userId?.trim()
        ? user.userId.trim()
        : "local";

      // -------- 编辑模式：走 updateAgent thunk --------
      if (isEditing && resolvedAgentId && initialValues) {
        await dispatch(
          updateAgent({
            userId: effectiveUserId,
            agentId: resolvedAgentId,
            formData: data,
            previousAgent: initialValues as any,
          })
        ).unwrap();

        const contentKey = (initialValues as any).dbKey as string | undefined;
        const nextName = String(data.name ?? "").trim();
        const previousName = String(initialValues.name ?? "").trim();
        if (
          currentSpaceId &&
          contentKey &&
          currentSpace?.contents?.[contentKey] &&
          nextName &&
          nextName !== previousName
        ) {
          // spaceSlice export graph can make updateContentTitle uncallable under tsc;
          // cast keeps runtime behavior while the slice types are cleaned up.
          const titleAction = (
            updateContentTitle as unknown as (args: {
              spaceId: string;
              contentKey: string;
              title: string;
            }) => unknown
          )({
            spaceId: currentSpaceId,
            contentKey,
            title: nextName,
          });
          await (dispatch as any)(titleAction);
        }

        return;
      }

      // -------- 新建模式：走 createAgent thunk，并在成功后创建默认对话 --------
      const createdAgent = await dispatch(
        createAgent({
          userId: effectiveUserId,
          formData: data,
          spaceId: currentSpaceId || undefined, // 传入当前空间 ID
        })
      ).unwrap();

      const agentDbKey = createdAgent.isPublic
        ? createAgentKey.public(createdAgent.id)
        : createAgentKey.private(effectiveUserId, createdAgent.id);

      // Web create path only: flash sidebar row (pure JS store, no RN impact).
      markRecentlyCreated(agentDbKey);

      // 如果有当前空间，则将 Agent 添加到空间内容中，使其在侧边栏显示
      if (currentSpaceId) {
        try {
          await dispatch((addContentToSpace as any)({
            spaceId: currentSpaceId,
            title: createdAgent.name || "未命名智能体",
            type: ContentType.AGENT,
            contentKey: agentDbKey,
          })).unwrap();
        } catch (error) {
          console.error("Failed to add agent to space sidebar:", error);
        }
      }

      await createNewDialog({
        agents: [agentDbKey],
      });

      return { agentDbKey, credentialRef: createdAgent.credentialRef };
    },
    [
      user,
      isEditing,
      initialValues,
      resolvedAgentId,
      dispatch,
      createNewDialog,
      t,
      currentSpaceId,
      currentSpace,
    ]
  );

  return {
    form,
    provider: form.values.provider,
    useServerProxy: form.values.useServerProxy,
    isPublic: form.values.isPublic,
    onSubmit,
    isEditing,
  };
};
