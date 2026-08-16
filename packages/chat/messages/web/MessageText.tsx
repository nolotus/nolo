import React, { memo, useMemo } from "react";
import { StreamingInlineReactArtifact, InlineArtifactVisibleText } from "./StreamingInlineReactArtifact";
import { extractStreamingInlineReactArtifact } from "./inlineReactArtifactParser";

export function normalizeMessageMarkdownLinks(content: string): string {
  return content.replace(
    /(^|[\s（])((?:\/setting\/secrets|\/settings\/secrets)\?key=[A-Z0-9_]+&source=[a-z0-9_-]+)/g,
    (_match, prefix: string, url: string) => `${prefix}[${url}](${url.replace("/settings/", "/setting/")})`
  );
}

export const MessageText = memo(
  ({
    content,
    role,
    isStreaming = false,
  }: {
    content: string;
    role: "self" | "other";
    isStreaming?: boolean;
  }) => {
    // Hooks 始终在顶层无条件执行（React Rules of Hooks），内部短路避免
    // role==="self" 时的正则和 markdown 解析开销。
    const normalizedContent = useMemo(
      () => (role === "self" ? content : normalizeMessageMarkdownLinks(content)),
      [content, role],
    );
    const inlineArtifact = useMemo(
      () => (role === "self" ? null : extractStreamingInlineReactArtifact(normalizedContent)),
      [normalizedContent, role],
    );

    if (role === "self") {
      return (
        <div className="message-text">
          <div className="simple-text">{content}</div>
        </div>
      );
    }

    const hasInlineArtifact = !!inlineArtifact?.artifact;

    // 流式期间（isStreaming=true）始终用 StreamingInlineReactArtifact，保持 React 节点
    // 挂载稳定。若流式中从 InlineArtifactVisibleText 切到 StreamingInlineReactArtifact，
    // React 会 unmount 旧组件，useStreamingReveal 状态丢失，已输出文字瞬间缩回并从头
    // 重播打字机。
    if (isStreaming || hasInlineArtifact) {
      return (
        <div className="message-text">
          <StreamingInlineReactArtifact
            visibleText={inlineArtifact?.visibleText ?? normalizedContent}
            artifact={inlineArtifact?.artifact ?? null}
            isStreaming={isStreaming}
          />
        </div>
      );
    }

    return (
      <div className="message-text">
        <InlineArtifactVisibleText visibleText={normalizedContent} isStreaming={false} />
      </div>
    );
  }
);

export default MessageText;
