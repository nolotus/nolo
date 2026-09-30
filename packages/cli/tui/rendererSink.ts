/**
 * Renderer-aware writable sink.
 *
 * Boundary rule (docs/plans/2026-09-29-tui-diagnostics-pipeline.md, phase-0
 * principle 1): while the TUI is active, only the renderer may write the
 * drawing stream. The self-update flow used to take `output` = process.stdout
 * and write captured child output plus progress lines straight into it,
 * which the next composer/history repaint then clips into smears — the same
 * pollution class as the memoryRecall incident.
 *
 * `createRendererSink` adapts that byte sink to the controlled channel:
 * callers hand the returned WritableStream to updateCommands (or any other
 * "writes to output" API) and every line is routed through
 * `emitCommandOutput` — i.e. into the transcript history and back out via
 * the renderer's own repaint.
 *
 * Line semantics:
 *   - chunks are buffered and emitted on '\n' boundaries so one npm chunk
 *     can't split a transcript line;
 *   - '\r' inside a pending line resets it (carriage-return semantics), so
 *     a `\r`-redrawn progress bar collapses to its final frame instead of
 *     one history row per repaint;
 *   - any tail still buffered on end() is emitted.
 */
import { Writable } from "node:stream";

export function createRendererSink(
  emit: (line: string) => void,
): NodeJS.WritableStream {
  let pending = "";

  const flushLines = (final: boolean) => {
    let newline: number;
    while ((newline = pending.indexOf("\n")) >= 0) {
      let line = pending.slice(0, newline);
      pending = pending.slice(newline + 1);
      const cr = line.lastIndexOf("\r");
      if (cr >= 0) line = line.slice(cr + 1);
      if (line) emit(line);
    }
    if (final && pending) {
      const cr = pending.lastIndexOf("\r");
      emit(cr >= 0 ? pending.slice(cr + 1) : pending);
      pending = "";
    }
  };

  return new Writable({
    write(chunk, _encoding, callback) {
      pending += typeof chunk === "string" ? chunk : chunk.toString("utf8");
      flushLines(false);
      callback();
    },
    final(callback) {
      flushLines(true);
      callback();
    },
  });
}
