import { memo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { LuMessageSquare } from "react-icons/lu";
import type { Agent } from "app/types";
import Button from "render/web/ui/Button";
import { useAgentDialog } from "ai/agent/hooks/useAgentDialog";
import { resolveDialogLaunchSpaceId } from "chat/dialog/dialogLaunchScope";

interface AgentCardActionsProps {
  item: Agent;
  /** Override the dialog space resolution (e.g. AgentBlock passes space-aware options). */
  dialogSpaceId?: string;
  /** Override the server origin for the agent dialog. */
  server?: string;
}

/**
 * Shared "开聊" (Quick Start) button used by AgentCard and AgentBlock.
 */
const AgentCardActions = memo(
  ({ item, dialogSpaceId: explicitSpaceId, server }: AgentCardActionsProps) => {
    const { t } = useTranslation(["ai"]);
    const agentKey = item.dbKey || item.id;

    const resolvedSpaceId =
      explicitSpaceId ??
      resolveDialogLaunchSpaceId({ recordSpaceId: item.spaceId });

    const { isStarting, startDialog } = useAgentDialog(agentKey, {
      spaceId: resolvedSpaceId,
      preferredServerOrigin: server,
    });

    const handleStartDialog = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        e.preventDefault();
        startDialog();
      },
      [startDialog]
    );

    return (
      <div className="agent__actions">
        <Button
          icon={<LuMessageSquare size={16} aria-hidden="true" />}
          onClick={handleStartDialog}
          disabled={isStarting}
          loading={isStarting}
          size="medium"
          className="agent__primary"
        >
          {isStarting ? t("starting") : t("quickStart", "开聊")}
        </Button>
      </div>
    );
  }
);

AgentCardActions.displayName = "AgentCardActions";

export default AgentCardActions;