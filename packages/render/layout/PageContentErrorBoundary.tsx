import React, { Component, ErrorInfo, ReactNode } from "react";
import { withTranslation, type WithTranslation } from "react-i18next";

interface ErrorBoundaryProps extends WithTranslation {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class PageContentErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Page content render error:", error, errorInfo);
  }

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    const { t } = this.props;

    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            padding: "var(--space-8)",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontSize: "var(--fontSize-xl)",
              fontWeight: 500,
              color: "var(--text)",
              margin: "0 0 var(--space-2) 0",
            }}
          >
            {t("pageContentError.title", "内容加载失败")}
          </h2>
          <p
            style={{
              color: "var(--textSecondary)",
              maxWidth: "360px",
              lineHeight: "var(--leading-relaxed)",
              margin: "0 0 var(--space-6) 0",
            }}
          >
            {t("pageContentError.description", "您可以尝试刷新页面来解决此问题。")}
          </p>
          <button
            type="button"
            onClick={this.handleRefresh}
            style={{
              padding: "var(--space-2) var(--space-4)",
              border: "1px solid var(--borderHover)",
              background: "var(--background)",
              color: "var(--text)",
              borderRadius: "var(--space-2)",
              cursor: "pointer",
              fontSize: "var(--fontSize-base)",
            }}
          >
            {t("pageContentError.refresh", "刷新页面")}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default withTranslation()(PageContentErrorBoundary) as any;
