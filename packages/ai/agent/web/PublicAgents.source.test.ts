import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

const publicAgentsSource = readFileSync(
  join(import.meta.dir, "PublicAgents.tsx"),
  "utf8"
);
const agentExploreSource = readFileSync(
  join(import.meta.dir, "AgentExplore.tsx"),
  "utf8"
);
const localeSource = readFileSync(
  join(import.meta.dir, "../../../app/i18n/translations/interface.locale.ts"),
  "utf8"
);
const stylesSource = readFileSync(
  join(import.meta.dir, "PublicAgents.css"),
  "utf8"
);
const publicAgentsListSource = readFileSync(
  join(import.meta.dir, "PublicAgentsList.tsx"),
  "utf8"
);
const publicAgentsListStyles = readFileSync(
  join(import.meta.dir, "PublicAgentsList.css"),
  "utf8"
);

describe("PublicAgents AI Plaza controls", () => {
  test("does not expose the removed tool filter", () => {
    expect(publicAgentsSource).not.toContain("ToolFilter");
    expect(publicAgentsSource).not.toContain("showToolFilter");
    expect(publicAgentsSource).not.toContain("toolFilter");
    expect(publicAgentsSource).not.toContain("toolName:");
    expect(agentExploreSource).not.toContain("showToolFilter");
    expect(localeSource).not.toContain("filterToolPlaceholder");
    expect(localeSource).not.toContain("filterByTool");
    expect(localeSource).not.toContain("clearToolFilter");
  });

  test("keeps desktop controls on a single row", () => {
    expect(stylesSource).toContain(".public-agents__controls");
    expect(stylesSource).toContain("justify-content: space-between;");
    expect(stylesSource).toContain("flex-wrap: nowrap;");
    expect(stylesSource).toContain("flex: 0 0 auto;");
    expect(stylesSource).toContain("@media (max-width: 768px)");
    expect(stylesSource).toContain("flex-direction: column;");
    expect(stylesSource).toContain("flex-wrap: wrap;");
  });

  test("explore catalog list uses the same three-column agent grid as home preview", () => {
    expect(publicAgentsListSource).toContain('className="agents-grid public-agents__grid"');
    expect(publicAgentsListSource).toContain("AgentGrid");
    expect(publicAgentsListStyles).toContain(".agents-grid.public-agents__grid");
    expect(publicAgentsListStyles).toContain(
      "grid-template-columns: repeat(3, minmax(0, 1fr));"
    );
  });
});
