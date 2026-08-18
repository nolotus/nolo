import React, { useCallback, useState } from "react";
import {
  LuCircleCheck,
  LuCircleX,
  LuClock,
  LuRefreshCw,
} from "react-icons/lu";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import Button from "render/web/ui/Button";

type ReaderStatus = "unknown" | "ready" | "needs_login" | "blocked" | "error";
type ReaderAction = "status";

type ExternalReaderStateResponse = {
  ok: boolean;
  providerId: string;
  providerLabel: string;
  status: ReaderStatus;
  mode: "desktop" | "server";
  message: string;
  diagnostic?: {
    code?: string;
    message?: string;
    loginDetected?: boolean;
    captchaDetected?: boolean;
    pageTitle?: string;
  };
  sample?: {
    nickname?: string;
    noteCount?: number;
    fetchedAt?: string;
  };
};

type ExternalReaderProviderConfig = {
  id: string;
  /** Fallback label when i18n key is missing. */
  label: string;
  /** Fallback description when i18n key is missing. */
  description: string;
  labelKey: string;
  descriptionKey: string;
};

const EXTERNAL_READER_PROVIDERS: ExternalReaderProviderConfig[] = [
  {
    id: "xhs",
    label: "小红书",
    description:
      "匿名公开预览模式：不登录、不复用 cookie、不维护本地浏览器配置；只读取未登录访客可见的内容。",
    labelKey: "settings.externalReader.providers.xhs.label",
    descriptionKey: "settings.externalReader.providers.xhs.description",
  },
];

type ExternalReaderStateCenterProps = {
  currentToken: string | null;
  serverBase: string;
  isDesktop: boolean;
};

function authHeaders(currentToken: string | null) {
  return {
    "Content-Type": "application/json",
    Authorization: currentToken ? `Bearer ${currentToken}` : "",
  };
}

const statusBadge = (status?: ReaderStatus, t?: TFunction) => {
  const translate = (key: string, fallback: string) => (t ? t(key, fallback) : fallback);
  switch (status) {
    case "ready":
      return (
        <span className="ext-reader-badge ext-reader-badge--ready">
          <LuCircleCheck aria-hidden="true" /> {translate("settings.externalReader.status.ready", "已就绪")}
        </span>
      );
    case "needs_login":
      return (
        <span className="ext-reader-badge ext-reader-badge--warning">
          <LuClock aria-hidden="true" /> {translate("settings.externalReader.status.needsLogin", "匿名不可见")}
        </span>
      );
    case "blocked":
      return (
        <span className="ext-reader-badge ext-reader-badge--warning">
          <LuClock aria-hidden="true" /> {translate("settings.externalReader.status.blocked", "被屏蔽")}
        </span>
      );
    case "error":
      return (
        <span className="ext-reader-badge ext-reader-badge--error">
          <LuCircleX aria-hidden="true" /> {translate("settings.externalReader.status.error", "错误")}
        </span>
      );
    case "unknown":
      return (
        <span className="ext-reader-badge ext-reader-badge--unknown">
          <LuClock aria-hidden="true" /> {translate("settings.externalReader.status.unknown", "未知")}
        </span>
      );
    default:
      return (
        <span className="ext-reader-badge ext-reader-badge--unknown">
          <LuClock aria-hidden="true" /> {translate("settings.externalReader.status.untested", "未测试")}
        </span>
      );
  }
};

const renderStatusGuide = (status?: ReaderStatus, t?: TFunction) => {
  const translate = (key: string, fallback: string) => (t ? t(key, fallback) : fallback);
  switch (status) {
    case "needs_login":
      return (
        <div className="ext-reader-status-guide ext-reader-status-guide--warning">
          {translate("settings.externalReader.guide.needsLogin", "提示：该页面要求登录后访问。小红书读取器当前为匿名模式，不会请求登录或使用账号。")}
        </div>
      );
    case "blocked":
      return (
        <div className="ext-reader-status-guide ext-reader-status-guide--warning">
          {translate("settings.externalReader.guide.blocked", "提示：访问受限或触发安全验证。匿名模式会停止读取，不会请求登录或绕过验证。")}
        </div>
      );
    case "error":
      return (
        <div className="ext-reader-status-guide ext-reader-status-guide--error">
          {translate("settings.externalReader.guide.error", "提示：读取器发生异常错误。匿名模式没有本地登录态可重置，请稍后重试或检查 Playwright 环境。")}
        </div>
      );
    default:
      return null;
  }
};

