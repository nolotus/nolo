// 文件：create/editor/Editor.tsx

import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import {
  Editor,
  Element as SlateElement,
  Descendant,
  Node,
  Range,
  Transforms,
} from "slate";
import { withHistory, History } from "slate-history";
import {
  Editable,
  Slate,
  ReactEditor,
  RenderElementProps,
} from "slate-react";
import { createNoloEditor, type CustomEditor } from "./utils/editorFactory";
import { SpaceContent, Category, type Agent } from "app/types";
import { type Element } from "./types";

import { useAppSelector, useAppDispatch } from "app/store";
import { selectEditorWordCountEnabled, selectEditorCodeTheme, } from "app/settings/settingSlice";
import { useFavoriteAgentIds } from "app/favorite/favoriteStore";
import { read } from "database/dbSlice";
import { setDocFocusContext } from "render/page/docStore";
import { asTrimmedString } from "core/trimmedString";

import { useDecorate, SetNodeToDecorations } from "./syntaxHighlighting";
import { toggleMark } from "./mark";
import { useOnKeyDown } from "./useOnKeyDown";
import { withLayout } from "./plugins/withLayout";
import { withShortcuts } from "./plugins/withShortcuts";
import { withLinks } from "./plugins/withLinks";
import { withTables } from "./plugins/withTables";
import { withChineseTypography } from "./plugins/withChineseTypography";
import { withMentions } from "./plugins/withMentions";
import { MentionList, MentionOption } from "./MentionList";
import { useAllMemberSpaces } from "create/space/spaceMembershipStore";
import { getPrismThemeCss } from "./theme/prism";
import { PlaceHolder } from "render/page/EditorPlaceHolder";
import { renderLeaf } from "./renderLeaf";
import { ElementWrapper } from "./ElementWrapper";
import { EditorToolbar } from "./EditorToolbar";
import { HoveringToolbar } from "./HoveringToolbar";
import { TableContextMenu } from "./TableContextMenu";
import { filterImageFiles } from "app/utils/fileUtils";
import { hasPlainCodeBlock } from "./utils/hasPlainCodeBlock";
import { insertImageFromFile } from "./imageUpload";
import { buildToolMentionOptions } from "./toolMentionOptions";
import { useCurrentSpaceId } from "create/space/spaceCurrentStore";
import { useCurrentSpaceFromEntity } from "create/space/spaceCurrentSelectors";

// CustomEditor moved to utils/editorFactory
// import type { CustomEditor } from "./utils/editorFactory";

interface NoloEditorProps {
  initialValue: Descendant[];
  readOnly?: boolean;
  onChange?: (value: Descendant[]) => void;
  isStreaming?: boolean;
  autoFocus?: boolean;
  onBlur?: () => void;
  onCompositionChange?: (isComposing: boolean) => void;
  onWordCountChange?: (count: number) => void;
}

type FavoriteAgentSummary = {
  agentKey: string;
  name: string;
  description?: string;
};

/**
 * 统计字数：
 * - 英文/数字按单词分
 * - 中文按单个汉字计数
 */
const countWords = (nodes: Descendant[]): number => {
  const text = nodes.map((node) => Node.string(node)).join("\n");
  const matches = text.match(/[a-zA-Z0-9]+|[\u4e00-\u9fa5]/g);
  return matches ? matches.length : 0;
};

const buildDocFocusContext = (editor: CustomEditor, isFocused: boolean) => {
  const { selection } = editor;
  if (!selection) {
    return {
      isFocused,
      isCollapsed: true,
      anchorPath: [],
      anchorOffset: 0,
      focusPath: [],
      focusOffset: 0,
      selectedText: null,
      blockType: null,
    };
  }

  const blockEntry = Editor.above(editor, {
    at: selection.anchor,
    match: (n) => Editor.isBlock(editor, n as SlateElement),
  });

  return {
    isFocused,
    isCollapsed: Range.isCollapsed(selection),
    anchorPath: [...selection.anchor.path],
    anchorOffset: selection.anchor.offset,
    focusPath: [...selection.focus.path],
    focusOffset: selection.focus.offset,
    selectedText: Range.isCollapsed(selection)
      ? null
      : Editor.string(editor, selection).slice(0, 200),
    blockType:
      blockEntry && SlateElement.isElement(blockEntry[0])
        ? (blockEntry[0] as Element).type
        : null,
  };
};

