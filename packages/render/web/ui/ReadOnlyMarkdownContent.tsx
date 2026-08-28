import "../ui.css";
import React, { useEffect, useMemo, useState } from "react";
import { useAppSelector } from "app/store";
import { selectRuntimeCurrentServer } from "app/stateViews/runtime";
import PageLoading from "./PageLoading";

type Props = {
  markdown?: string | null;
  fallback?: React.ReactNode;
  className?: string;
};

const MENTION_PATTERN = /@\[(\w+):([^\]|]+)\|([^\]]+)\]/;

const ReadOnlyMarkdownContent: React.FC<Props> = ({
  markdown,
  fallback = null,
  className = "",
}) => {
  const [html, setHtml] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const currentServer = useAppSelector(selectRuntimeCurrentServer);

  const normalizedMarkdown = useMemo(() => {
    if (typeof markdown !== "string") return "";
    const trimmed = markdown.trim();
    return trimmed;
  }, [markdown]);

  const canRenderMarkdown = normalizedMarkdown.length > 0 && !MENTION_PATTERN.test(normalizedMarkdown);
  const endpoint = useMemo(() => {
    if (!currentServer) return "/api/render-markdown";
    try {
      return new URL("/api/render-markdown", currentServer).toString();
    } catch {
      return "/api/render-markdown";
    }
  }, [currentServer]);

  useEffect(() => {
    if (!canRenderMarkdown) {
      setHtml(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ markdown: normalizedMarkdown }),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Render markdown failed: ${response.status}`);
        }
        return response.json() as Promise<{ html?: string }>;
      })
      .then((payload) => {
        if (cancelled) return;
        setHtml(typeof payload.html === "string" ? payload.html : null);
      })
      .catch(() => {
        if (cancelled) return;
        setHtml(null);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canRenderMarkdown, endpoint, normalizedMarkdown]);

  if (html) {
    return (
      <div className={`ReadOnlyMarkdownContent ${className}`.trim()}>
        <article
          className="ReadOnlyMarkdownContent__body"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    );
  }

  if (isLoading && canRenderMarkdown) {
    return <PageLoading message="正在渲染内容..." fullHeight={false} />;
  }

  return <>{fallback}</>;
};

export default ReadOnlyMarkdownContent;
