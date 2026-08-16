export type CanvasNodeType =
  | "Canvas"
  | "Stack"
  | "Grid"
  | "Section"
  | "Text"
  | "Button"
  | "Card"
  | "MetricCard"
  | "Chart"
  | "List"
  | "Table"
  | "Toolbar";

export interface CanvasNode {
  id: string;
  type: CanvasNodeType;
  props?: Record<string, unknown>;
  style?: Record<string, string | number>;
  children?: CanvasNode[];
}

export interface CanvasDocument {
  version: 1;
  root: CanvasNode;
  selectedNodeId?: string | null;
}

export type CanvasEvent =
  | {
      type: "appendNode";
      parentId: string;
      node: CanvasNode;
    }
  | {
      type: "updateNode";
      id: string;
      patch: {
        props?: Record<string, unknown>;
        style?: Record<string, string | number>;
      };
    }
  | {
      type: "selectNode";
      id: string | null;
    };
