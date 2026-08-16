import React, { Component, ErrorInfo, ReactNode } from "react";
import { withTranslation, type WithTranslation } from "react-i18next";

interface ChatErrorBoundaryProps extends WithTranslation {
  children: ReactNode;
  fallbackMessage?: string;
}

interface ChatErrorBoundaryState {
  hasError: boolean;
}

class ChatErrorBoundary extends Component<
  ChatErrorBoundaryProps,
  ChatErrorBoundaryState
> {
  state: ChatErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ChatErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ChatErrorBoundary:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    const { t, fallbackMessage } = this.props;

    if (this.state.hasError) {
      return (
        <div className="chat-error-boundary">
          <p>{fallbackMessage || t("chat.errorBoundary.message", "此区域加载出错")}</p>
          <button type="button" onClick={this.handleRetry}>
            {t("chat.errorBoundary.retry", "重试")}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default withTranslation()(ChatErrorBoundary) as any;
