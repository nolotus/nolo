import React, { useCallback, useMemo } from "react";
import {
  Editor,
  Node,
  Element as SlateElement,
  Range,
  NodeEntry,
  Path,
} from "slate";
import { useSlate, ReactEditor } from "slate-react";
import { History } from "slate-history";
import Prism from "./prismRuntime";

// 常用语言静态引入，确保立即可用
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-json";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-python";
import "prismjs/components/prism-markup-templating";
import "prismjs/components/prism-php";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-java";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-diff";
import "prismjs/components/prism-mermaid";

import {
  CodeBlockType,
  CodeLineType,
  isCustomElement,
  type Element,
  type CodeBlockElement,
  type CodeLineElement,
} from "./types";
import { normalizeTokens } from "./utils/normalize-tokens";

type CustomEditor = ReactEditor &
  History & {
    nodeToDecorations?: Map<SlateElement, Range[]>;
  };

const mergeMaps = <K, V>(...maps: Map<K, V>[]): Map<K, V> => {
  const merged = new Map<K, V>();
  for (const m of maps) {
    for (const [k, v] of m) {
      merged.set(k, v);
    }
  }
  return merged;
};

const getChildNodeToDecorations = (
  [block, blockPath]: NodeEntry,
  prismLib: typeof Prism
): Map<SlateElement, Range[]> => {
  const nodeToDecorations = new Map<SlateElement, Range[]>();
  if (
    !isCustomElement(block) ||
    block.type !== CodeBlockType ||
    !Array.isArray(block.children) ||
    block.preview === "true"
  ) {
    return nodeToDecorations;
  }

  const codeBlock = block;

  const codeLines = codeBlock.children.filter(
    (child): child is CodeLineElement =>
      isCustomElement(child) && child.type === CodeLineType
  );
  if (codeLines.length === 0) return nodeToDecorations;

  const language = (codeBlock.language || "plain").toLowerCase();
  const grammar =
    prismLib.languages[language] || prismLib.languages.plain || {};

  let text = "";
  try {
    text = codeLines.map((line) => Node.string(line)).join("\n");
  } catch (e) {
    console.error("从代码行提取文本时出错:", e);
    return nodeToDecorations;
  }

  let tokens;
  try {
    tokens = prismLib.tokenize(text, grammar);
  } catch (e) {
    console.error(`Prism 在处理 ${language} 时出错:`, e);
    return nodeToDecorations;
  }

  const normalized = normalizeTokens(tokens);
  normalized.forEach((lineTokens, lineIndex) => {
    if (lineIndex >= codeLines.length) return;

    const element = codeLines[lineIndex];
    nodeToDecorations.set(element, []);
    let offset = 0;

    for (const token of lineTokens as { content: string | string[]; types?: string[] }[]) {
      const content = typeof token.content === "string" ? token.content : "";
      const length = content.length;
      if (length === 0) continue;

      const start = offset;
      const end = start + length;
      const path: Path = [...blockPath, lineIndex, 0];
      const types = (token.types || []).filter((t: string) => t !== "text");

      const range = {
        anchor: { path, offset: start },
        focus: { path, offset: end },
        token: true,
        ...Object.fromEntries(types.map((t) => [t, true])),
      } as unknown as Range & Record<string, boolean>;

      nodeToDecorations.get(element)!.push(range);
      offset = end;
    }
  });

  return nodeToDecorations;
};

export const useDecorate = (editor: CustomEditor) => {
  return useCallback(
    ([node]: NodeEntry): Range[] => {
      const decorations = editor.nodeToDecorations;
      if (
        isCustomElement(node) &&
        node.type === CodeLineType &&
        decorations?.has(node)
      ) {
        return decorations.get(node)!;
      }
      return [];
    },
    [editor]
  );
};

interface SetNodeToDecorationsProps {
  highlightEnabled: boolean;
  docVersion: number;
}

export const SetNodeToDecorations: React.FC<SetNodeToDecorationsProps> = ({
  highlightEnabled,
  docVersion,
}) => {
  const editor = useSlate() as CustomEditor;

  const nodeToDecorations = useMemo(() => {
    if (!highlightEnabled) {
      return new Map<SlateElement, Range[]>();
    }
    const codeBlockEntries = Array.from(
      Editor.nodes(editor, {
        at: [],
        match: (n) =>
          isCustomElement(n) &&
          n.type === CodeBlockType &&
          (n as CodeBlockElement).preview !== "true",
      })
    );
    const decorationMaps = codeBlockEntries.map((entry) =>
      getChildNodeToDecorations(entry, Prism)
    );
    return mergeMaps(...decorationMaps);
  }, [editor, docVersion, highlightEnabled]);

  editor.nodeToDecorations = nodeToDecorations;
  return null;
};
