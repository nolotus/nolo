import React, { lazy, memo, Suspense, useMemo } from "react";
import { StreamingMessageText } from "./StreamingMessageText";
import { StreamingStructuredMarkdown } from "./StreamingStructuredMarkdown";
import { buildStreamingMarkdownModel } from "./streamingMarkdownModel";
import type { StreamingReactArtifact } from "./inlineReactArtifactParser";

const IframeArtifactBlock = lazy(() => import("render/web/elements/IframeArtifactBlock"));

function InlineArtifactFallback() {
  return (
    <div className="streaming-inline-artifact__placeholder">
      正在生成预览…
    </div>
  );
}

/**
 * 渲染 artifact 之外的可见文本（visibleText）。
 *
 * 流式（isStreaming=true）：走 StreamingMessageText，用 useStreamingReveal 逐字 reveal。
 * 非流式（历史消息、刷新重挂载）：走静态 markdown，否则 useStreamingReveal 会从空串开始
 * 用 12ms 定时器重播打字机动画（它不感知 isStreaming）。
 */
export const InlineArtifactVisibleText = memo(
  ({ visibleText, isStreaming }: { visibleText: string; isStreaming: boolean }) => {
    const staticModel = useMemo(
      () => (isStreaming ? null : buildStreamingMarkdownModel(visibleText)),
      [visibleText, isStreaming]
    );

    if (!visibleText) return null;

    if (isStreaming) {
      return <StreamingMessageText content={visibleText} isStreaming={isStreaming} />;
    }
    if (staticModel?.kind === "structured") {
      return (
        <StreamingStructuredMarkdown
          nodes={staticModel.nodes}
          renderText={(text) => text}
          cursor={null}
        />
      );
    }
    return <div className="simple-text">{visibleText}</div>;
  }
);

type StreamingInlineReactArtifactProps = {
  /** 从 content 解析出的 visibleText + artifact。 */
  visibleText: string;
  artifact: StreamingReactArtifact | null;
  isStreaming?: boolean;
};

export const StreamingInlineReactArtifact = memo(
  ({ visibleText, artifact, isStreaming = true }: StreamingInlineReactArtifactProps) => {
    return (
      <div className="streaming-inline-artifact">
        <InlineArtifactVisibleText visibleText={visibleText} isStreaming={isStreaming} />
        {artifact && (
          <div className="streaming-inline-artifact__preview">
            <Suspense fallback={<InlineArtifactFallback />}>
              <IframeArtifactBlock
                rawCode={artifact.code}
                className="streaming-inline-artifact__frame"
              />
            </Suspense>
          </div>
        )}
      </div>
    );
  }
);

export default StreamingInlineReactArtifact;