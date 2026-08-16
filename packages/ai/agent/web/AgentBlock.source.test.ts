import { describe, expect, it } from "bun:test";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("AgentBlock source contract", () => {
  const source = readFileSync(
    resolve(import.meta.dir, "./AgentBlock.tsx"),
    "utf8"
  );
  const metaSource = readFileSync(
    resolve(import.meta.dir, "./AgentCardMeta.tsx"),
    "utf8"
  );
  const actionsSource = readFileSync(
    resolve(import.meta.dir, "./AgentCardActions.tsx"),
    "utf8"
  );
  const styles = readFileSync(
    resolve(import.meta.dir, "./AgentBlock.css"),
    "utf8"
  );

  it("uses the shared AgentAvatar module instead of inlining avatar presentation", () => {
    expect(source).toContain('import AgentAvatar from "./AgentAvatar"');
    expect(source).toContain("<AgentAvatar agent={item}");
    expect(source).not.toContain("const [modelAvatarStyle, setModelAvatarStyle] = useState");
  });

  it("memoizes the card to avoid list-wide rerenders from stable props", () => {
    expect(source).toContain("const AgentBlock = memo(AgentBlockComponent);");
    // handleStartDialog now lives in the shared AgentCardActions
    expect(actionsSource).toContain("const handleStartDialog = useCallback(");
  });

  it("shows whether a CLI agent runs on a bound machine or default environment", () => {
    // Runtime badge logic now lives in AgentCardMeta via badgeMeta
    expect(metaSource).toContain("agent__runtime");
    expect(metaSource).toContain("runtimeLabel");
  });

  it("shows machine-bound local custom agents as runtime-tagged cards too", () => {
    // Detected in agentBadges.ts via resolveAgentBadgeMeta, rendered in AgentCardMeta
    const badgesSource = readFileSync(
      resolve(import.meta.dir, "./agentBadges.ts"),
      "utf8"
    );
    expect(badgesSource).toContain("isMachineBoundLocalCustomAgent");
  });

  it("keeps mobile agent cards touch-sized", () => {
    expect(styles).toContain("@media (max-width: 768px)");
    expect(styles).toContain(".agent__avatar,\n          .agent__avatar-img,");
    expect(styles).toContain("width: 56px;");
    expect(styles).toContain("height: 56px;");
    expect(styles).toContain("min-height: 48px !important;");
    expect(styles).toContain("display: flex;");
    expect(styles).toContain("justify-content: flex-end;");
  });

  it("retains the per-million-token output price row on agent cards", () => {
    // Price row now lives in AgentCardMeta, shared by AgentCard and AgentBlock
    expect(metaSource).toContain("agent__model-cost");
    expect(metaSource).toContain('t("outputCostPerMillionTokens"');
    expect(metaSource).toContain("formatAgentOutputPrice(item.outputPrice)");
  });

  it("detaches deleted agents from the route space before falling back to record space", () => {
    expect(source).toContain("const deleteSpaceId = routeSpaceId");
    expect(source).toContain("normalizeSpaceId(routeSpaceId)");
    expect(source).toContain("spaceId: deleteSpaceId");
    expect(source).not.toContain("fetchSpace");
    expect(source).not.toContain("removeFavoriteLocally");
  });
});