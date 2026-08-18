import React from "react";
// Prevent esbuild from tree-shaking React which causes runtime "React is not defined" errors
const _unusedReact = React;
import Avatar from "render/web/ui/Avatar";
import { resolveAvatarUrl } from "ai/agent/avatarUtils";
import { useAgentModelAvatarComponent } from "./useAgentModelAvatarComponent";
import { useImageLoadFallback } from "app/hooks/useImageLoadFallback";
import { useAppSelector } from "app/store";
import { selectCurrentServer } from "app/settings/settingSlice";
import { useHasMounted } from "app/hooks/useHasMounted";

export interface AgentAvatarProps {
  agent: {
    name?: string;
    avatarFileId?: string | null;
    model?: string;
    provider?: string;
    cliProvider?: string;
    authorityServer?: string | null;
    originServer?: string | null;
  };
  size?: number;
  avatarSize?: "small" | "medium" | "large" | "xlarge" | "xxlarge";
  className?: string;
}

export const AgentAvatar: React.FC<AgentAvatarProps> = ({
  agent,
  size = 40,
  avatarSize = "large",
  className = "agent__avatar-img",
}) => {
  const currentServer = useAppSelector(selectCurrentServer);
  const server = agent.authorityServer || agent.originServer || currentServer;
  const hasMounted = useHasMounted();
  const customAvatarUrl = resolveAvatarUrl(agent.avatarFileId, hasMounted ? server : null);

  const {
    shouldRenderImage: shouldRenderCustomAvatar,
    handleImageError: handleCustomAvatarError,
  } = useImageLoadFallback(customAvatarUrl);

  const modelAvatarStyle = useAgentModelAvatarComponent({
    cliProvider: agent.cliProvider,
    model: agent.model,
    provider: agent.provider,
  });

  if (shouldRenderCustomAvatar && customAvatarUrl) {
    return (
      <img
        src={customAvatarUrl}
        alt={agent.name || ""}
        className={className}
        style={{ width: size, height: size, objectFit: "cover" }}
        onError={handleCustomAvatarError}
      />
    );
  }

  if (modelAvatarStyle) {
    const ModelAvatar = modelAvatarStyle;
    return <ModelAvatar size={size} />;
  }

  return (
    <Avatar
      name={agent.name}
      type="agent"
      size={avatarSize}
      className={className}
      style={{ width: size, height: size }}
    />
  );
};

export default AgentAvatar;
