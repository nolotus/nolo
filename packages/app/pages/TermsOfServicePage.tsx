import * as stylex from "@stylexjs/stylex";
import React from "react";
import { useTranslation } from "react-i18next";
import { policyPageStyles } from "./policyPageStyles";

const TermsOfServicePage: React.FC = () => {
  const { t } = useTranslation("common");

  return (
    <div {...stylex.props(policyPageStyles.page)}>
      <header>
        <h1 {...stylex.props(policyPageStyles.title)}>
          {t("terms.title", "Terms of Service")}
        </h1>
        <p {...stylex.props(policyPageStyles.lastUpdated)}>
          {t("terms.lastUpdated", "Last updated: August 27, 2026")}
        </p>
      </header>

      <div>
        <p>{t("terms.intro")}</p>

        <section {...stylex.props(policyPageStyles.section)}>
          <h2 {...stylex.props(policyPageStyles.sectionTitle)}>
            {t("terms.section1.title")}
          </h2>
          <p>{t("terms.section1.desc")}</p>
        </section>

        <section {...stylex.props(policyPageStyles.section)}>
          <h2 {...stylex.props(policyPageStyles.sectionTitle)}>
            {t("terms.section2.title")}
          </h2>
          <p>{t("terms.section2.desc")}</p>
        </section>

        <section {...stylex.props(policyPageStyles.section)}>
          <h2 {...stylex.props(policyPageStyles.sectionTitle)}>
            {t("terms.section3.title")}
          </h2>
          <p>{t("terms.section3.desc")}</p>
        </section>

        <section {...stylex.props(policyPageStyles.section)}>
          <h2 {...stylex.props(policyPageStyles.sectionTitle)}>
            {t("terms.section4.title")}
          </h2>
          <p>{t("terms.section4.desc")}</p>
        </section>

        <section {...stylex.props(policyPageStyles.section)}>
          <h2 {...stylex.props(policyPageStyles.sectionTitle)}>
            {t("terms.section5.title")}
          </h2>
          <p>{t("terms.section5.desc")}</p>
        </section>

        <section {...stylex.props(policyPageStyles.section)}>
          <h2 {...stylex.props(policyPageStyles.sectionTitle)}>
            {t("terms.section6.title")}
          </h2>
          <p>{t("terms.section6.desc")}</p>
        </section>

        <section {...stylex.props(policyPageStyles.section)}>
          <h2 {...stylex.props(policyPageStyles.sectionTitle)}>
            {t("terms.section7.title")}
          </h2>
          <p>{t("terms.section7.desc")}</p>
        </section>

        <section {...stylex.props(policyPageStyles.section)}>
          <h2 {...stylex.props(policyPageStyles.sectionTitle)}>
            {t("terms.section8.title")}
          </h2>
          <p>{t("terms.section8.desc")}</p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
