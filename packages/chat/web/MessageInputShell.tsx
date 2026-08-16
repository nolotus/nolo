// packages/chat/web/MessageInputShell.tsx
// Loading / error shells for MessageInputContainer gate states.

import React from "react";
import { useTranslation } from "react-i18next";
import StreamingIndicator from "render/web/ui/StreamingIndicator";

export const BaseShell: React.FC<{
  containerClassName: string;
  children: React.ReactNode;
}> = ({ containerClassName, children }) => (
  <div className={`message-input ${containerClassName}`}>
    <div className="message-input__wrapper">{children}</div>
  </div>
);

export const LoadingPlaceholder: React.FC = () => (
  <BaseShell containerClassName="message-input--skeleton">
    <div className="message-input__skeleton-bar">
      <StreamingIndicator />
    </div>
  </BaseShell>
);

export const ErrorMessage: React.FC<{
  message: string;
  showRecharge?: boolean;
  onRecharge: () => void;
  showChooseModel?: boolean;
  onChooseModel?: () => void;
}> = ({
  message,
  showRecharge,
  onRecharge,
  showChooseModel,
  onChooseModel,
}) => {
  const { t } = useTranslation("chat");

  return (
    <BaseShell containerClassName="message-input--error">
      <div className="message-input__error-box">
        <span className="message-input__error-text">{message}</span>
        {(showRecharge || showChooseModel) && (
          <div className="message-input__error-actions">
            {showRecharge && (
              <button
                type="button"
                className="message-input__recharge-link"
                onClick={onRecharge}
              >
                {t("recharge", "充值")}
              </button>
            )}
            {showChooseModel && onChooseModel && (
              <button
                type="button"
                className="message-input__recharge-link"
                onClick={onChooseModel}
              >
                {t("chooseAnotherModelContinue", "选择其他模型继续")}
              </button>
            )}
          </div>
        )}
      </div>
    </BaseShell>
  );
};
