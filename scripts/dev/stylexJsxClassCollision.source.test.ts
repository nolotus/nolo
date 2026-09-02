import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";
import { discoverTsxFiles, scanJsxClassCollisions } from "./scanStylexJsxClassCollision";

describe("StyleX JSX class collision guard", () => {
  it("turns red for a literal class followed by stylex.props", () => {
    const bad = `<div className="legacy" {...stylex.props(styles.root)} />`;
    const findings = scanJsxClassCollisions(bad, "bad-fixture.tsx");
    expect(findings.length).toBeGreaterThan(0);
  });
  it("allows the approved merge helper", () => {
    expect(scanJsxClassCollisions(`<div {...withLiteralClass("legacy", styles.root)} />`)).toEqual([]);
  });
  it("detects expression className too", () => {
    expect(scanJsxClassCollisions(`<div className={name} {...classProps} />`)).toHaveLength(1);
  });
  it("keeps the repo-wide scan pinned to the verified baseline", () => {
    // Repo-wide guard: the set of files with findings AND per-file counts must
    // match this verified snapshot exactly. Any new file or extra finding = red.
    // All entries below were manually verified during the 2026-09-02 sweep:
    // - Table.tsx x7: character-parser nesting artifact — the element block spans
    //   into child JSX; every spread element there has no preceding className and
    //   the one className array uses manual `[literal, stylex.props(x).className]` merge.
    // - BaseTable/TableCellEdit/Dialog/Slider/InlineEditInput: className is
    //   destructured out of the rest-props signature (TS-guaranteed absent from
    //   the spread), caller classes merged explicitly.
    // - WidgetsSection (dnd handle literal), DialogUsageTrigger ({title} literal),
    //   IframeArtifactBlock ({fetchPriority} literal), SearchInput formProps
    //   (data-* literal), SpaceContent Block/List fileDropProps (data-* + drag
    //   events factory), CategoryHeader (InlineEditInput merge + RAC props),
    //   Input/TextArea/LanguageSwitcher (react-aria props carry no className).
    const knownSafe: Record<string, number> = {
      "packages/app/pages/widgets/WidgetsSection.tsx": 1,
      "packages/chat/web/DialogUsageTrigger.tsx": 1,
      "packages/create/space/category/CategoryHeader.tsx": 1,
      "packages/create/space/components/SpaceContentBlock.tsx": 1,
      "packages/create/space/components/SpaceContentList.tsx": 1,
      "packages/render/web/elements/BaseTable.tsx": 2,
      "packages/render/web/elements/IframeArtifactBlock.tsx": 1,
      "packages/render/web/form/Input.tsx": 1,
      "packages/render/web/form/Slider.tsx": 1,
      "packages/render/web/form/TextArea.tsx": 1,
      "packages/render/web/ui/InlineEditInput.tsx": 1,
      "packages/render/web/ui/LanguageSwitcher.tsx": 1,
      "packages/render/web/ui/modal/Dialog.tsx": 1,
      "packages/render/web/ui/SearchInput.tsx": 1,
      "packages/render/web/ui/Table.tsx": 7,
      "packages/render/web/ui/TableCellEdit.tsx": 1,
    };
    const root = process.cwd();
    const counts: Record<string, number> = {};
    for (const f of discoverTsxFiles(root).flatMap((file) =>
      scanJsxClassCollisions(readFileSync(join(root, file), "utf8"), file),
    )) counts[f.file] = (counts[f.file] ?? 0) + 1;
    expect(Object.keys(counts).sort()).toEqual(Object.keys(knownSafe).sort());
    for (const [file, expected] of Object.entries(knownSafe)) {
      expect(counts[file] ?? 0).toBe(expected);
    }
  });
});
