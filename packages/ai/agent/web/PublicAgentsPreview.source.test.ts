import { describe, expect, it } from "bun:test";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("PublicAgentsPreview source contract", () => {
  const source = readFileSync(
    resolve(import.meta.dir, "./PublicAgentsPreview.tsx"),
    "utf8"
  );
  const cardSource = readFileSync(
    resolve(import.meta.dir, "./AgentCard.tsx"),
    "utf8"
  );

  it("delegates the public preview card to the shared AgentCard module", () => {
    expect(source).toContain('import AgentCard from "ai/agent/web/AgentCard"');
    expect(source).toContain("<AgentCard key={item.id} item={item} />");
    expect(source).not.toContain('import AgentAvatar from "./AgentAvatar"');
  });

  it("retains the per-million-token output price row on the shared AgentCard", () => {
    // Price row now lives in AgentCardMeta, shared by AgentCard and AgentBlock
    const metaSource = readFileSync(
      resolve(import.meta.dir, "./AgentCardMeta.tsx"),
      "utf8"
    );
    expect(metaSource).toContain("agent__model-cost");
    expect(metaSource).toContain('t("outputCostPerMillionTokens"');
    expect(metaSource).toContain("formatAgentOutputPrice(item.outputPrice)");
  });

  it("uses the shared AgentAvatar module for home AI plaza card avatars", () => {
    expect(cardSource).toContain('import AgentAvatar from "./AgentAvatar"');
    expect(cardSource).toContain("<AgentAvatar agent={item}");
    expect(cardSource).not.toContain('import { resolveAvatarUrl } from "ai/agent/avatarUtils"');
    expect(cardSource).not.toContain('className="agent__avatar-img"');
  });

  it("keeps model avatar resolution inside AgentAvatar instead of public preview cards", () => {
    expect(cardSource).not.toContain('from "./useAgentModelAvatarComponent"');
    expect(cardSource).not.toContain("useAgentModelAvatarComponent({");
    expect(cardSource).not.toContain("const [modelAvatarStyle, setModelAvatarStyle] = useState");
  });

  it("shares AgentPage view-transition names and opts left-click into route VT", () => {
    expect(cardSource).toContain('from "app/viewTransitions"');
    expect(cardSource).toContain('from "app/viewTransitionCoordinator"');
    expect(cardSource).toContain("getAgentCardVTNames(agentKey)");
    expect(cardSource).toContain("useViewTransitionNavigate");
    expect(cardSource).toContain("navigateWithVT(agentPath");
    expect(cardSource).toContain("buildAgentNavLocationState(item)");
    expect(cardSource).toContain("seedAgentPreviewInStore");
  });
});
