import { spillToolOutput, countLines } from "./toolSpillStore";

export const TOOL_OUTPUT_SPILL_BYTES = 30 * 1024;
export const TOOL_OUTPUT_SPILL_LINES = 800;
const HEAD_LINES = 30;
const TAIL_LINES = 50;
// Bound pathological single lines as well as ordinary line-oriented logs.
const PREVIEW_CHARS = 12 * 1024;
const MARKER = /\[Omitted \d+ lines \([\d.]+ KB\)\. Full output saved to [^\n]+\]/;

export function isSpilledToolOutput(text: string): boolean {
  return MARKER.test(text) && text.length <= PREVIEW_CHARS * 2 + 2048;
}

export function formatSpilledToolOutput(args: {
  head: string; tail: string; totalLines: number; byteLength: number; displayPath: string;
}): string {
  const headLines = args.head.split("\n").slice(0, HEAD_LINES);
  const tailLines = args.tail.split("\n").slice(-TAIL_LINES);
  const head = headLines.join("\n").slice(0, PREVIEW_CHARS);
  const tail = tailLines.join("\n").slice(-PREVIEW_CHARS);
  const omitted = Math.max(0, args.totalLines - headLines.length - tailLines.length);
  return `${head}\n\n[Omitted ${omitted} lines (${(args.byteLength / 1024).toFixed(1)} KB). Full output saved to ${args.displayPath}]\n\n${tail}`;
}

/** Called once before durable history insertion; subsequent projections are no-ops. */
export function spillLargeToolOutput(content: string, toolName?: string, workspaceRoot?: string): string {
  if (isSpilledToolOutput(content)) return content;
  const byteLength = Buffer.byteLength(content);
  const totalLines = countLines(content);
  if (byteLength <= TOOL_OUTPUT_SPILL_BYTES && totalLines <= TOOL_OUTPUT_SPILL_LINES) return content;
  // Do not discard the original if the filesystem cannot retain it.
  try {
    const spill = spillToolOutput({ content, toolName, workspaceRoot });
    return formatSpilledToolOutput({ head: content, tail: content, totalLines, byteLength, displayPath: spill.displayPath });
  } catch {
    // Retain the source on write failure; do not advertise a nonexistent file.
    // The ordinary provider budget guard still prevents an oversized request.
    return content;
  }
}