export const ExternalReaderStateCenter: React.FC<ExternalReaderStateCenterProps> = ({
  currentToken,
  serverBase,
  isDesktop,
}) => {
  // Keys live under defaultNS `common` as `settings.externalReader.*`.
  const { t } = useTranslation();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [dataByProvider, setDataByProvider] = useState<Record<string, ExternalReaderStateResponse>>({});
  const [errorByProvider, setErrorByProvider] = useState<Record<string, string | null>>({});

  const runProviderAction = useCallback(
    async (provider: ExternalReaderProviderConfig, action: ReaderAction) => {
      if (!isDesktop) {
        setErrorByProvider((prev) => ({
          ...prev,
          [provider.id]: t("settings.externalReader.desktopRequired", "请在桌面端管理外部平台读取器"),
        }));
        return;
      }

      const key = `${provider.id}:${action}`;
      setLoadingKey(key);
      setErrorByProvider((prev) => ({ ...prev, [provider.id]: null }));
      try {
        const response = await fetch(
          `${serverBase}/api/external-readers/${provider.id}/${action}`,
          {
            method: "POST",
            headers: authHeaders(currentToken),
            body: JSON.stringify({}),
          },
        );
        const resData = (await response.json().catch(() => ({}))) as ExternalReaderStateResponse & {
          ok?: boolean;
          message?: string;
        };
        if (!response.ok) {
          const fallback = t("settings.externalReader.checkFailed", "读取策略检查失败");
          throw new Error(resData.message || fallback);
        }

        setDataByProvider((prev) => ({
          ...prev,
          [provider.id]: resData,
        }));
      } catch (err: any) {
        setErrorByProvider((prev) => ({
          ...prev,
          [provider.id]: err.message || t("settings.externalReader.requestFailed", "请求失败"),
        }));
      } finally {
        setLoadingKey(null);
      }
    },
    [currentToken, isDesktop, serverBase],
  );

  return (
    <section className="ext-reader-state-card">
      <style>{`
        .ext-reader-state-card {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          padding: var(--space-4);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: var(--backgroundSecondary);
          margin-bottom: var(--space-4);
        }
        .ext-reader-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: var(--space-2);
        }
        .ext-reader-card-title-container {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .ext-reader-card-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--text);
        }
        .ext-reader-provider-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
        }
        .ext-reader-desktop-req-badge {
          font-size: var(--fontSize-xs);
          padding: 2px 6px;
          background: var(--backgroundHover);
          border: 1px solid var(--borderLight);
          color: var(--textSecondary);
          border-radius: var(--radius-sm);
        }
        .ext-reader-status-info {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .ext-reader-provider-card {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          padding-top: var(--space-2);
          border-top: 1px solid var(--borderLight);
        }
        .ext-reader-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: var(--fontSize-sm);
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          font-weight: 500;
        }
        .ext-reader-badge--ready {
          background: rgba(16, 185, 129, 0.1);
          color: rgb(16, 185, 129);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .ext-reader-badge--warning {
          background: rgba(245, 158, 11, 0.1);
          color: rgb(245, 158, 11);
          border: 1px solid rgba(245, 158, 11, 0.2);
        }
        .ext-reader-badge--error {
          background: rgba(239, 68, 68, 0.1);
          color: rgb(239, 68, 68);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        .ext-reader-badge--unknown {
          background: var(--backgroundHover);
          color: var(--textSecondary);
          border: 1px solid var(--borderLight);
        }
        .ext-reader-card-body {
          font-size: var(--fontSize-sm);
          color: var(--textSecondary);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .ext-reader-sample-details {
          background: var(--background);
          border: 1px solid var(--borderLight);
          padding: var(--space-3);
          border-radius: var(--radius-sm);
          margin-top: 4px;
        }
        .ext-reader-sample-title {
          font-weight: 600;
          color: var(--text);
          margin-bottom: var(--space-1);
        }
        .ext-reader-diagnostic {
          background: rgba(239, 68, 68, 0.05);
          border: 1px dashed rgba(239, 68, 68, 0.2);
          color: var(--textSecondary);
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-sm);
          font-family: monospace;
          font-size: var(--fontSize-xs);
        }
        .ext-reader-status-guide {
          font-size: var(--fontSize-xs);
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-sm);
          margin-top: var(--space-2);
          line-height: 1.4;
        }
        .ext-reader-status-guide--warning {
          background: rgba(245, 158, 11, 0.05);
          border: 1px dashed rgba(245, 158, 11, 0.2);
          color: var(--textSecondary);
        }
        .ext-reader-status-guide--error {
          background: rgba(239, 68, 68, 0.05);
          border: 1px dashed rgba(239, 68, 68, 0.2);
          color: var(--textSecondary);
        }
        .ext-reader-card-actions {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          margin-top: var(--space-2);
          flex-wrap: wrap;
        }
      `}</style>

      <div className="ext-reader-card-header">
        <div className="ext-reader-card-title-container">
          <strong className="ext-reader-card-title">{t("settings.externalReader.title", "外部平台读取器")}</strong>
          {!isDesktop && <span className="ext-reader-desktop-req-badge">{t("settings.externalReader.desktopRequiredBadge", "需要桌面端")}</span>}
        </div>
      </div>

      <div className="ext-reader-card-body">
        <p>
          {t("settings.externalReader.description", "查看外部平台 Reader 的运行策略。小红书当前只做匿名公开读取：不登录、不保存 cookie、不使用持久浏览器配置；看不到的内容会被报告为匿名不可见。")}
        </p>
      </div>

      {EXTERNAL_READER_PROVIDERS.map((provider) => {
        const data = dataByProvider[provider.id];
        const error = errorByProvider[provider.id];
        const actionDisabled = !!loadingKey || !isDesktop;
        const desktopRequiredTitle = !isDesktop ? t("settings.externalReader.desktopRequiredTooltip", "请在桌面端管理读取器") : undefined;
        const providerLabel = t(provider.labelKey, provider.label);
        const providerDescription = t(provider.descriptionKey, provider.description);

        return (
          <div className="ext-reader-provider-card" key={provider.id}>
            <div className="ext-reader-card-header">
              <div className="ext-reader-card-title-container">
                <span className="ext-reader-provider-name">{providerLabel}</span>
              </div>
              <div className="ext-reader-status-info">{statusBadge(data?.status, t)}</div>
            </div>

            <div className="ext-reader-card-body">
              <p>{providerDescription}</p>

              {data?.message && (
                <div style={{ color: "var(--text)" }}>
                  <strong>{t("settings.externalReader.messageLabel", "消息:")}</strong> {data.message}
                </div>
              )}

              {data?.sample && (
                <div className="ext-reader-sample-details">
                  <div className="ext-reader-sample-title">{t("settings.externalReader.sampleTitle", "匿名公开读取样例：")}</div>
                  <div>{t("settings.externalReader.nickname", "用户昵称")}: {data.sample.nickname || t("settings.externalReader.unknown", "未知")}</div>
                  {typeof data.sample.noteCount === "number" && (
                    <div>{t("settings.externalReader.noteCount", "笔记总数")}: {data.sample.noteCount}</div>
                  )}
                  {data.sample.fetchedAt && (
                    <div style={{ fontSize: "11px", color: "var(--textTertiary)", marginTop: "4px" }}>
                      {t("settings.externalReader.fetchedAt", "获取时间")}: {new Date(data.sample.fetchedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              )}

              {data?.diagnostic && (data.diagnostic.message || data.diagnostic.code) && (
                <div className="ext-reader-diagnostic">
                  [{t("settings.externalReader.diagnosticCode", "诊断代码")}: {data.diagnostic.code || t("settings.externalReader.notAvailable", "N/A")}] {data.diagnostic.message || ""}
                </div>
              )}

              {renderStatusGuide(data?.status, t)}

              {error && (
                <div className="ext-reader-diagnostic" style={{ color: "var(--danger)" }}>
                  {t("settings.externalReader.errorLabel", "错误")}: {error}
                </div>
              )}
            </div>

            <div className="ext-reader-card-actions">
              <Button
                variant="secondary"
                icon={<LuRefreshCw aria-hidden="true" />}
                loading={loadingKey === `${provider.id}:status`}
                disabled={actionDisabled}
                title={desktopRequiredTitle}
                onClick={() => runProviderAction(provider, "status")}
              >
                {t("settings.externalReader.checkPolicy", "查看策略")}
              </Button>
            </div>
          </div>
        );
      })}
    </section>
  );
};

export default ExternalReaderStateCenter;
