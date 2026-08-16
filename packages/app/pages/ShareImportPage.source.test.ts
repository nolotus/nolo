import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("ShareImportPage source contract", () => {
  it("keeps doc-only transforms and renderer modules out of the eager share detail path", () => {
    const source = readFileSync(join(import.meta.dir, "ShareImportPage.tsx"), "utf8");
    expect(source).not.toContain('from "create/editor/transforms/markdownToSlate"');
    expect(source).not.toContain('from "create/editor/transforms/slateToRenderMarkdown"');
    expect(source).not.toContain('from "create/editor/utils/slateUtils"');
    expect(source).not.toContain('import ShareDocView from "./share/ShareDocView"');
    expect(source).toContain('const ShareDocView = lazy(() => import("./share/ShareDocView"))');
    expect(source).toContain("<ShareDocView");
    expect(source).toContain("<Suspense fallback={<PageLoading message=\"正在渲染分享内容...\" fullHeight={false} />}>");
  });

  it("keeps the rich chat renderer out of the eager dialog share SSR path", () => {
    const source = readFileSync(join(import.meta.dir, "ShareImportPage.tsx"), "utf8");
    expect(source).not.toContain('from "chat/messages/web/ReadOnlyMessageItem"');
    expect(source).not.toContain('from "chat/messages/web/ReadOnlyToolMessageItem"');
    expect(source).not.toContain('from "chat/messages/web/ToolMessageGroup"');
    expect(source).not.toContain('from "chat/messages/web/groupToolMessages"');
    expect(source).not.toContain('from "chat/hooks/useMessageInteraction"');
    expect(source).toContain('import ShareDialogPreview from "./share/ShareDialogPreview"');
    expect(source).toContain('const ShareDialogRichView = lazy(() => import("./share/ShareDialogRichView"))');
    expect(source).toContain("<ShareDialogPreview messages={dialogMessages} />");
  });
});
