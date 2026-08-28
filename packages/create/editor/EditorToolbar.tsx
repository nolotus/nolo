// 文件：create/editor/EditorToolbar.tsx

import React, { useState, useCallback, useRef } from "react";
import { useSlate, ReactEditor } from "slate-react";
import { Editor, Element as SlateElement, Transforms } from "slate";

import { Button, Menu } from "./components";
import { CodeBlockButton } from "./CodeBlockButton";
import { isCustomElement, type Element, type LinkElement } from "./types";
import {
  getActiveListVariant,
  isBlockActive,
  setBlockType,
  toggleBulletedList,
  toggleOrderedList,
  toggleTaskList,
} from "./blockCommands";
import { isMarkActive, toggleMark } from "./mark";
import { LinkCommands } from "./utils/linkCommands";
import { LinkModal } from "render/web/ui/LinkModal";
import { useAppDispatch } from "app/store";
import { isImageFile } from "app/utils/fileUtils";
import { insertImageFromFile } from "./imageUpload";

import {
  LuBold,
  LuItalic,
  LuUnderline,
  LuCode,
  LuQuote,
  LuHeading1,
  LuHeading2,
  LuListOrdered,
  LuList,
  LuSquareCheck,
  LuAlignLeft,
  LuAlignCenter,
  LuAlignRight,
  LuAlignJustify,
  LuLink,
  LuTable2,
  LuImagePlus,
} from "react-icons/lu";

const TEXT_ALIGN_TYPES = ["left", "center", "right", "justify"];
const LIST_TYPE = "list";
const TASK_LIST_TYPE = "task-list";

// === 表格插入 ===
const isTableActive = (editor: Editor) => {
  const [table] = Editor.nodes(editor, {
    match: (n) => isCustomElement(n) && n.type === "table",
  });
  return !!table;
};

const insertTable = (editor: Editor) => {
  if (isTableActive(editor)) return;

  const createTableCell = (): SlateElement =>
    ({
      type: "table-cell",
      children: [{ type: "paragraph", children: [{ text: "" }] }],
    } as unknown as SlateElement);

  const createTableRow = (cols: number): SlateElement =>
    ({
      type: "table-row",
      children: Array.from({ length: cols }, createTableCell),
    } as unknown as SlateElement);

  const tableNode: SlateElement = {
    type: "table",
    columns: [
      { width: null, align: "left" },
      { width: null, align: "left" },
    ],
    children: [createTableRow(2), createTableRow(2)],
  } as unknown as SlateElement;

  Transforms.insertNodes(editor, tableNode);

  const [tableEntry] = Editor.nodes(editor, {
    match: (n) => isCustomElement(n) && n.type === "table",
  });
  if (tableEntry) {
    Transforms.select(editor, Editor.start(editor, tableEntry[1]));
  }
};

const TableButton: React.FC = () => {
  const editor = useSlate();
  const isDisabled = isTableActive(editor);
  const label = "插入表格";

  return (
    <Button
      disabled={isDisabled}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-disabled={isDisabled || undefined}
      title={label}
      aria-label={label}
      onMouseDown={(e: React.MouseEvent) => {
        e.preventDefault();
        if (isDisabled) return;
        insertTable(editor);
      }}
    >
      <LuTable2 size={18} aria-hidden="true" />
    </Button>
  );
};

// === 图片按钮（点击上传） ===
const ImageButton: React.FC = () => {
  const editor = useSlate();
  const dispatch = useAppDispatch();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = async (
    event
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    if (!isImageFile(file)) return;

    if (!ReactEditor.isFocused(editor as ReactEditor)) {
      ReactEditor.focus(editor as ReactEditor);
    }
    await insertImageFromFile(editor, dispatch, file);
  };

  const label = "插入图片";

  return (
    <>
      <Button
        role="button"
        tabIndex={0}
        title={label}
        aria-label={label}
        onMouseDown={(e) => {
          e.preventDefault();
          openFilePicker();
        }}
      >
        <LuImagePlus size={18} aria-hidden="true" />
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleChange}
      />
    </>
  );
};

// === 通用 block / mark 按钮 ===

export const Toolbar: React.FC<{
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ className = "", style = {}, ...props }) => (
  <Menu
    {...props}
    className={`editor-toolbar ${className}`}
    style={{
      position: "relative",
      padding: "var(--space-2) var(--space-3)",
      backgroundColor: "var(--backgroundSecondary)",
      borderRadius: "var(--space-1)",
      boxShadow: "0 1px 3px var(--shadowMedium)",
      marginBottom: "var(--space-4)",
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      gap: "var(--space-2)",
      ...style,
    }}
  />
);

const toggleBlock = (editor: Editor, format: string, ordered?: boolean) => {
  const isTaskList = format === TASK_LIST_TYPE;
  const isList = format === "list" || isTaskList;

  if (isTaskList) {
    toggleTaskList(editor);
    return;
  }

  if (format === "list") {
    if (ordered) {
      toggleOrderedList(editor);
    } else {
      toggleBulletedList(editor);
    }
    return;
  }

  if (TEXT_ALIGN_TYPES.includes(format)) {
    const active = isBlockActive(editor, format, "align");
    Transforms.setNodes<Element>(editor, {
      align: (active ? undefined : format) as "left" | "center" | "right" | "justify" | undefined,
    });
    return;
  }

  const active = isBlockActive(editor, format, "type");
  setBlockType(editor, active ? "paragraph" : format);
};

