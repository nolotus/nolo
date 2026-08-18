import { describe, expect, test, mock } from "bun:test";
import React from "react";
import { renderInDom } from "../../testing/domRender";
import { deduplicateFiles, useClipboardFiles } from "./useClipboardFiles";

const HookProbe: React.FC<{ onFiles: (files: File[]) => void; onHook: (hook: ReturnType<typeof useClipboardFiles>) => void }> = ({ onFiles, onHook }) => {
  const hook = useClipboardFiles(onFiles);
  onHook(hook);
  return null;
};

describe("useClipboardFiles", () => {
  test("deduplicateFiles filters identical files in single clipboard payload", () => {
    const file1 = new File(["content1"], "photo.png", { type: "image/png", lastModified: 1000 });
    const file2 = new File(["content1"], "photo.png", { type: "image/png", lastModified: 1000 });
    const file3 = new File(["content2"], "other.png", { type: "image/png", lastModified: 2000 });

    const result = deduplicateFiles([file1, file2, file3]);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("photo.png");
    expect(result[1].name).toBe("other.png");
  });

  test("handlePaste stops propagation and passes deduplicated files", async () => {
    const onFiles = mock();
    let hookInstance: ReturnType<typeof useClipboardFiles> | null = null;

    const view = await renderInDom(
      <HookProbe onFiles={onFiles} onHook={(h) => { hookInstance = h; }} />
    );

    try {
      const file1 = new File(["content1"], "photo.png", { type: "image/png", lastModified: 1000 });
      const file2 = new File(["content1"], "photo.png", { type: "image/png", lastModified: 1000 });

      let stopped = false;
      const fakeEvent: any = {
        clipboardData: {
          files: [file1, file2],
        },
        stopPropagation: () => {
          stopped = true;
        },
      };

      hookInstance!.handlePaste(fakeEvent);

      expect(stopped).toBe(true);
      expect(onFiles).toHaveBeenCalledTimes(1);
      const passedFiles = onFiles.mock.calls[0][0];
      expect(passedFiles).toHaveLength(1);
      expect(passedFiles[0].name).toBe("photo.png");
    } finally {
      await view.cleanup();
    }
  });
});
