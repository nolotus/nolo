import {
  applyCanvasEvent,
  createCanvasDocument,
  normalizeCanvasEvent,
} from "./canvasTree";
import type { CanvasDocument, CanvasEvent } from "./types";

export type ParsedCanvasSnapshotMessage = {
  document: CanvasDocument;
  events: CanvasEvent[];
  eventCount: number;
};

export function hasCanvasSnapshotSignal(content: string): boolean {
  return content.includes("canvas_snapshot");
}

export function extractCanvasSnapshotText(content: unknown): string | null {
  if (typeof content === "string") {
    return hasCanvasSnapshotSignal(content) ? content : null;
  }
  if (!Array.isArray(content)) return null;

  const text = content
    .map((item) =>
      item?.type === "text" && typeof item.text === "string" ? item.text : ""
    )
    .filter(Boolean)
    .join("\n");

  return hasCanvasSnapshotSignal(text) ? text : null;
}

function isCanvasEvent(value: unknown): value is CanvasEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as { type?: unknown };
  return (
    event.type === "appendNode" ||
    event.type === "updateNode" ||
    event.type === "selectNode"
  );
}

export function parseCanvasSnapshotMessage(
  content: string
): ParsedCanvasSnapshotMessage | null {
  if (!hasCanvasSnapshotSignal(content)) return null;

  let document = createCanvasDocument("root");
  const events: CanvasEvent[] = [];
  let eventCount = 0;

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{") || !trimmed.includes("canvas_snapshot")) {
      continue;
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (parsed?.type !== "canvas_snapshot" || !isCanvasEvent(parsed.event)) {
        continue;
      }
      const event = normalizeCanvasEvent(parsed.event);
      if (!event) continue;
      document = applyCanvasEvent(document, event);
      events.push(event);
      eventCount += 1;
    } catch {
      // Streaming messages often end with a partial JSON line. Ignore it until
      // the next render provides a complete line.
    }
  }

  return eventCount > 0 ? { document, events, eventCount } : null;
}
