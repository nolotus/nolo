import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "app/routing";
import { buildQuickStartGuideContent } from "app/guide/quickStartGuide";
import { LuDownload, LuArrowRight } from "react-icons/lu";
import "render/layout/noloSerifFont.css";
import "./QuickStartGuidePage.css";

const QuickStartGuidePage: React.FC = () => {
  const { t, i18n } = useTranslation();

  const guide = useMemo(
    () =>
      buildQuickStartGuideContent((key, fallback) => {
        const value = t(key);
        return typeof value === "string" && value.trim() && value !== key
          ? value
          : fallback;
      }),
    [i18n.language, t]
  );

  return (
    <div className="QuickStartGuidePage">
      <div className="QuickStartGuidePage__container">
        <header className="QuickStartGuidePage__hero">
          <p className="QuickStartGuidePage__eyebrow">
            {t("homeActions.guideTitle", "User Guide")}
          </p>
          <h1 className="QuickStartGuidePage__title">{guide.title}</h1>
          <p className="QuickStartGuidePage__description">{guide.description}</p>
        </header>

        <div className="QuickStartGuidePage__sections">
          {guide.sections.map((section) => (
            <section key={section.title} className="QuickStartGuidePage__section">
              <h2 className="QuickStartGuidePage__sectionTitle">{section.title}</h2>
              <ul className="QuickStartGuidePage__list">
                {section.items.map((item) => (
                  <li key={item} className="QuickStartGuidePage__listItem">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="QuickStartGuidePage__actions">
          <NavLink to="/" className="QuickStartGuidePage__btn QuickStartGuidePage__btnPrimary">
            <span>{t("homeActions.chatTitle", "Start Chatting")}</span>
            <LuArrowRight size={16} aria-hidden="true" />
          </NavLink>
          <NavLink to="/downloads" className="QuickStartGuidePage__btn QuickStartGuidePage__btnSecondary">
            <LuDownload size={16} aria-hidden="true" />
            <span>{t("homeActions.downloadTitle", "Downloads")}</span>
          </NavLink>
        </div>
      </div>
    </div>
  );
};

export default QuickStartGuidePage;
