import React, { memo, useEffect, useMemo, useState, useRef } from "react";
import {
  applyCanvasEvent,
  createCanvasDocument,
} from "./canvasTree";
import { parseCanvasSnapshotMessage } from "./canvasSnapshotParser";
import { CanvasRenderer } from "./CanvasRenderer";
import {
  consumePendingCanvasEditSelection,
  publishCanvasMessagePatch,
  subscribeCanvasMessagePatches,
} from "./canvasEditContext";
import type { CanvasEvent } from "./types";
import "./canvasTreeDemo.css";

export const CanvasSnapshotMessage = memo(({
  content,
  messageId,
}: {
  content: string;
  messageId?: string;
}) => {
  const parsed = useMemo(() => parseCanvasSnapshotMessage(content), [content]);
  const [visibleEventCount, setVisibleEventCount] = useState(0);
  const countRef = useRef(visibleEventCount);
  useEffect(() => {
    countRef.current = visibleEventCount;
  }, [visibleEventCount]);
  // Related patch state co-located so messageId reset is a single update.
  const [patchState, setPatchState] = useState<{
    events: CanvasEvent[];
    appliedSourceMessageId: string | null;
  }>({ events: [], appliedSourceMessageId: null });
  const messagePatchEvents = patchState.events;
  const appliedPatchSourceMessageId = patchState.appliedSourceMessageId;

  const isPatchOnlyMessage = !!parsed && parsed.events.every(
    (event) => event.type !== "appendNode"
  );

  useEffect(() => {
    if (!parsed) {
      setVisibleEventCount(0);
      return;
    }

    if (isPatchOnlyMessage) {
      setVisibleEventCount(parsed.eventCount);
      return;
    }

    setVisibleEventCount((count) =>
      Math.min(Math.max(count, 1), parsed.eventCount)
    );
    const timer = window.setInterval(() => {
      if (countRef.current >= parsed.eventCount) {
        window.clearInterval(timer);
        return;
      }
      setVisibleEventCount((count) => count + 1);
    }, 140);

    return () => window.clearInterval(timer);
  }, [isPatchOnlyMessage, parsed]);

  useEffect(() => {
    setPatchState({ events: [], appliedSourceMessageId: null });
    if (!messageId) return;
    return subscribeCanvasMessagePatches(messageId, (events) => {
      setPatchState((current) => ({
        ...current,
        events: [...current.events, ...events],
      }));
    });
  }, [messageId]);

  useEffect(() => {
    if (!parsed || !isPatchOnlyMessage || appliedPatchSourceMessageId) return;

    const selection = consumePendingCanvasEditSelection();
    if (!selection?.sourceMessageId) return;

    publishCanvasMessagePatch(selection.sourceMessageId, parsed.events);
    setPatchState((current) => ({
      ...current,
      appliedSourceMessageId: selection.sourceMessageId ?? null,
    }));
  }, [appliedPatchSourceMessageId, isPatchOnlyMessage, parsed]);

  const document = useMemo(() => {
    if (!parsed) return null;
    const visibleDocument = parsed.events
      .slice(0, visibleEventCount)
      .reduce(
        (currentDocument, event) => applyCanvasEvent(currentDocument, event),
        createCanvasDocument("root")
      );
    const patchedDocument = messagePatchEvents.reduce(
      (currentDocument, event) => applyCanvasEvent(currentDocument, event),
      visibleDocument
    );
    return patchedDocument;
  }, [messagePatchEvents, parsed, visibleEventCount]);

  if (!document || !parsed) {
    return (
      <section className="canvas-message">
        <div className="canvas-message__stage canvas-message__stage--pending">
          <div className="canvas-message__pending">
            <span />
            <strong>正在生成画布</strong>
          </div>
        </div>
      </section>
    );
  }

  if (isPatchOnlyMessage) {
    return (
      <section className="canvas-message canvas-message--applied">
        <div className="canvas-message__applied">
          <strong>已应用到原画布</strong>
          <span>{parsed.eventCount} 个修改</span>
        </div>
      </section>
    );
  }

  return (
    <section className="canvas-message">
      <div className="canvas-message__stage">
        <CanvasRenderer node={document.root} />
      </div>
      <footer className="canvas-message__footer">
        <span>{visibleEventCount}/{parsed.eventCount} 个画布事件</span>
      </footer>
    </section>
  );
});

export default CanvasSnapshotMessage;
