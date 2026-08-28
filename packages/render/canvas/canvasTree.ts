import { isRecord } from "core/isRecord";
import type { CanvasDocument, CanvasEvent, CanvasNode } from "./types";

const ALLOWED_NODE_TYPES = new Set([
  "Canvas",
  "Stack",
  "Grid",
  "Section",
  "Text",
  "Button",
  "Card",
  "MetricCard",
  "Chart",
  "List",
  "Table",
  "Toolbar",
]);

const ALLOWED_STYLE_KEYS = new Set([
  "alignItems",
  "background",
  "backgroundColor",
  "border",
  "borderColor",
  "borderRadius",
  "color",
  "display",
  "fontSize",
  "fontWeight",
  "gap",
  "gridTemplateColumns",
  "height",
  "justifyContent",
  "margin",
  "maxWidth",
  "minHeight",
  "padding",
  "textAlign",
  "width",
]);

export function createCanvasDocument(rootId = "root"): CanvasDocument {
  return {
    version: 1,
    root: {
      id: rootId,
      type: "Canvas",
      children: [],
    },
    selectedNodeId: null,
  };
}

function isSafeId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
}

function isSafePrimitive(value: unknown) {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function isSafeRuntimeValue(value: unknown) {
  return (
    isSafePrimitive(value) ||
    (Array.isArray(value) && value.every((item) => isSafePrimitive(item)))
  );
}

function sanitizeRuntimeAction(value: unknown) {
  if (!isRecord(value) || typeof value.type !== "string") return null;

  if (value.type === "toggle" && isSafeId(value.key)) {
    return { type: "toggle", key: value.key };
  }

  if (
    value.type === "setState" &&
    isSafeId(value.key) &&
    isSafeRuntimeValue(value.value)
  ) {
    return { type: "setState", key: value.key, value: value.value };
  }

  if (value.type === "scrollTo" && isSafeId(value.targetId)) {
    return { type: "scrollTo", targetId: value.targetId };
  }

  return null;
}

function sanitizeProps(props: unknown): Record<string, unknown> | undefined {
  if (!isRecord(props)) return undefined;

  const safeProps: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith("on") || key === "dangerouslySetInnerHTML") continue;

    if (key === "action" || key === "runtimeAction") {
      const action = sanitizeRuntimeAction(value);
      if (action) safeProps[key] = action;
      continue;
    }

    if (isSafePrimitive(value)) {
      safeProps[key] = value;
      continue;
    }

    if (
      Array.isArray(value) &&
      value.every((item) => isSafePrimitive(item))
    ) {
      safeProps[key] = value;
      continue;
    }

    if (
      key === "rows" &&
      Array.isArray(value) &&
      value.every((row) => Array.isArray(row) && row.every(isSafePrimitive))
    ) {
      safeProps[key] = value;
    }
  }

  return Object.keys(safeProps).length ? safeProps : undefined;
}

