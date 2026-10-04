import { NavLink } from "app/routing";
import { useTranslation } from "react-i18next";
import { LuDownload, LuExternalLink, LuFileCheck2, LuLock, LuShieldCheck } from "react-icons/lu";
import * as stylex from "@stylexjs/stylex";
import { openAuditableSectionStyles as styles } from "./OpenAuditableSectionStyles";
import WelcomeFaqAccordion from "./WelcomeFaqAccordion";
import { withLiteralClass } from "./share/withLiteralClass";
import "./OpenAuditableSection.css";

const PUBLIC_SOURCE_URL = "https://github.com/nolotus/nolo";
const RELEASE_MANIFEST_URL = "/public/downloads/desktop-release-manifest.json";
const BRAND_NS = "welcomeSection.brandLanding";
const FAQ_NS = "homeLandingFaq";

const OpenAuditableSection = () => {
  const { t } = useTranslation();
  const closingLines = t(`${BRAND_NS}.closingLines`, { returnObjects: true }) as string[];
  const faqItems = [
    {
      question: t("welcomeSection.faq.context.question"),
      answer: t("welcomeSection.faq.context.answer"),
    },
    {
      question: t("welcomeSection.faq.output.question"),
      answer: t("welcomeSection.faq.output.answer"),
    },
    {
      question: t("welcomeSection.faq.orchestration.question"),
      answer: t("welcomeSection.faq.orchestration.answer"),
    },
  ];

  return (
    <section {...stylex.props(styles.section)} aria-labelledby="open-auditable-title">
      <div className="home-compact-faq" aria-labelledby="home-compact-faq-title">
        <header className="home-compact-faq-head">
          <div className="home-compact-faq-kicker">{t(`${FAQ_NS}.kicker`)}</div>
          <h2 id="home-compact-faq-title">{t(`${FAQ_NS}.title`)}</h2>
          <p>{t(`${FAQ_NS}.description`)}</p>
        </header>
        <WelcomeFaqAccordion items={faqItems} />
      </div>

      <div className="open-auditable-shell-mobile">
        <div {...stylex.props(styles.shell)}>
          <div {...stylex.props(styles.header)}>
            <div>
              <div {...stylex.props(styles.kicker)}>
                <LuShieldCheck size={17} aria-hidden="true" />
                {t("openAuditable.kicker", "Privacy · Open · Auditable")}
              </div>
              <h2 id="open-auditable-title" {...stylex.props(styles.title)}>
                {t("openAuditable.title", "We don’t collect your data. Our code is open for inspection.")}
              </h2>
              <p {...stylex.props(styles.description)}>
                {t(
                  "openAuditable.description",
                  "The Nolo client never collects your conversations or personal data, and its source code is fully public. Every official release maps to an exact version in the public repository, so anyone can inspect and verify it.",
                )}
              </p>
            </div>

            <div className="open-auditable-links">
              <div {...stylex.props(styles.links)}>
                <a href={PUBLIC_SOURCE_URL} target="_blank" rel="noreferrer" {...withLiteralClass("open-auditable-view-source", styles.link)}>
                  {t("openAuditable.viewSource", "View source")}
                  <LuExternalLink size={15} aria-hidden="true" />
                </a>
                <a href={RELEASE_MANIFEST_URL} target="_blank" rel="noreferrer" {...stylex.props(styles.link)}>
                  {t("openAuditable.verifyRelease", "Verify current release")}
                  <LuExternalLink size={15} aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>

          <div {...stylex.props(styles.proofs)}>
            <div className="open-auditable-proof open-auditable-proof-privacy">
              <div {...stylex.props(styles.proof)}>
                <LuLock size={18} aria-hidden="true" {...stylex.props(styles.proofIcon)} />
                <div>
                  <span {...stylex.props(styles.proofTitle)}>{t("openAuditable.privacyTitle", "No data collection")}</span>
                  <span {...stylex.props(styles.proofText)}>
                    {t("openAuditable.privacyText", "Your conversations and files stay on your own device. We don’t track how you use the app or collect your personal data.")}
                  </span>
                </div>
              </div>
            </div>
            <div className="open-auditable-proof open-auditable-proof-verify">
              <div {...stylex.props(styles.proof)}>
                <LuFileCheck2 size={18} aria-hidden="true" {...stylex.props(styles.proofIcon)} />
                <div>
                  <span {...stylex.props(styles.proofTitle)}>{t("openAuditable.verifyTitle", "Verifiable releases")}</span>
                  <span {...stylex.props(styles.proofText)}>
                    {t("openAuditable.verifyText", "Every official build maps to a public source version with published checksums, so you can confirm your download comes from the public code.")}
                  </span>
                </div>
              </div>
            </div>
            <div className="open-auditable-proof open-auditable-proof-audit">
              <div {...stylex.props(styles.proof)}>
                <LuShieldCheck size={18} aria-hidden="true" {...stylex.props(styles.proofIcon)} />
                <div>
                  <span {...stylex.props(styles.proofTitle)}>{t("openAuditable.auditTitle", "Auditable code")}</span>
                  <span {...stylex.props(styles.proofText)}>
                    {t("openAuditable.auditText", "How the client reads files, calls tools, and talks to model providers is all written in public source code — read it line by line.")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="open-auditable-closing-mobile">
        <div {...stylex.props(styles.closing)}>
          <div className="open-auditable-closing-copy">
            <p {...stylex.props(styles.closingLead)}>{t(`${BRAND_NS}.closingLead`)}</p>
            <p {...stylex.props(styles.closingLines)}>
              {closingLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </p>
          </div>
          <strong {...stylex.props(styles.closingEnd)}>{t(`${BRAND_NS}.closingEnd`)}</strong>
          <div {...stylex.props(styles.closingActions)}>
            <NavLink to="/signup" {...stylex.props(styles.primaryAction)}>
              {t("homeLandingHero.primaryCta")}
            </NavLink>
            <div className="open-auditable-closing-download">
              <NavLink to="/downloads" {...stylex.props(styles.secondaryAction)}>
                <LuDownload size={16} aria-hidden="true" />
                <span>{t(`${BRAND_NS}.secondaryCta`)}</span>
              </NavLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OpenAuditableSection;
