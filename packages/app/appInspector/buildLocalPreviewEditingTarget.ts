// packages/app/appInspector/buildLocalPreviewEditingTarget.ts
//
// 本地预览里选中的 DOM 节点 -> agent 的 editingTarget。
//
// 只在当前对话没有自己的 editingTarget 时才使用：App Builder 那条链路会把
// selectedNode 塞进它自己的 app editingTarget（见 ObjectAssistantPanel），
// 不能被这里覆盖。

import type { AppSelectedNode } from "./appInspectorStore";

export const LOCAL_PREVIEW_EDITING_KIND = "local_preview";

export function buildLocalPreviewEditingTarget(node: AppSelectedNode) {
  return {
    kind: LOCAL_PREVIEW_EDITING_KIND,
    ...(node.noloLoc ? { key: node.noloLoc } : {}),
    title: node.tagName,
    metadata: { selectedNode: node },
  };
}