/**
 * 创建带所有插件的编辑器实例
 */
// createNoloEditor moved to utils/editorFactory

/**
 * 编辑器主体组件
 */
const NoloEditor: React.FC<NoloEditorProps> = ({
  initialValue,
  readOnly = false,
  onChange,
  isStreaming = false,
  autoFocus = false,
  onBlur,
  onCompositionChange,
  onWordCountChange,
}) => {
  const editor = useMemo<CustomEditor>(() => createNoloEditor(), []);
  const dispatch = useAppDispatch();
  const isComposingRef = useRef(false);

  // 自动聚焦到文档末尾
  useEffect(() => {
    if (readOnly || !autoFocus) return;

    if (editor.children && editor.children.length > 0) {
      const endPoint = Editor.end(editor, []);
      Transforms.select(editor, endPoint);
    }
    ReactEditor.focus(editor);
  }, [editor, readOnly, autoFocus]);

  // 全局设置
  const wordCountEnabled = useAppSelector(selectEditorWordCountEnabled);
  const editorCodeTheme = useAppSelector(selectEditorCodeTheme);

  // 本地状态
  const [wordCount, setWordCount] = useState(() => countWords(initialValue));

  useEffect(() => {
    onWordCountChange?.(wordCount);
  }, [wordCount, onWordCountChange]);
  const [docVersion, setDocVersion] = useState(0);
  const [hasPlainCode, setHasPlainCode] = useState(() =>
    hasPlainCodeBlock(initialValue)
  );
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isEditorFocused, setIsEditorFocused] = useState(false);

  // —— Mention State ——
  const [mentionTarget, setMentionTarget] = useState<Range | null>(null);
  // Options + highlight index co-located so filter resets are one update.
  const [mentionList, setMentionList] = useState<{
    options: MentionOption[];
    index: number;
  }>({ options: [], index: 0 });
  const mentionOptions = mentionList.options;
  const mentionIndex = mentionList.index;
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionCategory, setMentionCategory] = useState<"all" | "page" | "agent" | "tool" | "space">("all");

  const syncDocFocusContext = useCallback(
    (isFocused: boolean) => {
      setDocFocusContext(buildDocFocusContext(editor, isFocused) as any);
    },
    [editor]
  );

  // 获取真实数据
  const memberSpaces = useAllMemberSpaces();
  const currentSpace = useCurrentSpaceFromEntity();
  const currentSpaceId = useCurrentSpaceId();
  const favoriteAgentIds = useFavoriteAgentIds();
  const [favoriteAgents, setFavoriteAgents] = useState<FavoriteAgentSummary[]>([]);

  useEffect(() => {
    if (!favoriteAgentIds || favoriteAgentIds.length === 0) {
      setFavoriteAgents([]);
      return;
    }

    let cancelled = false;

    const loadFavoriteAgents = async () => {
      const results = await Promise.all(
        favoriteAgentIds.map(async (agentKey: string) => {
          try {
            const agent = (await dispatch(read({ dbKey: agentKey })).unwrap()) as Agent;
            if (!agent || cancelled) return null;

            const rawName = asTrimmedString(agent.name);
            const name = rawName || agentKey;

            return {
              agentKey,
              name,
              description: agent.description || agent.introduction || undefined,
            } as FavoriteAgentSummary;
          } catch {
            return { agentKey, name: agentKey } as FavoriteAgentSummary;
          }
        })
      );

      if (!cancelled) {
        setFavoriteAgents(
          results.filter((item): item is FavoriteAgentSummary => item !== null)
        );
      }
    };

    void loadFavoriteAgents();

    return () => {
      cancelled = true;
    };
  }, [favoriteAgentIds, dispatch]);

  const allOptions = useMemo<MentionOption[]>(() => {
    const options: MentionOption[] = [];

    // 1. Tools
    options.push(...buildToolMentionOptions());

    // 2. Current Space Contents (Specific Pages/Dialogs)
    if (currentSpace?.contents) {
      Object.entries(currentSpace.contents).forEach(([key, content]) => {
        if (content) {
          const item = content as SpaceContent;
          options.push({
            id: item.contentKey || key, // prefer contentKey (dbKey)
            label: item.title || "Untitled",
            type: "page", // Using 'page' generically for content
            description: `File in ${currentSpace.name}`,
          });
        }
      });
    }

    // 3. Other Spaces (Project Level)
    if (memberSpaces) {
      memberSpaces.forEach((space) => {
        // Skip current space if you want, or keep it to allow self-referencing the space object
        const memberSpace = space as { spaceId: string; spaceName: string; role: string };
        options.push({
          id: memberSpace.spaceId,
          label: memberSpace.spaceName,
          type: "space", // Using 'space' type
          description: `Space • ${memberSpace.role}`,
        });
      });
    }

    // 4. Agents (Favorite Agents)
    favoriteAgents.forEach((agent) => {
      options.push({
        id: agent.agentKey,
        label: agent.name,
        type: "agent",
        description: agent.description,
      });
    });

    return options;
  }, [memberSpaces, currentSpace, favoriteAgents]);

  useEffect(() => {
    if (!mentionTarget) return;

    let lowerSearch = mentionSearch.toLowerCase();
    let currentCat = mentionCategory;

    // Detect category prefix and strip it from search term
    let effectiveCategory = currentCat;
    if (lowerSearch.startsWith("page ")) {
      effectiveCategory = "page";
      lowerSearch = lowerSearch.slice(5);
    }
    else if (lowerSearch.startsWith("space ")) {
      effectiveCategory = "space";
      lowerSearch = lowerSearch.slice(6);
    }
    else if (lowerSearch.startsWith("agent ")) {
      effectiveCategory = "agent";
      lowerSearch = lowerSearch.slice(6);
    }
    else if (lowerSearch.startsWith("tool ")) {
      effectiveCategory = "tool";
      lowerSearch = lowerSearch.slice(5);
    }

    // Update state if category changed (this will trigger re-run, but we continue for immediate feedback)
    if (effectiveCategory !== mentionCategory) {
      setMentionCategory(effectiveCategory);
    }

    // Filter by search text (using stripped search term)
    let filtered = allOptions.filter(opt =>
      opt.label.toLowerCase().includes(lowerSearch) ||
      opt.description?.toLowerCase().includes(lowerSearch)
    );

    // Filter by category
    if (effectiveCategory !== "all") {
      filtered = filtered.filter(opt => opt.type === effectiveCategory);
    }

    // Ranking for "all" view: Prioritize Agents and Spaces as they are entry points
    if (effectiveCategory === "all") {
      filtered.sort((a, b) => {
        const priority = { agent: 4, space: 3, page: 2, tool: 1 };
        const pA = priority[a.type as keyof typeof priority] || 0;
        const pB = priority[b.type as keyof typeof priority] || 0;
        if (pA !== pB) return pB - pA;
        return 0;
      });
    }

    setMentionList({ options: filtered, index: 0 });
  }, [mentionSearch, allOptions, mentionCategory, mentionTarget]);

  // 语法高亮 & 快捷键（原有逻辑）
  const decorate = useDecorate(editor as Parameters<typeof useDecorate>[0]);
  const baseOnKeyDown = useOnKeyDown(editor);

  // 是否启用代码高亮：流式输出时或无代码块时关闭
  const highlightEnabled = useMemo(
    () => !isStreaming && hasPlainCode,
    [isStreaming, hasPlainCode]
  );

  // 渲染 block 元素

  const renderElement = useCallback(
    (elementProps: RenderElementProps) => (
      <ElementWrapper
        {...elementProps}
        isStreaming={isStreaming}
        highlightEnabled={highlightEnabled}
        readOnly={readOnly} // 新增这一行
      />
    ),
    [isStreaming, highlightEnabled, readOnly]
  );


  // 值变更处理：只在 AST 变化时更新
  const handleChange = useCallback(
    (value: Descendant[]) => {
      const isAstChange = editor.operations.some(
        (op) => op.type !== "set_selection"
      );

      console.log("[NoloEditor] handleChange called", {
        isAstChange,
        isComposing: isComposingRef.current,
        operations: editor.operations.map((op) => op.type),
        selection: editor.selection,
      });

      syncDocFocusContext(true);

      if (!isAstChange) {
        console.log("[NoloEditor] handleChange -> not AST change, return");
        return;
      }

      setDocVersion((v) => v + 1);
      setHasPlainCode(hasPlainCodeBlock(value));
      setWordCount(countWords(value));

      if (isComposingRef.current) {
        console.log(
          "[NoloEditor] handleChange -> in composition, skip external onChange"
        );
        return;
      }

      console.log("[NoloEditor] handleChange -> call onChange", {
        selectionAfter: editor.selection,
      });

      // —— Detect Mention Trigger (Improved Logic) ——
      const { selection } = editor;
      if (selection && Range.isCollapsed(selection)) {
        const [start] = Range.edges(selection);
        const block = Editor.above(editor, {
          at: start,
          match: (n) => Editor.isBlock(editor, n as SlateElement),
        });

        if (block) {
          const [, blockPath] = block;
          const blockStart = Editor.start(editor, blockPath);
          const rangeBefore = { anchor: blockStart, focus: start };
          const textBefore = Editor.string(editor, rangeBefore);
          const lastAtIndex = textBefore.lastIndexOf("@");
          const potentialMention =
            lastAtIndex !== -1 ? textBefore.slice(lastAtIndex) : null;

          // regex: matches @ followed by valid chars (allowing Chinese/Unicode)
          // We use [^\s] to allow anything except whitespace.
          if (potentialMention && /^@[^\s]*$/.test(potentialMention)) {
            // Check char before @ (must be whitespace or start of block)
            const charBeforeAt =
              lastAtIndex > 0 ? textBefore[lastAtIndex - 1] : null;
            const isWordStart =
              charBeforeAt === null || /\s/.test(charBeforeAt);

            if (isWordStart) {
              const mentionLength = potentialMention.length;
              const mentionStart = Editor.before(editor, start, {
                distance: mentionLength,
                unit: "character",
              });

              if (mentionStart) {
                setMentionTarget({ anchor: mentionStart, focus: start });
                setMentionSearch(potentialMention.slice(1));
                setMentionList((current) =>
                  current.index === 0 ? current : { ...current, index: 0 }
                );
              } else {
                setMentionTarget(null);
              }
            } else {
              setMentionTarget(null);
            }
          } else {
            setMentionTarget(null);
          }
        } else {
          setMentionTarget(null);
        }
      } else {
        setMentionTarget(null);
      }

      onChange?.(value);
    },
    [editor, onChange, syncDocFocusContext]
  );

  // 键盘输入事件（粗体/斜体/下划线）
  const handleDOMBeforeInput = useCallback(
    (event: any) => {
      switch (event.inputType) {
        case "formatBold":
          event.preventDefault();
          toggleMark(editor, "bold");
          break;
        case "formatItalic":
          event.preventDefault();
          toggleMark(editor, "italic");
          break;
        case "formatUnderline":
          event.preventDefault();
          toggleMark(editor, "underline");
          break;
        default:
          break;
      }
    },
    [editor]
  );

  // 键盘删除图片：Backspace / Delete
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (
        !readOnly &&
        (event.key === "Backspace" || event.key === "Delete")
      ) {
        const { selection } = editor;

        if (selection && Range.isCollapsed(selection)) {
          const [imageEntry] = Editor.nodes(editor, {
            at: selection,
            match: (n) =>
              !Editor.isEditor(n) &&
              SlateElement.isElement(n) &&
              (n as any).type === "image",
          });

          if (imageEntry) {
            event.preventDefault();
            const [, path] = imageEntry;
            Transforms.removeNodes(editor, { at: path });
            return;
          }
        }
      }

      baseOnKeyDown(event);
    },
    [editor, baseOnKeyDown, readOnly]
  );

  // 处理 Mention 列表的键盘导航
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (mentionTarget && mentionOptions.length > 0) {
        switch (event.key) {
          case 'ArrowDown':
            event.preventDefault();
            const prevIndex = mentionIndex >= mentionOptions.length - 1 ? 0 : mentionIndex + 1;
            setMentionList((current) => ({ ...current, index: prevIndex }));
            return;
          case 'ArrowUp':
            event.preventDefault();
            const nextIndex = mentionIndex <= 0 ? mentionOptions.length - 1 : mentionIndex - 1;
            setMentionList((current) => ({ ...current, index: nextIndex }));
            return;
          case 'Tab':
          case 'Enter':
            event.preventDefault();
            if (mentionOptions[mentionIndex]) {
              insertOption(editor, mentionOptions[mentionIndex], mentionTarget);
              setMentionTarget(null);
            }
            return;
          case 'Escape':
            event.preventDefault();
            setMentionTarget(null);
            return;
          case 'ArrowRight':
          case 'ArrowLeft':
            // Removed Ctrl+Arrow shortcut in favor of smart prefix search
            break;
        }
      }
      handleKeyDown(event);
    },
    [handleKeyDown, mentionTarget, mentionIndex, mentionOptions, editor]
  );

  const insertOption = (editor: CustomEditor, option: MentionOption, target: Range) => {
    Transforms.select(editor, target);
    const mention = {
      type: "mention",
      resourceType: option.type,
      resourceId: option.id,
      label: option.label,
      children: [{ text: "" }], // Void element must have empty text child
    };
    Transforms.insertNodes(editor, mention);
    Transforms.move(editor);
  };

  // 拖拽上传图片
  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (readOnly) return;

      const { dataTransfer } = event;
      if (!dataTransfer) return;

      const types = Array.from((event.dataTransfer as any).types || []);
      const hasFiles = types.includes("Files");
      const isSlateFragment = types.includes("application/x-slate-fragment");

      if (!hasFiles || isSlateFragment) return;

      event.preventDefault();
      event.stopPropagation();
      setIsDraggingOver(true);
    },
    [readOnly]
  );

  const handleDragLeave = useCallback(() => {
    if (isDraggingOver) {
      setIsDraggingOver(false);
    }
  }, [isDraggingOver]);

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      if (readOnly) return;

      const { dataTransfer } = event;
      if (!dataTransfer) return;

      const types = Array.from((event.dataTransfer as any).types || []);
      const hasFiles = types.includes("Files");
      const isSlateFragment = types.includes("application/x-slate-fragment");

      if (!hasFiles || isSlateFragment) return;

      event.preventDefault();
      event.stopPropagation();
      setIsDraggingOver(false);

      const imageFiles = filterImageFiles(
        Array.from((event.dataTransfer as any).files || [])
      );
      if (!imageFiles.length) return;

      const range = ReactEditor.findEventRange(editor, event);
      if (range) {
        Transforms.select(editor, range);
      }

      for (const file of imageFiles) {
        await insertImageFromFile(editor, dispatch, file, currentSpaceId || undefined);
      }
    },
    [dispatch, editor, readOnly, currentSpaceId]
  );

  // Prism 主题样式
  const prismThemeCss = useMemo(
    () => getPrismThemeCss(editorCodeTheme),
    [editorCodeTheme]
  );

  return (
    <div
      className={[
        "nolo-editor-container",
        !readOnly && isEditorFocused ? "nolo-editor-container--focused" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Slate
        editor={editor}
        initialValue={initialValue}
        onChange={handleChange}
      >
        {!readOnly && (
          <div className="toolbar-container">
            <EditorToolbar />
            <HoveringToolbar />
            <TableContextMenu />
            <MentionList
              target={mentionTarget}
              options={mentionOptions}
              selectedIndex={mentionIndex}
              category={mentionCategory}
              onCategoryChange={setMentionCategory}
              onSelect={(option) => {
                if (mentionTarget) { // check needed only for types, logic ensures it's set
                  insertOption(editor, option, mentionTarget);
                  setMentionTarget(null);
                  setMentionCategory("all"); // Reset category after selection
                }
              }}
            />
          </div>
        )}

        <SetNodeToDecorations
          highlightEnabled={highlightEnabled}
          docVersion={docVersion}
        />

        <Editable
          renderPlaceholder={({ attributes }) => (
            <div {...attributes}>
              <PlaceHolder />
            </div>
          )}
          readOnly={readOnly}
          decorate={decorate}
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          onKeyDown={onKeyDown}
          onDOMBeforeInput={handleDOMBeforeInput}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onBlur={() => {
            setIsEditorFocused(false);
            syncDocFocusContext(false);
            onBlur?.();
          }}
          onFocus={() => {
            setIsEditorFocused(true);
            syncDocFocusContext(true);
          }}
          onCompositionStart={() => {
            isComposingRef.current = true;
            setIsEditorFocused(true);
            syncDocFocusContext(true);
            onCompositionChange?.(true);
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false;
            setIsEditorFocused(true);
            syncDocFocusContext(true);
            onCompositionChange?.(false);
            onChange?.(editor.children as Descendant[]);
          }}
          style={
            isDraggingOver
              ? {
                  backgroundColor:
                    "color-mix(in srgb, var(--primary) 6%, transparent)",
                  transition: "background-color 0.15s ease-out",
                }
              : undefined
          }
        />

        <style>{prismThemeCss}</style>
      </Slate>

      {!readOnly && wordCountEnabled && !onWordCountChange && (
        <div className="word-count-display">{wordCount} 字</div>
      )}

      <style>{baseEditorStyles}</style>
    </div>
  );
};

export default NoloEditor;

/**
 * 基础样式
 */
const baseEditorStyles = `
  .nolo-editor-container {
    position: relative;
    padding: var(--space-1) 0;
    /* Full-bleed document canvas — no card/input chrome around the body. */
  }

  .toolbar-container {
    position: sticky;
    top: var(--space-2);
    margin-bottom: var(--space-2);
    padding: var(--space-1);
    z-index: 10;
  }

  .nolo-editor-container [data-slate-editor] {
    font-size: var(--fontSize-base);
    line-height: var(--leading-relaxed);
    color: var(--text);
    -webkit-text-size-adjust: 100%;
    outline: none;
    border: 0;
    border-radius: 0;
    background: transparent;
    padding: 0;
    /* Tall empty surface so empty pages feel like full-page writing, not a strip. */
    min-height: min(52vh, 28rem);
    /* Brighter caret for focus signal (no box ring). */
    caret-color: color-mix(in srgb, var(--primary) 72%, #0ea5e9 28%);
  }

  .nolo-editor-container [data-slate-editor]::selection,
  .nolo-editor-container [data-slate-editor] *::selection {
    background: color-mix(in srgb, var(--primary) 28%, transparent);
    color: inherit;
  }

  .nolo-editor-container a {
    color: var(--primary);
    text-decoration: none;
    cursor: pointer;
  }

  .nolo-editor-container a:hover {
    text-decoration: underline;
  }

  .inline-code {
    font-family:
      var(--font-mono, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
      "Courier New", monospace);
    background-color: var(--backgroundSecondary);
    color: var(--primary);
    padding: 0.1em 0.35em;
    border-radius: var(--radius-sm);
    font-size: 0.85em;
    border: 1px solid var(--border);
  }

  .word-count-display {
    position: absolute;
    right: var(--space-2, 8px);
    bottom: var(--space-1, 4px);
    font-size: 11px;
    font-weight: 400;
    color: var(--textQuaternary, var(--textTertiary, #a1a1aa));
    letter-spacing: 0.02em;
    user-select: none;
    opacity: 0.4;
    transition: opacity 0.2s ease;
    z-index: 2;
  }

  .word-count-display:hover {
    opacity: 0.85;
  }

  @media (max-width: 768px) {
    .nolo-editor-container {
      padding: 0;
    }

    .nolo-editor-container [data-slate-editor] {
      font-size: var(--fontSize-base);
      line-height: var(--leading-normal);
      min-height: min(48vh, 22rem);
    }

    .toolbar-container {
      padding: var(--space-1);
      margin-bottom: var(--space-1);
    }

    .inline-code {
      padding: 0.12em 0.35em;
      font-size: 0.9em;
    }

    .word-count-display {
      margin-top: var(--space-1);
    }
  }
`;
