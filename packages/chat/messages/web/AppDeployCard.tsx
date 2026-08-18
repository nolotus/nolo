// 文件路径: chat/messages/web/AppDeployCard.tsx
// 部署成功后在聊天中展示应用预览卡片（链接 + 内嵌 iframe）

import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LuBot,
  LuChevronDown,
  LuChevronUp,
  LuExternalLink,
  LuLoaderCircle,
  LuMonitor,
} from "react-icons/lu";
import { useNavigate } from "app/routing";
import {
  buildAppEditorPath,
} from "app/constants/appEditor";
import { resolveAppRouteKey } from "app/utils/appKeys";
import { resolvePreferredAppRuntimeUrl } from "app/utils/appRuntimeUrl";
import { asOptionalTrimmedString } from "core/optionalString";
import "./AppDeployCard.css";
import { useChatDisplayContext } from "./ChatDisplayContext";

interface AppDeployCardProps {
  rawData: any;
  isError: boolean;
}

const AppDeployCard: React.FC<AppDeployCardProps> = ({ rawData, isError }) => {
  const { t } = useTranslation("chat");
  const navigate = useNavigate();
  const { compactDeployCards } = useChatDisplayContext();
  const [iframeOpen, setIframeOpen] = useState(() => !isError && !compactDeployCards);
  const [frameState, setFrameState] = useState<"loading" | "loaded">("loading");
  const [isSlow, setIsSlow] = useState(false);
  const hasRenderableData =
    !isError && !!rawData && typeof rawData === "object";
  const appUrl: string | undefined = hasRenderableData
    ? resolvePreferredAppRuntimeUrl({
        appId: typeof rawData?.appId === "string" ? rawData.appId : undefined,
        customUrl: typeof rawData?.customUrl === "string" ? rawData.customUrl : undefined,
        url:
          typeof rawData?.appUrl === "string"
            ? rawData.appUrl
            : typeof rawData?.url === "string"
              ? rawData.url
              : undefined,
      }) || undefined
    : undefined;
  const appServerOrigin = useMemo(() => {
    const serverOrigin = asOptionalTrimmedString(rawData?.serverOrigin);
    if (serverOrigin) {
      return serverOrigin;
    }
    const originUrl =
      typeof rawData?.appUrl === "string"
        ? rawData.appUrl
        : typeof rawData?.url === "string"
          ? rawData.url
          : appUrl;
    if (!originUrl) return undefined;
    try {
      return new URL(originUrl).origin;
    } catch {
      return undefined;
    }
  }, [appUrl, rawData?.appUrl, rawData?.serverOrigin, rawData?.url]);
  const appName: string = hasRenderableData
    ? rawData.userFriendlyName ?? rawData.name ?? "App"
    : "App";
  const appRouteKey = hasRenderableData
    ? resolveAppRouteKey(rawData.appKey, rawData.appId)
    : undefined;
  const previewCheck = hasRenderableData ? rawData.previewCheck : undefined;

  useEffect(() => {
    if (!iframeOpen || !appUrl) return;
    setFrameState("loading");
    setIsSlow(false);
    const timer = window.setTimeout(() => {
      setIsSlow(true);
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [iframeOpen, appUrl]);

  const loadingMessage = useMemo(() => {
    if (frameState === "loaded") {
      return null;
    }
    if (previewCheck?.attempted && previewCheck.ready) {
      return "站点访问已经验证通过，正在加载聊天内预览…";
    }
    if (previewCheck?.attempted && !previewCheck.ready) {
      return "站点已发布，但首次冷启动可能稍慢，正在等待预览可见…";
    }
    if (previewCheck?.attempted === false) {
      return "站点已发布，当前地址为跨域预览，正在等待 iframe 自己完成加载…";
    }
    return "正在加载预览…";
  }, [frameState, previewCheck]);

  if (!hasRenderableData || !appUrl) return null;

  return (
    <div className="app-deploy-card">
      <div className="adc-header">
        <div className="adc-info">
          <LuMonitor size={15} className="adc-icon" aria-hidden="true" />
          <span className="adc-name">{appName}</span>
        </div>
        <div className="adc-actions">
          <a
            className="adc-btn adc-btn--link"
            href={appUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={t("app.openInTab", "在新标签页打开")}
          >
            <LuExternalLink size={13} aria-hidden="true" />
            <span>{t("app.open", "打开")}</span>
          </a>
          <button
            className={`adc-btn adc-btn--preview ${iframeOpen ? "is-active" : ""}`}
            onClick={() => setIframeOpen((v) => !v)}
            title={t("app.togglePreview", "切换预览")}
            type="button"
          >
            {iframeOpen ? (
              <LuChevronUp size={13} aria-hidden="true" />
            ) : (
              <LuChevronDown size={13} aria-hidden="true" />
            )}
            <span>{t("app.preview", "预览")}</span>
          </button>
          {appRouteKey && (
            <button
              className="adc-btn adc-btn--editor"
              onClick={() =>
                navigate(buildAppEditorPath(appRouteKey, undefined, appServerOrigin))
              }
              title={t("appEditor_chatMode_title", "对话编辑")}
              type="button"
            >
              <LuBot size={13} aria-hidden="true" />
              <span>{t("appEditor_chatMode_title", "对话编辑")}</span>
            </button>
          )}
        </div>
      </div>

      {iframeOpen && (
        <div className="adc-frame-wrap">
          {loadingMessage && (
            <div className={`adc-loading ${isSlow ? "is-slow" : ""}`}>
              <LuLoaderCircle size={14} className="adc-loading-icon" aria-hidden="true" />
              <div className="adc-loading-text">
                <div>{loadingMessage}</div>
                {isSlow && (
                  <div className="adc-loading-sub">
                    部署慢时通常不是失败，而是还在首轮构建 / 冷启动。
                  </div>
                )}
              </div>
            </div>
          )}
          <iframe
            src={appUrl}
            className="adc-frame"
            title={appName}
            sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
            onLoad={() => setFrameState("loaded")}
          />
        </div>
      )}

    </div>
  );
};

export default AppDeployCard;
