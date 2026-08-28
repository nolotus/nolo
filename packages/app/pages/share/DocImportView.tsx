import "./DocImportView.css";
import React, { Suspense, lazy, useCallback, useState } from "react";
import type { Descendant } from "slate";
import { useAppSelector } from "app/store";
import { useToken } from "identity";
import { selectRemoteServer } from "app/settings/settingSlice";
import { asOptionalTrimmedString } from "core/optionalString";
import { asTrimmedString } from "core/trimmedString";
import type { SharedObject } from "share/types";
import PageLoading from "render/web/ui/PageLoading";
import ReadOnlyMarkdownContent from "render/web/ui/ReadOnlyMarkdownContent";
import ImportBar, { type ImportStatus } from "./ImportBar";
import { useCurrentSpaceId } from "create/space/spaceCurrentStore";

const Editor = lazy(() => import("create/editor/Editor"));

interface Props {
  shared: SharedObject;
  token: string;
  documentTitle?: string | null;
  initialValue: Descendant[];
  markdown?: string | null;
}

const PlainMarkdownFallback: React.FC<{ markdown?: string | null; initialValue: Descendant[] }> = ({
  markdown,
  initialValue,
}) => {
  const normalizedMarkdown = asTrimmedString(markdown);
  if (normalizedMarkdown) {
    return (
      <article className="DocImportView-plainMarkdownFallback">
        <pre>{normalizedMarkdown}</pre>
      </article>
    );
  }

  return <Editor initialValue={initialValue} readOnly />;
};

const DocImportView: React.FC<Props> = ({
  shared,
  token,
  documentTitle,
  initialValue,
  markdown,
}) => {
  const currentToken = useToken();
  const currentServer = useAppSelector(selectRemoteServer);
  const currentSpaceId = useCurrentSpaceId();

  const [status, setStatus] = useState<ImportStatus>("idle");
  const [importedKey, setImportedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [price, setPrice] = useState(0);
  const isLockedPreview = shared.meta?.previewLocked || shared.meta?.requiresPurchase;

  /** 调用服务端 import 端点（做全部校验 + 创建 + 计数） */
  const callImport = useCallback(async (): Promise<boolean> => {
    if (!currentToken || !currentServer) return false;
    setStatus("importing");

    const res = await fetch(`${currentServer}/api/v1/share/${token}/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentToken}`,
      },
      body: JSON.stringify({ spaceId: currentSpaceId ?? undefined }),
    });

    const json = await res.json().catch(() => ({}));

    if (res.status === 402 && json?.requiresPurchase) {
      setPrice(json.price ?? 0);
      setStatus("requires-purchase");
      return false;
    }

    if (!res.ok || !json?.success || !json?.dbKey) {
      setError(json?.message ?? `导入失败 (${res.status})`);
      setStatus("error");
      return false;
    }

    setImportedKey(json.dbKey);
    setStatus("done");
    return true;
  }, [currentToken, currentServer, currentSpaceId, token]);

  const handleImport = useCallback(async () => {
    if (!currentToken) return;
    if (status !== "idle" && status !== "error") return;
    setError(null);
    await callImport();
  }, [currentToken, status, callImport]);

  const handlePurchaseAndImport = useCallback(async () => {
    if (!currentToken || !currentServer) return;
    setStatus("purchasing");
    setError(null);

    const res = await fetch(`${currentServer}/api/v1/share/${token}/purchase`, {
      method: "POST",
      headers: { Authorization: `Bearer ${currentToken}` },
    });
    const json = await res.json().catch(() => ({}));

    if (!json?.success) {
      setError(json?.message ?? "购买失败");
      setStatus("error");
      return;
    }

    await callImport();
  }, [currentToken, currentServer, token, callImport]);

  return (
    <div className="DocImportView-root">
      <div className="DocImportView-shell">
        <div className="DocImportView-titleShell">
          <h1
            className={`DocImportView-title${
              !asOptionalTrimmedString(documentTitle) ? " is-placeholder" : ""
            }`}
          >
            {asOptionalTrimmedString(documentTitle) ?? "未命名页面"}
          </h1>
        </div>

        <Suspense fallback={<PageLoading message="正在渲染分享内容..." fullHeight={false} />}>
          {isLockedPreview ? (
            <div className="DocImportView-lockedCard">
              <h2>该文档为付费内容</h2>
              <p>当前仅展示分享信息，购买后可导入到你的空间查看完整正文。</p>
            </div>
          ) : (
            <ReadOnlyMarkdownContent
              markdown={markdown}
              fallback={
                <PlainMarkdownFallback
                  markdown={markdown}
                  initialValue={initialValue}
                />
              }
            />
          )}
        </Suspense>

        {currentToken && (
          <ImportBar
            status={status}
            importedKey={importedKey}
            error={error}
            price={price}
            onImport={handleImport}
            onPurchaseAndImport={handlePurchaseAndImport}
            onCancelPurchase={() => setStatus("idle")}
          />
        )}
      </div>

      
    </div>
  );
};

export default DocImportView;
