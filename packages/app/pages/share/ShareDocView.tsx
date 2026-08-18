import React, { useMemo } from "react";
import { markdownToSlate } from "create/editor/transforms/markdownToSlate";
import { slateToRenderMarkdown } from "create/editor/transforms/slateToRenderMarkdown";
import { splitSlateTitleAndBody } from "create/editor/utils/slateUtils";
import { asOptionalTrimmedString } from "core/optionalString";
import type { SharedObject } from "share/types";
import DocImportView from "../share/DocImportView";

const EMPTY_DOC_VALUE = [{ type: "paragraph", children: [{ text: "" }] }];
const EMPTY_SHARED_PAGE_VALUE = [{ type: "paragraph", children: [{ text: "(Empty shared page)" }] }];

const buildInitialValue = (shared: SharedObject) => {
  const pageData = shared.data;
  if (Array.isArray(pageData?.slateData) && pageData.slateData.length > 0) {
    return splitSlateTitleAndBody(pageData.slateData, shared.meta?.title).body;
  }
  if (typeof pageData?.content === "string" && pageData.content.trim()) {
    try {
      return splitSlateTitleAndBody(markdownToSlate(pageData.content), shared.meta?.title).body;
    } catch {
      return EMPTY_SHARED_PAGE_VALUE;
    }
  }
  return EMPTY_SHARED_PAGE_VALUE;
};

const buildMarkdown = (shared: SharedObject, initialValue: any[]) => {
  if (Array.isArray(initialValue) && initialValue.length > 0) {
    const nextMarkdown = slateToRenderMarkdown(initialValue).trim();
    if (nextMarkdown) return nextMarkdown;
  }

  const legacyContent = shared.data?.content;
  return asOptionalTrimmedString(legacyContent) ?? null;
};

const buildDocumentTitle = (shared: SharedObject, fallbackTitle: string) => {
  if (Array.isArray(shared.data?.slateData) && shared.data.slateData.length > 0) {
    return splitSlateTitleAndBody(shared.data.slateData, shared.meta?.title).title || fallbackTitle;
  }

  if (typeof shared.data?.content === "string" && shared.data.content.trim()) {
    try {
      return (
        splitSlateTitleAndBody(markdownToSlate(shared.data.content), shared.meta?.title).title ||
        fallbackTitle
      );
    } catch {
      return fallbackTitle;
    }
  }

  return fallbackTitle;
};

const ShareDocView: React.FC<{
  shared: SharedObject;
  token: string;
  fallbackTitle: string;
}> = ({ shared, token, fallbackTitle }) => {
  const initialValue = useMemo(() => buildInitialValue(shared), [shared]);
  const markdown = useMemo(() => buildMarkdown(shared, initialValue as any[]), [initialValue, shared]);
  const documentTitle = useMemo(
    () => buildDocumentTitle(shared, fallbackTitle),
    [fallbackTitle, shared]
  );

  return (
    <DocImportView
      shared={shared}
      token={token}
      documentTitle={documentTitle}
      initialValue={(initialValue as any) ?? EMPTY_DOC_VALUE}
      markdown={markdown}
    />
  );
};

export default ShareDocView;