function sanitizeStyle(style: unknown): Record<string, string | number> | undefined {
  if (!isRecord(style)) return undefined;

  const safeStyle: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(style)) {
    if (!ALLOWED_STYLE_KEYS.has(key)) continue;
    if (typeof value !== "string" && typeof value !== "number") continue;
    if (typeof value === "string" && /url\s*\(|expression\s*\(/i.test(value)) continue;
    safeStyle[key] = value;
  }

  return Object.keys(safeStyle).length ? safeStyle : undefined;
}

function sanitizeCanvasNode(node: unknown): CanvasNode | null {
  if (!isRecord(node) || !isSafeId(node.id) || typeof node.type !== "string") {
    return null;
  }
  if (!ALLOWED_NODE_TYPES.has(node.type)) return null;

  const children = Array.isArray(node.children)
    ? node.children
        .map((child) => sanitizeCanvasNode(child))
        .filter((child): child is CanvasNode => !!child)
    : undefined;
  const props = sanitizeProps(node.props);
  const style = sanitizeStyle(node.style);

  return {
    id: node.id,
    type: node.type as CanvasNode["type"],
    ...(props ? { props } : {}),
    ...(style ? { style } : {}),
    ...(children?.length ? { children } : {}),
  };
}

export function normalizeCanvasEvent(event: CanvasEvent): CanvasEvent | null {
  if (event.type === "selectNode") {
    return event.id === null || isSafeId(event.id) ? event : null;
  }

  if (event.type === "appendNode") {
    if (!isSafeId(event.parentId)) return null;
    const node = sanitizeCanvasNode(event.node);
    return node ? { type: "appendNode", parentId: event.parentId, node } : null;
  }

  if (!isSafeId(event.id) || !isRecord(event.patch)) return null;
  const props = sanitizeProps(event.patch.props);
  const style = sanitizeStyle(event.patch.style);
  if (!props && !style) return null;

  return {
    type: "updateNode",
    id: event.id,
    patch: {
      ...(props ? { props } : {}),
      ...(style ? { style } : {}),
    },
  };
}

export function getCanvasNodeSelectionPayload(document: CanvasDocument) {
  if (!document.selectedNodeId) return null;
  const path = findCanvasNodePath(document.root, document.selectedNodeId);
  const selectedNode = path?.at(-1);
  if (!path || !selectedNode) return null;

  return {
    selectedNodeId: selectedNode.id,
    part: String(selectedNode.props?.part ?? selectedNode.id),
    path: path.map((node) => node.id),
    type: selectedNode.type,
    props: selectedNode.props ?? {},
    style: selectedNode.style ?? {},
  };
}

export function findCanvasNodePath(
  node: CanvasNode,
  targetId: string,
  path: CanvasNode[] = []
): CanvasNode[] | null {
  const nextPath = [...path, node];
  if (node.id === targetId) return nextPath;

  for (const child of node.children ?? []) {
    const result = findCanvasNodePath(child, targetId, nextPath);
    if (result) return result;
  }

  return null;
}

function updateNodeTree(
  node: CanvasNode,
  targetId: string,
  updater: (node: CanvasNode) => CanvasNode
): { node: CanvasNode; changed: boolean } {
  if (node.id === targetId) {
    return { node: updater(node), changed: true };
  }

  let changed = false;
  const children = (node.children ?? []).map((child) => {
    const result = updateNodeTree(child, targetId, updater);
    changed ||= result.changed;
    return result.node;
  });

  if (!changed) return { node, changed: false };
  return {
    node: {
      ...node,
      children,
    },
    changed: true,
  };
}

export function applyCanvasEvent(
  document: CanvasDocument,
  event: CanvasEvent
): CanvasDocument {
  const normalizedEvent = normalizeCanvasEvent(event);
  if (!normalizedEvent) return document;
  event = normalizedEvent;

  if (event.type === "selectNode") {
    return {
      ...document,
      selectedNodeId: event.id,
    };
  }

  if (event.type === "appendNode") {
    if (findCanvasNodePath(document.root, event.node.id)) {
      const updated = updateNodeTree(document.root, event.node.id, (node) => ({
        ...node,
        type: event.node.type,
        props: { ...(node.props ?? {}), ...(event.node.props ?? {}) },
        style: { ...(node.style ?? {}), ...(event.node.style ?? {}) },
        children: event.node.children ?? node.children,
      }));

      return updated.changed ? { ...document, root: updated.node } : document;
    }

    const result = updateNodeTree(document.root, event.parentId, (node) => ({
      ...node,
      children: [...(node.children ?? []), event.node],
    }));

    if (!result.changed) return document;
    return {
      ...document,
      root: result.node,
    };
  }

  const result = updateNodeTree(document.root, event.id, (node) => ({
    ...node,
    props: event.patch.props ? { ...(node.props ?? {}), ...event.patch.props } : node.props,
    style: event.patch.style ? { ...(node.style ?? {}), ...event.patch.style } : node.style,
  }));

  if (!result.changed) return document;
  return {
    ...document,
    root: result.node,
  };
}
