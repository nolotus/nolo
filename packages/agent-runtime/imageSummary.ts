/** Exact summary of the delivered image payload (not the original file). */
export interface ImageSummary {
  width: number;
  height: number;
  bytes: number;
  path: string;
}

export function formatImageSummary(summary: ImageSummary & { kind: "image" | "screenshot" }): string {
  return `[${summary.kind} ${summary.width}x${summary.height} ${summary.bytes} bytes → ${summary.path}]`;
}
