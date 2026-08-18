import React from "react";
import { useTranslation } from "react-i18next";
import "./PrivacyPolicyPage.css";

const TermsOfServicePage: React.FC = () => {
  const { t } = useTranslation("common");

  return (
    <div className="PrivacyPolicyPage">
      <header>
        <h1 className="PrivacyPolicyPage__title">
          {t("terms.title", "Terms of Service")}
        </h1>
        <p className="PrivacyPolicyPage__lastUpdated">
          {t("terms.lastUpdated", "Last updated: May 30, 2026")}
        </p>
      </header>

      <div className="PrivacyPolicyPage__content">
        <p>{t("terms.intro")}</p>

        <section className="PrivacyPolicyPage__section">
          <h2 className="PrivacyPolicyPage__sectionTitle">
            {t("terms.section1.title")}
          </h2>
          <p>{t("terms.section1.desc")}</p>
        </section>

        <section className="PrivacyPolicyPage__section">
          <h2 className="PrivacyPolicyPage__sectionTitle">
            {t("terms.section2.title")}
          </h2>
          <p>{t("terms.section2.desc")}</p>
        </section>

        <section className="PrivacyPolicyPage__section">
          <h2 className="PrivacyPolicyPage__sectionTitle">
            {t("terms.section3.title")}
          </h2>
          <p>{t("terms.section3.desc")}</p>
        </section>

        <section className="PrivacyPolicyPage__section">
          <h2 className="PrivacyPolicyPage__sectionTitle">
            {t("terms.section4.title")}
          </h2>
          <p>{t("terms.section4.desc")}</p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
