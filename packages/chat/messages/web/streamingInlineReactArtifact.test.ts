import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extractStreamingInlineReactArtifact } from "./inlineReactArtifactParser";

describe("extractStreamingInlineReactArtifact", () => {
  it("returns plain streaming text when there is no React preview block", () => {
    const result = extractStreamingInlineReactArtifact("这里是普通回答。");

    expect(result.visibleText).toBe("这里是普通回答。");
    expect(result.artifact).toBeNull();
  });

  it("hides a complete tsx preview block and returns it as the artifact", () => {
    const result = extractStreamingInlineReactArtifact(`先看这个交互图表：

\`\`\`tsx preview
function Example() {
  return <button>下一步</button>;
}
\`\`\`

可以继续调整。`);

    expect(result.visibleText).toContain("先看这个交互图表：");
    expect(result.visibleText).toContain("可以继续调整。");
    expect(result.visibleText).not.toContain("function Example");
    expect(result.visibleText).not.toContain("<button>");
    expect(result.artifact).toEqual({
      language: "tsx",
      code: "function Example() {\n  return <button>下一步</button>;\n}",
      complete: true,
    });
  });

  it("uses an open streaming jsx block as a preview candidate while hiding source", () => {
    const result = extractStreamingInlineReactArtifact(`正在生成：

\`\`\`jsx
function Example() {
  return <div className="card">Hello</div>;
}`);

    expect(result.visibleText).toBe("正在生成：");
    expect(result.visibleText).not.toContain("className");
    expect(result.artifact?.language).toBe("jsx");
    expect(result.artifact?.complete).toBe(false);
    expect(result.artifact?.code).toContain("function Example()");
  });

  it("keeps the latest React preview block when several snapshots were streamed", () => {
    const result = extractStreamingInlineReactArtifact(`版本一：
\`\`\`tsx
function Example() {
  return <div>旧版</div>;
}
\`\`\`

版本二：
\`\`\`tsx
function Example() {
  return <button onClick={() => alert("ok")}>新版</button>;
}
\`\`\``);

    expect(result.visibleText).toContain("版本一：");
    expect(result.visibleText).toContain("版本二：");
    expect(result.visibleText).not.toContain("旧版");
    expect(result.visibleText).not.toContain("新版");
    expect(result.artifact?.code).toContain("新版");
    expect(result.artifact?.complete).toBe(true);
  });
});

describe("StreamingInlineReactArtifact source contract", () => {
  const source = readFileSync(
    join(import.meta.dir, "StreamingInlineReactArtifact.tsx"),
    "utf8"
  );

  it("renders inline visual artifacts through the iframe runtime", () => {
    expect(source).toContain("IframeArtifactBlock");
    expect(source).not.toContain("ReactLiveBlock");
    expect(source).not.toContain("useLazyScope");
  });

  // 回归：非流式时 visibleText 不应走 StreamingMessageText（其内部 useStreamingReveal
  // 不感知 isStreaming，挂载即从头逐字 reveal，导致历史消息重播打字机动画）。
  it("does not replay the streaming typewriter on non-streaming visible text", () => {
    expect(source).toContain("if (isStreaming)");
    expect(source).toContain("StreamingMessageText");
    expect(source).toContain("StreamingStructuredMarkdown");
    expect(source).toContain("buildStreamingMarkdownModel");
  });
});
