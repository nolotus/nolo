import { getActiveDialogKey } from "chat/dialog/dialogRuntimeStore";
import { getPreviewTarget, openPreviewTarget } from "app/appInspector/appInspectorStore";
import { readHtmlArtifact } from "app/appInspector/htmlArtifactClient";
import { toast } from "app/utils/toast";

// A single generation fences overlapping reads, without retaining execution history.
let latestExecution = 0;

/** Called only by live tool-result receivers, never by historical card mounts. */
export async function receiveHtmlArtifactToolResult(
  toolName: string,
  result: unknown,
  dialogKey: string,
  isError = false,
): Promise<void> {
  if (isError || (toolName !== "createHtmlArtifact" && toolName !== "updateHtmlArtifact")) return;
  let data: any = result;
  if (typeof data === "string") {
    try { data = JSON.parse(data); } catch { return; }
  }
  if (!data || data.error) return;
  data = data.rawData ?? data;
  if (!data || typeof data !== "object" || data.error) return;
  const artifact = data.artifact ?? data;
  if (!artifact || typeof artifact !== "object") return;
  const id = data.id ?? artifact.id;
  const ownerDialog = data.dialogKey ?? artifact.dialogKey;
  if (typeof id !== "string" || !id || ownerDialog !== dialogKey || getActiveDialogKey() !== dialogKey) return;

  const execution = ++latestExecution;
  const targetBeforeRead = getPreviewTarget();
  try {
    // Read by stable ID: event/UI projections may contain clipped or superseded HTML.
    const latest = await readHtmlArtifact(id);
    if (execution !== latestExecution || getActiveDialogKey() !== dialogKey || getPreviewTarget() !== targetBeforeRead) return;
    if (latest.id !== id || latest.dialogKey !== dialogKey || !latest.html) throw new Error("成品读取结果不匹配");
    openPreviewTarget({ kind: "artifact", artifactId: latest.id, dialogKey: latest.dialogKey, title: latest.title, html: latest.html });
  } catch {
    if (execution === latestExecution && getActiveDialogKey() === dialogKey) {
      toast.error("网页已保存，但读取最新内容失败。请在结果卡片中重试打开。");
    }
  }
}

/**
 * Fire-and-forget delivery of live HTML artifact tool results to the workbench.
 * Fences non-artifact tools and missing dialogKey; execution errors are logged.
 */
export function deliverHtmlArtifactToolResult(
  toolName: string | undefined,
  content: unknown,
  dialogKey: string | undefined,
): void {
  if (!dialogKey || (toolName !== "createHtmlArtifact" && toolName !== "updateHtmlArtifact")) {
    return;
  }
  void receiveHtmlArtifactToolResult(toolName, content, dialogKey).catch((error) =>
    console.error("[htmlArtifact] live result delivery failed", error),
  );
}
