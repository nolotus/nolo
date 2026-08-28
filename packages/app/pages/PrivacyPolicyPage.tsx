import * as stylex from "@stylexjs/stylex";
import React from "react";
import { useTranslation } from "react-i18next";
import { policyPageStyles } from "./policyPageStyles";

const PrivacyPolicyPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div {...stylex.props(policyPageStyles.page)}>
      <header>
        <h1 {...stylex.props(policyPageStyles.title)}>{t("privacy.title", "Privacy Policy")}</h1>
        <p {...stylex.props(policyPageStyles.lastUpdated)}>{t("privacy.lastUpdated", "Last updated: May 30, 2026")}</p>
      </header>

      <div>
        <p>{t("privacy.intro")}</p>

        <section {...stylex.props(policyPageStyles.section)}>
          <h2 {...stylex.props(policyPageStyles.sectionTitle)}>{t("privacy.section1.title")}</h2>
          <p>{t("privacy.section1.desc")}</p>
          <ul {...stylex.props(policyPageStyles.list)}>
            <li {...stylex.props(policyPageStyles.listItem)}>{t("privacy.section1.device")}</li>
            <li {...stylex.props(policyPageStyles.listItem)}>{t("privacy.section1.location")}</li>
            <li {...stylex.props(policyPageStyles.listItem)}>{t("privacy.section1.network")}</li>
          </ul>
        </section>

        <section {...stylex.props(policyPageStyles.section)}>
          <h2 {...stylex.props(policyPageStyles.sectionTitle)}>{t("privacy.section2.title")}</h2>
          <p>{t("privacy.section2.desc")}</p>
          <ul {...stylex.props(policyPageStyles.list)}>
            <li {...stylex.props(policyPageStyles.listItem)}>{t("privacy.section2.core")}</li>
            <li {...stylex.props(policyPageStyles.listItem)}>{t("privacy.section2.map")}</li>
            <li {...stylex.props(policyPageStyles.listItem)}>{t("privacy.section2.analysis")}</li>
          </ul>
        </section>

        <section {...stylex.props(policyPageStyles.section)}>
          <h2 {...stylex.props(policyPageStyles.sectionTitle)}>{t("privacy.section3.title")}</h2>
          <p>{t("privacy.section3.desc")}</p>
          <ul {...stylex.props(policyPageStyles.list)}>
            <li {...stylex.props(policyPageStyles.listItem)}>{t("privacy.section3.thirdParty")}</li>
            <li {...stylex.props(policyPageStyles.listItem)}>{t("privacy.section3.legal")}</li>
          </ul>
        </section>

        <section {...stylex.props(policyPageStyles.section)}>
          <h2 {...stylex.props(policyPageStyles.sectionTitle)}>{t("privacy.section4.title")}</h2>
          <p>{t("privacy.section4.desc")}</p>
        </section>

        <section {...stylex.props(policyPageStyles.section)}>
          <h2 {...stylex.props(policyPageStyles.sectionTitle)}>{t("privacy.section5.title")}</h2>
          <p>{t("privacy.section5.desc")}</p>
        </section>

        <section {...stylex.props(policyPageStyles.section)}>
          <h2 {...stylex.props(policyPageStyles.sectionTitle)}>{t("privacy.section6.title")}</h2>
          <p>{t("privacy.section6.desc")}</p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
