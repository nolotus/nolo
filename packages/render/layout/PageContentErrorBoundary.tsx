import React, { Component, ErrorInfo, ReactNode } from "react";
import { withTranslation, type WithTranslation } from "react-i18next";

interface ErrorBoundaryProps extends WithTranslation {
  children: ReactNode;
  /**
   * 变化时复位错误态（例如路由变了），但**不重挂载子树**——用 key 会造成整棵
   * 路由子树卸载重建，丢失滚动/多选状态并触发重复请求。
   */
  resetKey?: string;
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

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (
      this.state.hasError &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.setState({ hasError: false });
    }
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
          data-error-boundary="page-content"
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
