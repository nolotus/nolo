import { useEffect, useState } from "react";

import { getModelAvatarComponent } from "ai/llm/modelAvatar";

export const useAgentModelAvatarComponent = ({
  cliProvider,
  model,
  provider,
}: {
  cliProvider?: string;
  model?: string;
  provider?: string;
}) => {
  const [modelAvatarStyle, setModelAvatarStyle] = useState<Awaited<
    ReturnType<typeof getModelAvatarComponent>
  > | null>(null);

  useEffect(() => {
    let cancelled = false;
    setModelAvatarStyle(null);
    getModelAvatarComponent(provider, model, cliProvider).then((avatar) => {
      if (!cancelled) {
        setModelAvatarStyle(() => avatar);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [cliProvider, model, provider]);

  return modelAvatarStyle;
};