const BLOCK_LABELS: Record<string, string> = {
  "heading-one": "一级标题",
  "heading-two": "二级标题",
  quote: "引用",
  list: "列表",
  "task-list": "任务列表",
  left: "左对齐",
  center: "居中对齐",
  right: "右对齐",
  justify: "两端对齐",
};

const MARK_LABELS: Record<string, string> = {
  bold: "粗体",
  italic: "斜体",
  underline: "下划线",
  code: "行内代码",
};

const BlockButton: React.FC<{
  format: string;
  Icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean | "true" | "false" }>;
  ordered?: boolean;
  label?: string;
}> = ({ format, Icon, ordered, label }) => {
  const editor = useSlate();
  const active =
    format === TASK_LIST_TYPE
      ? getActiveListVariant(editor) === "task"
      : format === LIST_TYPE
        ? getActiveListVariant(editor) === (ordered ? "ordered" : "unordered")
        : isBlockActive(
          editor,
          format,
          TEXT_ALIGN_TYPES.includes(format) ? "align" : "type"
        );
  const accessibleName =
    label ||
    (format === LIST_TYPE
      ? ordered
        ? "有序列表"
        : "无序列表"
      : BLOCK_LABELS[format] || format);
  return (
    <Button
      active={active}
      role="button"
      tabIndex={0}
      title={accessibleName}
      aria-label={accessibleName}
      aria-pressed={active}
      onMouseDown={(e) => {
        e.preventDefault();
        toggleBlock(editor, format, ordered);
      }}
    >
      <Icon size={18} aria-hidden="true" />
    </Button>
  );
};

const MarkButton: React.FC<{
  format: string;
  Icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean | "true" | "false" }>;
  label?: string;
}> = ({
  format,
  Icon,
  label,
}) => {
  const editor = useSlate();
  const active = isMarkActive(editor, format);
  const accessibleName = label || MARK_LABELS[format] || format;
  return (
    <Button
      active={active}
      role="button"
      tabIndex={0}
      title={accessibleName}
      aria-label={accessibleName}
      aria-pressed={active}
      onMouseDown={(e) => {
        e.preventDefault();
        toggleMark(editor, format);
      }}
    >
      <Icon size={18} aria-hidden="true" />
    </Button>
  );
};

const LinkButton: React.FC = () => {
  const editor = useSlate();
  const [isModalOpen, setModalOpen] = useState(false);
  const isActive = LinkCommands.isLinkActive(editor);

  const getActiveLinkUrl = useCallback(() => {
    if (!isActive) return "";
    const [link] = Editor.nodes(editor, {
      match: (n) => isCustomElement(n) && n.type === "link",
    });
    return link ? (link[0] as LinkElement).url : "";
  }, [editor, isActive]);

  const handleConfirm = (url: string) => {
    LinkCommands.toggleLink(editor, url);
    setModalOpen(false);
  };
  const handleRemove = () => {
    LinkCommands.toggleLink(editor);
    setModalOpen(false);
  };

  const label = "链接";

  return (
    <>
      <Button
        active={isActive}
        role="button"
        tabIndex={0}
        title={label}
        aria-label={label}
        aria-pressed={isActive}
        onMouseDown={(e) => {
          e.preventDefault();
          if (!ReactEditor.isFocused(editor as ReactEditor)) {
            ReactEditor.focus(editor as ReactEditor);
          }
          setModalOpen(true);
        }}
      >
        <LuLink size={18} aria-hidden="true" />
      </Button>
      {isModalOpen && (
        <LinkModal
          isOpen={isModalOpen}
          onClose={() => setModalOpen(false)}
          onConfirm={handleConfirm}
          onRemove={handleRemove}
          initialUrl={getActiveLinkUrl()}
        />
      )}
    </>
  );
};

export const EditorToolbar: React.FC = () => {
  const groupStyle: React.CSSProperties = {
    display: "flex",
    gap: "var(--space-1)",
  };

  const divider = (
    <div
      style={{
        borderLeft: "1px solid var(--border)",
        height: "var(--space-5)",
      }}
    />
  );

  return (
    <Toolbar>
      {/* 文本样式组 */}
      <div style={groupStyle}>
        <MarkButton format="bold" Icon={LuBold} />
        <MarkButton format="italic" Icon={LuItalic} />
        <MarkButton format="underline" Icon={LuUnderline} />
        <MarkButton format="code" Icon={LuCode} />
        <LinkButton />
      </div>
      {divider}
      {/* 标题/引用组 */}
      <div style={groupStyle}>
        <BlockButton format="heading-one" Icon={LuHeading1} />
        <BlockButton format="heading-two" Icon={LuHeading2} />
        <BlockButton format="quote" Icon={LuQuote} />
      </div>
      {divider}
      {/* 列表组 */}
      <div style={groupStyle}>
        <BlockButton format="list" ordered={true} Icon={LuListOrdered} />
        <BlockButton format="list" ordered={false} Icon={LuList} />
        <BlockButton format="task-list" Icon={LuSquareCheck} />
      </div>
      {divider}
      {/* 对齐组 */}
      <div style={groupStyle}>
        <BlockButton format="left" Icon={LuAlignLeft} />
        <BlockButton format="center" Icon={LuAlignCenter} />
        <BlockButton format="right" Icon={LuAlignRight} />
        <BlockButton format="justify" Icon={LuAlignJustify} />
      </div>
      {divider}
      {/* 代码块组 */}
      <div style={groupStyle}>
        <CodeBlockButton />
      </div>
      {divider}
      {/* 图片 / 表格组 */}
      <div style={groupStyle}>
        <ImageButton />
        <TableButton />
      </div>
    </Toolbar>
  );
};
