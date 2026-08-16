import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

const repoRoot = join(import.meta.dir, "../../..");

const readSource = (relativePath: string) =>
  readFileSync(join(repoRoot, relativePath), "utf8");

describe("agent delete confirmation copy", () => {
  test("topbar uses the current-copy warning for agent deletes", () => {
    const topBarSource = readSource("packages/render/layout/TopBar.tsx");
    const topBarStateSource = readSource("packages/render/layout/useTopBarState.tsx");
    expect(topBarStateSource).toContain('"deleteAgentCurrentCopyConfirmation"');
    expect(topBarStateSource).toContain('contentKeyType === "agent"');
  });

  test("topbar leaves favorite projection cleanup to deleteDbKey", () => {
    const topBarStateSource = readSource("packages/render/layout/useTopBarState.tsx");
    const deleteDbKeySource = readSource("packages/app/hooks/deleteDbKey.ts");

    expect(topBarStateSource).not.toContain("removeFavoriteLocally");
    expect(deleteDbKeySource).toContain("removeFavoriteLocally");
    expect(deleteDbKeySource).toContain("resolveDeletedFavoriteProjectionRemoval");
  });

  test("all interface locales define agent-specific delete copy", () => {
    const localeSource = readSource("packages/app/i18n/translations/interface.locale.ts");
    const matches = localeSource.match(/deleteAgentCurrentCopyConfirmation/g) ?? [];

    expect(matches).toHaveLength(4);
    expect(localeSource).toContain("current copy");
    expect(localeSource).toContain("当前副本");
    expect(localeSource).toContain("目前副本");
    expect(localeSource).toContain("現在のコピー");
  });
});
