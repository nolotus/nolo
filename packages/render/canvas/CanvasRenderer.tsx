import React, { useState } from "react";
import {
  parseCanvasRuntimeAction,
  reduceCanvasRuntimeAction,
  type CanvasRuntimeState,
} from "./canvasRuntime";
import type { CanvasNode } from "./types";

type CanvasRendererProps = {
  node: CanvasNode;
  selectedNodeId?: string | null;
  onSelectNode?: (node: CanvasNode, event: React.MouseEvent) => void;
  runtimeState?: CanvasRuntimeState;
  onRuntimeStateChange?: (state: CanvasRuntimeState) => void;
};

const toneColors: Record<string, { bg: string; border: string; text: string; solid: string }> = {
  neutral: { bg: "#f8fafc", border: "#e2e8f0", text: "#334155", solid: "#64748b" },
  success: { bg: "#ecfdf5", border: "#bbf7d0", text: "#047857", solid: "#16a34a" },
  warning: { bg: "#fffbeb", border: "#fde68a", text: "#b45309", solid: "#f59e0b" },
  danger: { bg: "#fef2f2", border: "#fecaca", text: "#b91c1c", solid: "#dc2626" },
  info: { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8", solid: "#2563eb" },
};

const getTone = (tone: unknown) =>
  toneColors[String(tone || "neutral")] ?? toneColors.neutral;

function getNodeToneStyle(node: CanvasNode): React.CSSProperties {
  const tone = toneColors[String(node.props?.tone || "")];
  if (!tone || node.type === "MetricCard") return node.style ?? {};

  return {
    background: tone.bg,
    borderColor: tone.border,
    color: tone.text,
    ...(node.style ?? {}),
  };
}

function renderChildren(props: CanvasRendererProps) {
  return (props.node.children ?? []).map((child) => (
    <CanvasRenderer
      key={child.id}
      node={child}
      selectedNodeId={props.selectedNodeId}
      onSelectNode={props.onSelectNode}
      runtimeState={props.runtimeState}
      onRuntimeStateChange={props.onRuntimeStateChange}
    />
  ));
}

function isNodeVisible(node: CanvasNode, runtimeState: CanvasRuntimeState) {
  const stateKey = node.props?.stateKey;
  if (typeof stateKey !== "string") return true;
  if (!("visibleWhen" in (node.props ?? {}))) return true;
  return runtimeState[stateKey] === node.props?.visibleWhen;
}

export function CanvasRenderer({
  node,
  selectedNodeId,
  onSelectNode,
  runtimeState,
  onRuntimeStateChange,
}: CanvasRendererProps) {
  const [localRuntimeState, setLocalRuntimeState] = useState<CanvasRuntimeState>(
    runtimeState ?? {}
  );
  const effectiveRuntimeState = runtimeState ?? localRuntimeState;
  const updateRuntimeState = (nextState: CanvasRuntimeState) => {
    setLocalRuntimeState(nextState);
    onRuntimeStateChange?.(nextState);
  };
  const runRuntimeAction = (actionValue: unknown) => {
    if (onSelectNode) return false;
    const action = parseCanvasRuntimeAction(actionValue);
    if (!action) return false;
    if (action.type === "scrollTo") {
      const escapedTargetId =
        typeof globalThis.CSS?.escape === "function"
          ? CSS.escape(action.targetId)
          : action.targetId.replace(/"/g, '\\"');
      document
        .querySelector(`[data-canvas-node-id="${escapedTargetId}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return true;
    }
    updateRuntimeState(reduceCanvasRuntimeAction(effectiveRuntimeState, action));
    return true;
  };

  if (!isNodeVisible(node, effectiveRuntimeState)) {
    return null;
  }

  const selected = selectedNodeId === node.id;
  const commonProps = {
    "data-canvas-node-id": node.id,
    "data-canvas-part": String(node.props?.part ?? node.id),
    className: `canvas-node canvas-node--${node.type.toLowerCase()}${selected ? " is-selected" : ""}`,
    style: getNodeToneStyle(node),
    onClick: (event: React.MouseEvent) => {
      if (!onSelectNode) return;
      event.stopPropagation();
      onSelectNode(node, event);
    },
  };
  const childProps = {
    node,
    selectedNodeId,
    onSelectNode,
    runtimeState: effectiveRuntimeState,
    onRuntimeStateChange: updateRuntimeState,
  };
  const interactiveAction = node.props?.runtimeAction ?? node.props?.action;

  switch (node.type) {
    case "Canvas":
      return <div {...commonProps}>{renderChildren(childProps)}</div>;

    case "Stack":
      return <div {...commonProps}>{renderChildren(childProps)}</div>;

    case "Grid":
      return <div {...commonProps}>{renderChildren(childProps)}</div>;

    case "Section":
      return (
        <section {...commonProps}>
          {node.props?.eyebrow != null && node.props.eyebrow !== "" ? (
            <div className="canvas-eyebrow">{String(node.props.eyebrow)}</div>
          ) : null}
          {node.props?.title != null && node.props.title !== "" ? (
            <h2>{String(node.props.title)}</h2>
          ) : null}
          {node.props?.description != null && node.props.description !== "" ? (
            <p>{String(node.props.description)}</p>
          ) : null}
          {renderChildren(childProps)}
        </section>
      );

    case "Toolbar":
      return (
        <header {...commonProps}>
          <div>
            <strong>{String(node.props?.title ?? "Canvas")}</strong>
            {node.props?.subtitle != null && node.props.subtitle !== "" ? (
              <span>{String(node.props.subtitle)}</span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={(event) => {
              if (runRuntimeAction(interactiveAction)) {
                event.stopPropagation();
              }
            }}
          >
            {String(
              typeof node.props?.action === "string" ? node.props.action : "导出"
            )}
          </button>
        </header>
      );

    case "Text":
      return <p {...commonProps}>{String(node.props?.text ?? "")}</p>;

    case "Button":
      return (
        <button
          {...commonProps}
          type="button"
          onClick={(event) => {
            if (runRuntimeAction(interactiveAction)) {
              event.stopPropagation();
              return;
            }
            commonProps.onClick(event);
          }}
        >
          {String(node.props?.label ?? "Button")}
        </button>
      );

    case "Card":
      return (
        <article {...commonProps}>
          {node.props?.title != null && node.props.title !== "" ? (
            <h3>{String(node.props.title)}</h3>
          ) : null}
          {node.props?.body != null || node.props?.value != null || node.props?.text != null ? (
            <p>{String(node.props.body ?? node.props.value ?? node.props.text)}</p>
          ) : null}
          {renderChildren(childProps)}
        </article>
      );

    case "MetricCard": {
      const tone = getTone(node.props?.tone);
      return (
        <article
          {...commonProps}
          style={{
            background: tone.bg,
            borderColor: tone.border,
            ...(node.style ?? {}),
          }}
        >
          <span style={{ color: tone.text }}>{String(node.props?.title ?? "Metric")}</span>
          <strong>{String(node.props?.value ?? "-")}</strong>
          {node.props?.delta != null && node.props.delta !== "" ? (
            <em>{String(node.props.delta)}</em>
          ) : null}
        </article>
      );
    }

    case "Chart": {
      const values = Array.isArray(node.props?.values)
        ? (node.props?.values as number[])
        : [24, 38, 34, 48, 44, 58, 62];
      const max = Math.max(...values, 1);
      const tone = getTone(node.props?.tone);
      const barBackground = String(
        node.props?.barColor ?? node.style?.color ?? tone.solid
      );
      return (
        <section {...commonProps}>
          <div className="canvas-chart__header">
            <h3>{String(node.props?.title ?? "趋势图")}</h3>
            <span>{String(node.props?.caption ?? "最近 7 天")}</span>
          </div>
          <div className="canvas-chart__bars">
            {values.map((value, index) => (
              <div
                key={`${index}-${value}`}
                style={{
                  background: barBackground,
                  height: `${Math.max(12, (value / max) * 100)}%`,
                }}
              >
                <span>{value}</span>
              </div>
            ))}
          </div>
        </section>
      );
    }

    case "List": {
      const items = Array.isArray(node.props?.items) ? node.props.items : [];
      return (
        <section {...commonProps}>
          <h3>{String(node.props?.title ?? "列表")}</h3>
          <ul>
            {items.map((item, index) => (
              <li key={`${String(item)}-${index}`}>
                {String(item)}
              </li>
            ))}
          </ul>
        </section>
      );
    }

    case "Table": {
      const columns = Array.isArray(node.props?.columns) ? node.props.columns : [];
      const rows = Array.isArray(node.props?.rows) ? node.props.rows : [];
      return (
        <section {...commonProps}>
          <h3>{String(node.props?.title ?? "表格")}</h3>
          <div className="canvas-table">
            <table>
              <thead>
                <tr>
                  {columns.map((column, index) => (
                    <th key={`${String(column)}-${index}`}>
                      {String(column)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => {
                  const cells = Array.isArray(row) ? row : columns.map((column) =>
                    typeof row === "object" && row !== null
                      ? (row as Record<string, unknown>)[String(column)]
                      : ""
                  );
                  const rowKey =
                    typeof row === "object" && row !== null && "id" in row
                      ? String((row as { id: unknown }).id)
                      : `row-${rowIndex}-${cells.map((c) => String(c ?? "")).join("|").slice(0, 48)}`;
                  return (
                    <tr key={rowKey}>
                      {cells.map((cell, cellIndex) => (
                        <td key={`${String(cell ?? "")}-${cellIndex}`}>
                          {String(cell ?? "")}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      );
    }

    default:
      return <div {...commonProps}>{renderChildren(childProps)}</div>;
  }
}

export default CanvasRenderer;
