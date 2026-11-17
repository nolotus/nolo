import React from "react";
import { useTranslation } from "react-i18next";
import * as stylex from "@stylexjs/stylex";
import type { Agent } from "app/types";
import { useFetchData } from "app/hooks";
import { useCouldEdit, useToken } from "identity";
import AgentAvatar from "./AgentAvatar";
import AgentQuotaPanel from "./AgentQuotaPanel";
import type { AgentQuota } from "ai/agent/quotaSnapshot";
import { resolveAgentRuntimeConfigFromRecord } from "agent-runtime/agentRecordConfig";
import { applyBuiltinAgentRuntimeOverride } from "agent-runtime/builtinPlatformAgentConfigs";
import { clampReasoningEffort } from "ai/llm/reasoningModels";

import { dialogAgentSummaryStyles as styles } from "./dialogAgentSummaryStyles";

/** Key the instance by identity so a late record never paints the previous agent. */
type Props = {
  agentKey: string;
  builtinAgent?: Agent | null;
  serverOrigin: string;
};

export function DialogAgentSummary(props: Props) {
  return <DialogAgentSummaryIdentity key={props.agentKey} {...props} />;
}

function DialogAgentSummaryIdentity({ agentKey, builtinAgent, serverOrigin }: Props) {
  const { t } = useTranslation("chat");
  const { data } = useFetchData<Agent>(builtinAgent ? null : agentKey);
  const record = builtinAgent ?? data;
  const agent = record ? applyBuiltinAgentRuntimeOverride(agentKey, record) : undefined;
  // Preserve AgentPage's quota visibility boundary; never probe once per card.
  const canEdit = useCouldEdit(agentKey);
  const token = useToken();
  const runtimeConfig = agent
    ? resolveAgentRuntimeConfigFromRecord(agentKey, agent as unknown as Record<string, unknown>)
    : null;
  const effort = clampReasoningEffort(runtimeConfig?.reasoning_effort, runtimeConfig?.provider, runtimeConfig?.model);
  const reasoningLabel = effort
    ? t("childRunObserver.reasoningConfigured", { effort })
    : runtimeConfig?.reasoning_effort
      ? t("childRunObserver.reasoningUnsupported")
      : t("childRunObserver.reasoningUnspecified");
  return (
    <div>
      <div {...stylex.props(styles.identity)}>
        <AgentAvatar agent={agent ?? { name: agentKey }} size={32} avatarSize="small" />
        <div {...stylex.props(styles.text)}>
          <div {...stylex.props(styles.name)}>{agent?.name || agentKey}</div>
          <div {...stylex.props(styles.meta)}>{agent?.model || t("childRunObserver.modelUnknown")}</div>
          <div {...stylex.props(styles.meta)}>
            {reasoningLabel}
          </div>
        </div>
      </div>
      {canEdit && agent && token && serverOrigin ? (
        <AgentQuotaPanel
          snapshotOnly
          agentKey={agentKey}
          serverOrigin={serverOrigin}
          authToken={token}
          initialQuota={(agent as Agent & { quota?: AgentQuota }).quota}
          model={agent.model}
        />
      ) : null}
    </div>
  );
}
