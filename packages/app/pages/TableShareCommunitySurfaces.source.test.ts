import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (fileName: string) => readFileSync(join(import.meta.dir, fileName), "utf8");
const readLocaleSource = () =>
  readFileSync(join(import.meta.dir, "../i18n/translations/interface.locale.ts"), "utf8");

describe("table share community surfaces source contract", () => {
  it("adds table as a first-class community filter", () => {
    const source = readSource("ShareCommunityPage.tsx");

    expect(source).toContain('table: { labelKey: "community_filter_table" }');
    expect(source).toContain('if (filter === "table") return share.type === DataType.TABLE;');
    expect(source).toContain("table: 0");
    expect(source).toContain("else if (s.type === DataType.TABLE) counts.table++;");
  });

  it("renders table shares with dedicated table icons", () => {
    const mySharesSource = readSource("MySharesPage.tsx");
    const shareCardSource = readSource("ShareCard.tsx");

    expect(mySharesSource).toContain("LuTable");
    expect(mySharesSource).toContain("if (type === DataType.TABLE) return LuTable;");

    expect(shareCardSource).toContain("LuTable");
    expect(shareCardSource).toContain("const isTable = share.type === DataType.TABLE;");
    expect(shareCardSource).toContain('? "ShareCard__icon--table"');
    expect(shareCardSource).toContain('? <LuTable size={20} aria-hidden="true" />');
  });

  it("adds community and my-shares copy for tables", () => {
    const localeSource = readLocaleSource();

    expect(localeSource).toContain('community_filter_table: "Tables"');
    expect(localeSource).toContain('community_filter_table: "表格"');
    expect(localeSource).toContain('subtitle: "Pages, conversations, tables, and apps you\'ve published and shared."');
    expect(localeSource).toContain('subtitle: "你发布和分享出去的页面、对话、表格与应用。"');
  });

  it("loads the community page from the local runtime before remote servers", () => {
    const source = readSource("ShareCommunityPage.tsx");

    expect(source).toContain('import { selectRuntimeSnapshot } from "app/stateViews/runtime"');
    expect(source).toContain("localRuntimeOrigin");
    expect(source).toContain("buildCommunityServerCandidates");
    expect(source).toContain("for (const candidate of serverCandidates)");
  });
});
