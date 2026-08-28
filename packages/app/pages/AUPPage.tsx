import * as stylex from "@stylexjs/stylex";
import React from "react";
import { useTranslation } from "react-i18next";
import { policyPageStyles } from "./policyPageStyles";

const AUPPage: React.FC = () => {
  const { t } = useTranslation("common");

  return (
    <div {...stylex.props(policyPageStyles.page)}>
      <header>
        <h1 {...stylex.props(policyPageStyles.title)}>
          {t("aup.title", "AIGC Acceptable Use Policy")}
        </h1>
        <p {...stylex.props(policyPageStyles.lastUpdated)}>
          {t("aup.lastUpdated", "Last updated: August 24, 2026")}
        </p>
      </header>

      <div>
        <p>{t("aup.intro")}</p>

        <section {...stylex.props(policyPageStyles.section)}>
          <h2 {...stylex.props(policyPageStyles.sectionTitle)}>
            {t("aup.section1.title")}
          </h2>
          <p>{t("aup.section1.desc")}</p>
          <ul {...stylex.props(policyPageStyles.list)}>
            <li {...stylex.props(policyPageStyles.listItem)}>{t("aup.section1.nsfw")}</li>
            <li {...stylex.props(policyPageStyles.listItem)}>{t("aup.section1.violence")}</li>
            <li {...stylex.props(policyPageStyles.listItem)}>{t("aup.section1.hate")}</li>
            <li {...stylex.props(policyPageStyles.listItem)}>{t("aup.section1.childSafety")}</li>
            <li {...stylex.props(policyPageStyles.listItem)}>{t("aup.section1.deepfake")}</li>
            <li {...stylex.props(policyPageStyles.listItem)}>{t("aup.section1.infringement")}</li>
          </ul>
        </section>

        <section {...stylex.props(policyPageStyles.section)}>
          <h2 {...stylex.props(policyPageStyles.sectionTitle)}>
            {t("aup.section2.title")}
          </h2>
          <p>{t("aup.section2.desc")}</p>
        </section>

        <section {...stylex.props(policyPageStyles.section)}>
          <h2 {...stylex.props(policyPageStyles.sectionTitle)}>
            {t("aup.section3.title")}
          </h2>
          <p>{t("aup.section3.desc")}</p>
          <ul {...stylex.props(policyPageStyles.list)}>
            <li {...stylex.props(policyPageStyles.listItem)}>{t("aup.section3.warning")}</li>
            <li {...stylex.props(policyPageStyles.listItem)}>{t("aup.section3.limit")}</li>
            <li {...stylex.props(policyPageStyles.listItem)}>{t("aup.section3.ban")}</li>
            <li {...stylex.props(policyPageStyles.listItem)}>{t("aup.section3.legal")}</li>
          </ul>
        </section>

        <section {...stylex.props(policyPageStyles.section)}>
          <h2 {...stylex.props(policyPageStyles.sectionTitle)}>{t("aup.section4.title")}</h2>
          <p>{t("aup.section4.desc")}</p>
        </section>

        <section {...stylex.props(policyPageStyles.section)}>
          <h2 {...stylex.props(policyPageStyles.sectionTitle)}>
            {t("aup.section5.title")}
          </h2>
          <p>{t("aup.section5.desc")}</p>
        </section>
      </div>
    </div>
  );
};

export default AUPPage;
