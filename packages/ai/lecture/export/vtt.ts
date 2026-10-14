/** WebVTT shares SRT's composed text mapping/fallback contract in common.ts. */
import type { ExportOptions, LectureResult } from "../types";
import { cueRange, resolveOptions, subtitleRows } from "./common";

export function exportVtt(result: LectureResult, options: ExportOptions): string {
  const resolved = resolveOptions(result, options);
  const cues = subtitleRows(result, resolved.includeExcluded, resolved.lang).map((row, i) => {
    const range = cueRange(row.segment, ".");
    return [String(i + 1), `${range.start} --> ${range.end}`, ...row.lines].join("\n");
  });
  return cues.length ? `WEBVTT\n\n${cues.join("\n\n")}\n` : "WEBVTT\n";
}
