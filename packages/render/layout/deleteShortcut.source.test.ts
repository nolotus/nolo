import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "../../..");

const readSource = (relativePath: string) =>
  readFileSync(join(repoRoot, relativePath), "utf8");

describe("topbar delete shortcut listener", () => {
  test("registers a top-level keyboard listener outside handleDeleteApp", () => {
    const source = readSource("packages/render/layout/useTopBarState.tsx");

    const handleDeleteAppStart = source.indexOf(
      "const handleDeleteApp = useCallback(async (): Promise<boolean> => {",
    );
    const handleDeleteAppEnd = source.indexOf(
      "}, [routeAppKey, dispatch, navigate]);",
      handleDeleteAppStart,
    );
    const effectStart = source.indexOf(
      "// 键盘快捷键监听：删除当前会话",
      handleDeleteAppEnd,
    );

    expect(handleDeleteAppStart).toBeGreaterThan(-1);
    expect(handleDeleteAppEnd).toBeGreaterThan(handleDeleteAppStart);
    expect(effectStart).toBeGreaterThan(handleDeleteAppEnd);

    const between = source.slice(handleDeleteAppEnd, effectStart);
    expect(between).not.toContain("useEffect(");
  });

  test("guards editable targets and opens delete confirm on shortcut match", () => {
    const source = readSource("packages/render/layout/useTopBarState.tsx");

    expect(source).toContain('import { selectDeleteShortcut } from "app/settings/settingSlice";');
    expect(source).toContain('import { matchShortcut } from "app/settings/shortcutUtils";');
    expect(source).toContain("const deleteShortcut = useAppSelector(selectDeleteShortcut);");
    expect(source).toContain('target.tagName === "INPUT"');
    expect(source).toContain('target.tagName === "TEXTAREA"');
    expect(source).toContain("target.isContentEditable");
    expect(source).toContain("if (matchShortcut(e, deleteShortcut))");
    expect(source).toContain("e.preventDefault();");
    expect(source).toContain("handleOpenDeleteConfirm();");
    expect(source).toContain(
      "}, [deleteShortcut, deleteKey, deleteContext, handleOpenDeleteConfirm]);",
    );
  });

  test("defines productivity shortcut copy in all interface locales", () => {
    const localeSource = readSource(
      "packages/app/i18n/translations/interface.locale.ts",
    );
    const requiredKeys = [
      "deleteDialog:",
      "clickToRecord:",
      "pressKeys:",
      "resetSuccess:",
    ];

    for (const key of requiredKeys) {
      const matches = localeSource.match(new RegExp(key.replace(":", "\\:"), "g")) ?? [];
      expect(matches.length).toBeGreaterThanOrEqual(4);
    }

    expect(localeSource).toContain('title: "Keyboard shortcuts"');
    expect(localeSource).toContain('title: "键盘快捷键"');
    expect(localeSource).toContain('title: "鍵盤快捷鍵"');
    expect(localeSource).toContain('title: "キーボードショートカット"');
  });
});