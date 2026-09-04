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
import type { MessageErrorMeta, SendErrorKind } from "../types";
import { sendErrorCardStyles as styles } from "./sendErrorCardStyles";
import { withLiteralClass } from "../../web/withLiteralClass";

export interface SendErrorCardProps {
  errorMeta: MessageErrorMeta;
  onRetry?: () => void;
  isRetrying?: boolean;
}

const KIND_ICONS: Record<SendErrorKind, React.ComponentType<{ size?: number; className?: string }>> = {
  network: LuWifiOff,
  timeout: LuClock,
  auth: LuShieldAlert,
  rate_limit: LuClock,
  server: LuServerOff,
  unknown: LuCircleAlert,
};

const KIND_LABELS: Record<SendErrorKind, string> = {
  network: "网络错误",
  timeout: "请求超时",
  auth: "认证失败",
  rate_limit: "限流",
  server: "服务异常",
  unknown: "错误",
};

export const SendErrorCard = memo(({ errorMeta, onRetry, isRetrying = false }: SendErrorCardProps) => {
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
          errorMeta.extraLinks!.map((link, idx) => (
            <a
              key={`${link.url}-${idx}`}
              href={link.url}
              target="_blank"
              rel="noreferrer noopener"
              {...withLiteralClass("send-error-card__extra-link", styles.extraLink)}
            >
              {link.text}
            </a>
          ))}

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
