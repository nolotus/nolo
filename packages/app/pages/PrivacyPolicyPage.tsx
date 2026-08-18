import React from "react";
import { useTranslation } from "react-i18next";
import "./PrivacyPolicyPage.css";

const PrivacyPolicyPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="PrivacyPolicyPage">
      <header>
        <h1 className="PrivacyPolicyPage__title">{t("privacy.title", "Privacy Policy")}</h1>
        <p className="PrivacyPolicyPage__lastUpdated">{t("privacy.lastUpdated", "Last updated: May 30, 2026")}</p>
      </header>

      <div className="PrivacyPolicyPage__content">
        <p>{t("privacy.intro")}</p>

        <section className="PrivacyPolicyPage__section">
          <h2 className="PrivacyPolicyPage__sectionTitle">{t("privacy.section1.title")}</h2>
          <p>{t("privacy.section1.desc")}</p>
          <ul className="PrivacyPolicyPage__list">
            <li className="PrivacyPolicyPage__listItem">{t("privacy.section1.device")}</li>
            <li className="PrivacyPolicyPage__listItem">{t("privacy.section1.location")}</li>
            <li className="PrivacyPolicyPage__listItem">{t("privacy.section1.network")}</li>
          </ul>
        </section>

        <section className="PrivacyPolicyPage__section">
          <h2 className="PrivacyPolicyPage__sectionTitle">{t("privacy.section2.title")}</h2>
          <p>{t("privacy.section2.desc")}</p>
          <ul className="PrivacyPolicyPage__list">
            <li className="PrivacyPolicyPage__listItem">{t("privacy.section2.core")}</li>
            <li className="PrivacyPolicyPage__listItem">{t("privacy.section2.map")}</li>
            <li className="PrivacyPolicyPage__listItem">{t("privacy.section2.analysis")}</li>
          </ul>
        </section>

        <section className="PrivacyPolicyPage__section">
          <h2 className="PrivacyPolicyPage__sectionTitle">{t("privacy.section3.title")}</h2>
          <p>{t("privacy.section3.desc")}</p>
          <ul className="PrivacyPolicyPage__list">
            <li className="PrivacyPolicyPage__listItem">{t("privacy.section3.thirdParty")}</li>
            <li className="PrivacyPolicyPage__listItem">{t("privacy.section3.legal")}</li>
          </ul>
        </section>

        <section className="PrivacyPolicyPage__section">
          <h2 className="PrivacyPolicyPage__sectionTitle">{t("privacy.section4.title")}</h2>
          <p>{t("privacy.section4.desc")}</p>
        </section>

        <section className="PrivacyPolicyPage__section">
          <h2 className="PrivacyPolicyPage__sectionTitle">{t("privacy.section5.title")}</h2>
          <p>{t("privacy.section5.desc")}</p>
        </section>

        <section className="PrivacyPolicyPage__section">
          <h2 className="PrivacyPolicyPage__sectionTitle">{t("privacy.section6.title")}</h2>
          <p>{t("privacy.section6.desc")}</p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
