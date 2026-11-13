import React from "react";
import { Link } from "app/routing";
import { useTranslation } from "react-i18next";

// 404 页面：语义化标题（单个 h1）+ 文案走 common ns 的 seo.notFound.*。
// 注意：本组件在 MainLayout 之内渲染，MainLayout 自己已经输出 <main>，
// 所以这里不能再套 <main>（HTML 不允许嵌套 main）。
// 样式沿用本区域既有通道（与 render/NoMatch 一致的行内样式，无新样式体系）。
const NotFoundPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "80vh",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem", fontWeight: 500 }}>
        {t("seo.notFound.heading")}
      </h1>
      <p style={{ marginBottom: "2rem" }}>{t("seo.notFound.message")}</p>
      <Link to="/" style={{ textDecoration: "none" }}>
        {t("seo.notFound.backHome")}
      </Link>
    </div>
  );
};

export default NotFoundPage;
