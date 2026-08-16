import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf8");

describe("topbar share clipboard fallback", () => {
  test("keeps share creation success separate from clipboard write failures", () => {
    const source = readSource("packages/render/layout/useTopBarState.tsx");

    expect(source).toContain("const result = await (dispatch as any)(");
    expect(source).toContain(
      'import { copyTextToClipboard } from "app/utils/clipboard";',
    );
    expect(source).toContain("const webLink = server");
    expect(source).toContain("`${server}${createWebSharePath(result.token)}`");
    expect(source).toContain('new CustomEvent("nolo:share-created"');
    expect(source).toContain("try {");
    expect(source).toContain("await copyTextToClipboard(webLink);");
    expect(source).toContain("catch (copyError");
    expect(source).toContain('"shareCopyFailed"');
    expect(source).toContain('"shareFailed"');
    expect(source).toContain("duration: 8000");
    expect(source).not.toContain("navigator.clipboard.writeText(webLink)");
    expect(source).not.toContain('toast.error(t("shareCopyFailed"');
  });

  test("blocks sharing a dialog while any message is still running", () => {
    const source = readSource("packages/render/layout/useTopBarState.tsx");

    expect(source).toContain("hasRunningDialogMessages");
    expect(source).toContain('toolPayload?.status === "running"');
    expect(source).toContain('"shareDialogStillRunning"');
    expect(source).toContain("对话仍在运行，完成后再分享");
  });
});
