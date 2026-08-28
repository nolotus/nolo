import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "app/routing";
import { LEGAL_LINKS } from "app/constants/legalLinks";
import "./siteFooter.css";

const SUPPORT_EMAIL = "s@nolotus.com";

/**
 * 站点页脚：承载法务文件入口（Waffo 进件合规要求）。
 * 只在 shouldRenderSiteFooter 命中的内容型路由渲染，见 siteFooterRoutes.ts。
 */
const SiteFooter: React.FC = () => {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="SiteFooter">
      <div className="SiteFooter__inner">
        <nav className="SiteFooter__links" aria-label={t("footer.legal", "法律条款")}>
          {LEGAL_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="SiteFooter__link">
              {t(link.i18nKey, link.fallback)}
            </Link>
          ))}
          <Link to="/about" className="SiteFooter__link">
            {t("footer.about", "关于我们")}
          </Link>
          <Link to="/contact" className="SiteFooter__link">
            {t("footer.contact", "联系我们")}
          </Link>
          <a className="SiteFooter__link" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
        </nav>
        <p className="SiteFooter__copyright">
          © {year} Nolo. {t("footer.rights", "保留所有权利。")}
        </p>
      </div>
    </footer>
  );
};

export default SiteFooter;
