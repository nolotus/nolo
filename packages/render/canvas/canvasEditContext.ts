import React from "react";
import type { AgentRuntimeOptions } from "ai/agent/types";
import type { CanvasEvent } from "./types";

export type CanvasEditSelection = {
  sourceMessageId?: string;
  selectedNodeId: string;
  part: string;
  path: string[];
  type: string;
  props: Record<string, unknown>;
  style: Record<string, unknown>;
};

const CANVAS_EDIT_SELECTION_EVENT = "nolo:canvas-edit-selection";

let currentSelection: CanvasEditSelection | null = null;
let pendingSelection: CanvasEditSelection | null = null;
const listeners = new Set<(selection: CanvasEditSelection | null) => void>();
const patchListeners = new Map<string, Set<(events: CanvasEvent[]) => void>>();
const queuedPatches = new Map<string, CanvasEvent[][]>();

export function publishCanvasEditSelection(
  selection: CanvasEditSelection | null
) {
  currentSelection = selection;
  listeners.forEach((listener) => listener(selection));

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(CANVAS_EDIT_SELECTION_EVENT, { detail: selection })
    );
  }
}

export function subscribeCanvasEditSelection(
  listener: (selection: CanvasEditSelection | null) => void
) {
  listeners.add(listener);
  listener(currentSelection);
  return () => {
    listeners.delete(listener);
  };
}

export function useCanvasEditSelection() {
  const [selection, setSelection] =
    React.useState<CanvasEditSelection | null>(currentSelection);

  React.useEffect(
    () => subscribeCanvasEditSelection(setSelection),
    []
  );

  return selection;
}

export function markPendingCanvasEditSelection(
  selection: CanvasEditSelection | null
) {
  pendingSelection = selection;
}

export function consumePendingCanvasEditSelection() {
  const selection = pendingSelection;
  pendingSelection = null;
  return selection;
}

export function publishCanvasMessagePatch(
  sourceMessageId: string,
  events: CanvasEvent[]
) {
  if (!events.length) return;

  const queued = queuedPatches.get(sourceMessageId) ?? [];
  queued.push(events);
  queuedPatches.set(sourceMessageId, queued);

  patchListeners
    .get(sourceMessageId)
    ?.forEach((listener) => listener(events));
}

export function subscribeCanvasMessagePatches(
  sourceMessageId: string,
  listener: (events: CanvasEvent[]) => void
) {
  const listenersForMessage = patchListeners.get(sourceMessageId) ?? new Set();
  listenersForMessage.add(listener);
  patchListeners.set(sourceMessageId, listenersForMessage);

  queuedPatches
    .get(sourceMessageId)
    ?.forEach((events) => listener(events));

  return () => {
    listenersForMessage.delete(listener);
    if (!listenersForMessage.size) {
      patchListeners.delete(sourceMessageId);
    }
  };
}

export function buildCanvasNodeEditingTarget(
  selection: CanvasEditSelection
): NonNullable<AgentRuntimeOptions["editingTarget"]> {
  return {
    kind: "canvas_node",
    key: selection.selectedNodeId,
    title: selection.part,
    summary: [
      "用户正在编辑 Canvas Tree 画布中的一个已选中节点。",
      "只输出针对选中节点的 canvas_snapshot updateNode 事件，除非用户明确要求新增内容。",
      "不要重建整棵树，不要输出 Markdown、解释、React、HTML、CSS 或 JS 源码。",
    ].join("\n"),
    metadata: {
      sourceMessageId: selection.sourceMessageId,
      selectedNodeId: selection.selectedNodeId,
      part: selection.part,
      path: selection.path,
      type: selection.type,
      props: selection.props,
      style: selection.style,
    },
  };
}
