import {
    Editor,
    Element as SlateElement,
    createEditor,
} from "slate";
import { withHistory, History } from "slate-history";
import {
    withReact,
    ReactEditor,
} from "slate-react";

import { withLayout } from "../plugins/withLayout";
import { withShortcuts } from "../plugins/withShortcuts";
import { withLinks } from "../plugins/withLinks";
import { withTables } from "../plugins/withTables";
import { withChineseTypography } from "../plugins/withChineseTypography";
import { withMentions } from "../plugins/withMentions";
import { withBlockStructure } from "../plugins/withBlockStructure";

// Need CustomEditor type, but it's defined in Editor.tsx.
// Should separate types or import/copy.
// I'll define it here locally or import.
// For now, I'll export CustomEditor from Editor.tsx or define it here if simple.
// It's `ReactEditor & History & { nodeToDecorations?: Map<SlateElement, Range[]> }`.

export type CustomEditor = ReactEditor &
    History & {
        nodeToDecorations?: Map<SlateElement, Range[]>;
        isInline: (element: SlateElement) => boolean;
    };

/**
 * 创建带所有插件的编辑器实例
 */
export const createNoloEditor = (): CustomEditor => {
    const reactEditor = withReact(createEditor() as ReactEditor);
    const historyEditor = withHistory(reactEditor);
    const linksEditor = withLinks(historyEditor);
    const layoutEditor = withLayout(linksEditor);
    const blockStructureEditor = withBlockStructure(layoutEditor);
    const shortcutsEditor = withShortcuts(blockStructureEditor);
    const typographyEditor = withChineseTypography(shortcutsEditor);
    const tablesEditor = withTables(typographyEditor);
    const mentionsEditor = withMentions(tablesEditor);

    const baseEditor = mentionsEditor as CustomEditor;

    // 只扩展 code-inline 为 inline；image 不声明为 void，方便 Caption 编辑
    const { isInline } = baseEditor;
    baseEditor.isInline = (element: SlateElement) =>
        (element as any).type === "code-inline" ? true : isInline(element);

    return baseEditor;
};
