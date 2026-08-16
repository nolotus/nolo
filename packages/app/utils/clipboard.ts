//  app/utils/fileUtils.ts

interface CopyOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

const fallbackCopyTextToClipboard = (text: string): void => {
  if (typeof document === "undefined") {
    throw new Error("Clipboard fallback requires a document.");
  }
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";
  textArea.setAttribute("readonly", "");
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand("copy");
    if (!successful) {
      throw new Error("Fallback clipboard copy failed.");
    }
  } finally {
    document.body.removeChild(textArea);
  }
};

const isDesktopApp = (): boolean =>
  typeof window !== "undefined" && (window as any).__NOLO_DESKTOP__ === true;

const copyTextWithDesktopBridge = async (text: string): Promise<void> => {
  if (!isDesktopApp()) {
    throw new Error("Desktop clipboard bridge is unavailable.");
  }

  const response = await fetch("/api/desktop/clipboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) {
    throw new Error(`Desktop clipboard bridge failed: HTTP ${response.status}`);
  }
};

export const copyTextToClipboard = async (text: string): Promise<void> => {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    navigator.clipboard.writeText
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      try {
        fallbackCopyTextToClipboard(text);
        return;
      } catch {
        await copyTextWithDesktopBridge(text);
        return;
      }
    }
  }

  try {
    fallbackCopyTextToClipboard(text);
  } catch {
    await copyTextWithDesktopBridge(text);
  }
};

const copyToClipboard = (text: string, options: CopyOptions = {}): void => {
  const { onSuccess, onError } = options;
  copyTextToClipboard(text)
    .then(() => onSuccess?.())
    .catch((err) =>
      onError?.(err instanceof Error ? err : new Error("Failed to copy"))
    );
};

export default copyToClipboard;
