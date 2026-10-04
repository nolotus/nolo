import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { buildQuickStartGuideContent } from "app/guide/quickStartGuide";
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
    </div>
  );
};

export default QuickStartGuidePage;
