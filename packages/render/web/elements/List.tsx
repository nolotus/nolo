// render/elements/List.tsx
import "../elements.css";
import React from "react";
import { ReactEditor, useSlateStatic } from "slate-react";
import { Editor, Element as SlateElement, Transforms } from "slate";

type ListProps = {
  attributes: any;
  children: React.ReactNode;
  element: any;
  readOnly?: boolean;
};

// 静态 CSS，尽量兼顾中英文 / 日文 / 韩文混排

export const List: React.FC<ListProps> = ({
  attributes,
  children,
  element,
}) => {
  const Tag = element.ordered ? "ol" : "ul";
  const childArray = React.Children.toArray(children);
  const items = childArray.map((child, index) => ({
    child,
    indent: Math.max(0, Number(element.children?.[index]?.indent || 0)),
  }));

  // Storage stays flat for easier KV splitting/search. At render time we rebuild
  // the nested DOM structure from each item's indent level.
  const renderLevel = (
    startIndex: number,
    level: number
  ): [React.ReactNode[], number] => {
    const nodes: React.ReactNode[] = [];
    let index = startIndex;

    while (index < items.length) {
      const item = items[index];
      if (item.indent < level) break;

      if (item.indent > level) {
        const lastNode = nodes[nodes.length - 1];
        if (React.isValidElement(lastNode)) {
          const [nestedNodes, nextIndex] = renderLevel(index, item.indent);
          nodes[nodes.length - 1] = React.cloneElement(
            lastNode as React.ReactElement<any>,
            {},
            <>
              {(lastNode as React.ReactElement<any>).props.children}
              <Tag className="custom-list custom-list--nested">{nestedNodes}</Tag>
            </>
          );
          index = nextIndex;
          continue;
        }
      }

      nodes.push(item.child);
      index += 1;
    }

    return [nodes, index];
  };

  const [nestedChildren] = renderLevel(0, 0);

  return (
    <>
      

      <Tag {...attributes} className="custom-list">
        {nestedChildren}
      </Tag>
    </>
  );
};

export const ListItem: React.FC<ListProps> = ({
  attributes,
  children,
  element,
  readOnly = false,
}) => {
  const editor = useSlateStatic() as ReactEditor;
  const isTaskItem = element.checked !== undefined;
  const isCompleted = element.checked === true;

  const className = [
    "custom-list-item",
    isTaskItem && "task-list-item",
    isCompleted && "task-completed",
  ]
    .filter(Boolean)
    .join(" ");

  if (isTaskItem) {
    return (
      <li {...attributes} className={className}>
        <input
          type="checkbox"
          checked={element.checked}
          readOnly
          className="list-checkbox"
          contentEditable={false}
          aria-label={isCompleted ? "Completed task" : "Incomplete task"}
          onMouseDown={(event) => {
            if (readOnly) return;
            event.preventDefault();
            event.stopPropagation();
            const path = ReactEditor.findPath(editor, element);
            Editor.withoutNormalizing(editor, () => {
              Transforms.setNodes(
                editor,
                { checked: !element.checked } as Partial<typeof element>,
                {
                  at: path,
                  match: (node) =>
                    SlateElement.isElement(node) && node === element,
                }
              );
            });
          }}
        />
        <div className={`task-content${isCompleted ? " task-completed" : ""}`}>
          {children}
        </div>
      </li>
    );
  }

  return (
    <li {...attributes} className={className}>
      {children}
    </li>
  );
};
