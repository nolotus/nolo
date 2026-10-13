import React, { memo, useState, useCallback } from "react";
import * as stylex from "@stylexjs/stylex";
import { useTranslation } from "react-i18next";
import {
  LuCircleAlert,
  LuWifiOff,
  LuClock,
  LuShieldAlert,
  LuServerOff,
  LuRefreshCw,
  LuChevronDown,
  LuChevronUp,
  LuExternalLink,
} from "react-icons/lu";
import type { MessageErrorMeta, SendErrorAction, SendErrorKind } from "../types";
import { sendErrorCardStyles as styles } from "./sendErrorCardStyles";
import { withLiteralClass } from "../../web/withLiteralClass";

export interface SendErrorCardProps {
  errorMeta: MessageErrorMeta;
  onRetry?: () => void;
  isRetrying?: boolean;
  /** Handler for structured context-overflow actions (compact-and-retry / new-dialog / switch-model). */
  onAction?: (action: SendErrorAction) => void;
}

const KIND_ICONS: Record<SendErrorKind, React.ComponentType<{ size?: number; className?: string }>> = {
  network: LuWifiOff,
  timeout: LuClock,
  auth: LuShieldAlert,
  rate_limit: LuClock,
  server: LuServerOff,
  context_overflow: LuCircleAlert,
  context_too_large: LuCircleAlert,
  unknown: LuCircleAlert,
};

const KIND_LABELS: Record<SendErrorKind, string> = {
  network: "网络错误",
  timeout: "请求超时",
  auth: "认证失败",
  rate_limit: "限流",
  server: "服务异常",
  context_overflow: "上下文过长",
  context_too_large: "内容过大",
  unknown: "错误",
};

/** Label copy for each actionable affordance (locale keys under sendErrorCard.*). */
const ACTION_LABELS: Record<SendErrorAction, { key: string; fallback: string }> = {
  "compact-and-retry": { key: "sendErrorCard.compactAndRetry", fallback: "压缩并重试" },
  "new-dialog": { key: "sendErrorCard.newDialog", fallback: "开新对话" },
  "switch-model": { key: "sendErrorCard.switchModel", fallback: "切换模型" },
  retry: { key: "sendErrorCard.retry", fallback: "重试" },
};

const isSameOriginLink = (url: string): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
};

export const SendErrorCard = memo(({ errorMeta, onRetry, isRetrying = false, onAction }: SendErrorCardProps) => {
  const { t } = useTranslation("chat");
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const toggleDetails = useCallback(() => {
    setDetailsExpanded((prev) => !prev);
  }, []);

  const IconComponent = KIND_ICONS[errorMeta.kind] || LuCircleAlert;
  const kindLabel = KIND_LABELS[errorMeta.kind] || KIND_LABELS.unknown;

  const hasExtraLinks = Array.isArray(errorMeta.extraLinks) && errorMeta.extraLinks.length > 0;
  const hasValidationUrl = Boolean(errorMeta.validationUrl);
  const showDetailsToggle = Boolean(errorMeta.fallbackText && errorMeta.fallbackText.trim().length > 0);

  return (
    <div
      {...withLiteralClass("send-error-card", styles.card)}
      role="alert"
      aria-live="polite"
    >
      <div {...withLiteralClass("send-error-card__header", styles.header)}>
        <div {...withLiteralClass("send-error-card__header-left", styles.headerLeft)}>
          <span {...withLiteralClass("send-error-card__icon", styles.icon)} aria-hidden="true">
            <IconComponent size={16} />
          </span>
          <span {...withLiteralClass("send-error-card__title", styles.title)}>
            {t("sendErrorCard.title", "发送失败")}
          </span>
        </div>
        <span {...withLiteralClass("send-error-card__badge", styles.kindBadge)}>
          {kindLabel}
        </span>
      </div>

      <div {...withLiteralClass("send-error-card__body", styles.body)}>
        {errorMeta.summary && (
          <div {...withLiteralClass("send-error-card__summary", styles.summary)}>
            {errorMeta.summary}
          </div>
        )}
        {errorMeta.actionHint && (
          <div {...withLiteralClass("send-error-card__hint", styles.actionHint)}>
            {t("sendErrorCard.suggestion", "建议")}：{errorMeta.actionHint}
          </div>
        )}
      </div>

      <div {...withLiteralClass("send-error-card__actions", styles.actions)}>
        {Array.isArray(errorMeta.actions) &&
          errorMeta.actions
            .filter((action) => action !== "retry")
            .map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => onAction?.(action)}
                disabled={!onAction || isRetrying}
                {...withLiteralClass(
                  `send-error-card__action-btn send-error-card__action-btn--${action}`,
                  styles.retryButton,
                )}
              >
                {t(ACTION_LABELS[action].key, ACTION_LABELS[action].fallback)}
              </button>
            ))}

        {errorMeta.retryable && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            {...withLiteralClass("send-error-card__retry-btn", styles.retryButton)}
            aria-label={t("sendErrorCard.retry", "重试")}
          >
            <LuRefreshCw
              size={13}
              {...stylex.props(isRetrying && styles.retryIconSpinning)}
              aria-hidden="true"
            />
            {t("sendErrorCard.retry", "重试")}
          </button>
        )}

        {hasValidationUrl && (
          <a
            href={errorMeta.validationUrl}
            target="_blank"
            rel="noreferrer noopener"
            {...withLiteralClass("send-error-card__val-btn", styles.validationButton)}
          >
            <LuExternalLink size={13} aria-hidden="true" />
            {errorMeta.validationLinkText || t("sendErrorCard.verifyAccount", "验证账号")}
          </a>
        )}

        {hasExtraLinks &&
          errorMeta.extraLinks!.map((link, idx) => {
            // 站内链接（如 /login）在当前窗口导航：桌面端会进入已注册的
            // 登录引导页（cloudRoutes.desktop），不在 webview 里另开未受控窗口；
            // 外部链接仍在新窗口打开。按浏览器的实际解析结果判定同源，
            // 不用字符串前缀——`/\evil.com`、`/\t/evil.com` 会被解析成外站。
            const isInApp = isSameOriginLink(link.url);
            return (
              <a
                key={`${link.url}-${idx}`}
                href={link.url}
                {...(isInApp ? {} : { target: "_blank", rel: "noreferrer noopener" })}
                {...withLiteralClass("send-error-card__extra-link", styles.extraLink)}
              >
                {link.text}
              </a>
            );
          })}

        {showDetailsToggle && (
          <button
            type="button"
            onClick={toggleDetails}
            {...withLiteralClass("send-error-card__details-toggle", styles.detailsToggle)}
          >
            {detailsExpanded ? (
              <>
                {t("sendErrorCard.hideDetails", "收起详情")}
                <LuChevronUp size={12} aria-hidden="true" />
              </>
            ) : (
              <>
                {t("sendErrorCard.viewDetails", "查看详情")}
                <LuChevronDown size={12} aria-hidden="true" />
              </>
            )}
          </button>
        )}
      </div>

      {detailsExpanded && errorMeta.fallbackText && (
        <pre {...withLiteralClass("send-error-card__details", styles.fallbackDetails)}>
          {errorMeta.fallbackText}
        </pre>
      )}
    </div>
  );
});

SendErrorCard.displayName = "SendErrorCard";
