import { NavLink } from "app/routing";
import { useTranslation } from "react-i18next";
import { LuDownload, LuExternalLink, LuFileCheck2, LuGitCommitHorizontal, LuShieldCheck } from "react-icons/lu";
import * as stylex from "@stylexjs/stylex";
import WelcomeFaqAccordion from "./WelcomeFaqAccordion";
import { withLiteralClass } from "./share/withLiteralClass";
import "./OpenAuditableSection.css";

const PUBLIC_SOURCE_URL = "https://github.com/nolotus/nolo";
const RELEASE_MANIFEST_URL = "/public/downloads/desktop-release-manifest.json";
const BRAND_NS = "welcomeSection.brandLanding";
const FAQ_NS = "homeLandingFaq";

const styles = stylex.create({
  section: {
    width: "100%",
    maxWidth: "1120px",
    margin: "20px auto 72px",
    padding: "0 24px",
  },
  shell: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "color-mix(in srgb, var(--primary, #1677ff) 22%, var(--border-color, #d0d7de))",
    borderRadius: 18,
    padding: "24px",
    backgroundColor: "color-mix(in srgb, var(--primary, #1677ff) 4%, var(--background-color, #fff))",
    boxShadow: "0 12px 36px color-mix(in srgb, var(--primary, #1677ff) 7%, transparent)",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 20,
    flexWrap: "wrap",
  },
  kicker: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--primary, #1677ff)",
  },
  title: {
    margin: "8px 0 6px",
    fontSize: "clamp(1.35rem, 2vw, 1.8rem)",
    lineHeight: 1.25,
    color: "var(--text-color, inherit)",
  },
  description: {
    margin: 0,
    maxWidth: 720,
    lineHeight: 1.65,
    color: "var(--text-secondary, #57606a)",
  },
  links: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  link: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    minHeight: 38,
    padding: "8px 12px",
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--border-color, #d0d7de)",
    textDecoration: "none",
    fontWeight: 600,
    color: "var(--text-color, inherit)",
    backgroundColor: "var(--background-color, #fff)",
  },
  proofs: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 12,
    marginTop: 20,
  },
  proof: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "12px 14px",
    borderRadius: 12,
    backgroundColor: "color-mix(in srgb, var(--background-color, #fff) 82%, transparent)",
  },
  proofIcon: {
    flexShrink: 0,
    marginTop: 2,
    color: "var(--primary, #1677ff)",
  },
  proofTitle: {
    display: "block",
    fontSize: 14,
    fontWeight: 700,
    color: "var(--text-color, inherit)",
  },
  proofText: {
    display: "block",
    marginTop: 2,
    fontSize: 13,
    lineHeight: 1.5,
    color: "var(--text-secondary, #57606a)",
  },
  closing: {
    maxWidth: 880,
    margin: "64px auto 0",
    paddingTop: 56,
    borderTop: "1px solid var(--border-color, #e5e7eb)",
    textAlign: "center",
  },
  closingLead: {
    margin: 0,
    color: "var(--text-secondary, #57606a)",
    fontSize: 16,
    lineHeight: 1.7,
  },
  closingLines: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "8px 22px",
    margin: "22px 0 0",
    color: "var(--text-color, inherit)",
    fontSize: "clamp(1.55rem, 3.4vw, 2.55rem)",
    fontWeight: 760,
    lineHeight: 1.18,
    letterSpacing: "-0.035em",
  },
  closingEnd: {
    display: "block",
    marginTop: 14,
    color: "var(--primary, #1677ff)",
    fontSize: "clamp(1.7rem, 3.8vw, 2.8rem)",
    fontWeight: 800,
    letterSpacing: "-0.04em",
  },
  closingActions: {
    display: "flex",
    justifyContent: "center",
    gap: 12,
    marginTop: 30,
    flexWrap: "wrap",
  },
  primaryAction: {
    minHeight: 46,
    padding: "0 21px",
    borderRadius: 11,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    textDecoration: "none",
    fontWeight: 680,
    color: "#fff",
    backgroundColor: "var(--primary, #1677ff)",
    boxShadow: "0 8px 24px color-mix(in srgb, var(--primary, #1677ff) 18%, transparent)",
  },
  secondaryAction: {
    minHeight: 46,
    padding: "0 21px",
    borderRadius: 11,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    textDecoration: "none",
    fontWeight: 680,
    color: "var(--text-color, inherit)",
    backgroundColor: "var(--background-color, #fff)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "color-mix(in srgb, var(--primary, #1677ff) 20%, var(--border-color, #d0d7de))",
  },
});

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
                {t("openAuditable.kicker", "Open & Auditable")}
              </div>
              <h2 id="open-auditable-title" {...stylex.props(styles.title)}>
                {t("openAuditable.title", "Don’t trust the binary. Verify it.")}
              </h2>
              <p {...stylex.props(styles.description)}>
                {t(
                  "openAuditable.description",
                  "Nolo’s client source is public. Official desktop release metadata records the exact public repository commit used for the build and the SHA-256 of each artifact.",
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
            <div className="open-auditable-proof open-auditable-proof-commit">
              <div {...stylex.props(styles.proof)}>
                <LuGitCommitHorizontal size={18} aria-hidden="true" {...stylex.props(styles.proofIcon)} />
                <div>
                  <span {...stylex.props(styles.proofTitle)}>{t("openAuditable.publicCommitTitle", "Exact public commit")}</span>
                  <span {...stylex.props(styles.proofText)}>
                    {t("openAuditable.publicCommitText", "Release metadata records the exact public projection SHA used for the build.")}
                  </span>
                </div>
              </div>
            </div>
            <div className="open-auditable-proof open-auditable-proof-hash">
              <div {...stylex.props(styles.proof)}>
                <LuFileCheck2 size={18} aria-hidden="true" {...stylex.props(styles.proofIcon)} />
                <div>
                  <span {...stylex.props(styles.proofTitle)}>{t("openAuditable.hashTitle", "Artifact checksum")}</span>
                  <span {...stylex.props(styles.proofText)}>
                    {t("openAuditable.hashText", "The public manifest records SHA-256 for each downloadable desktop artifact.")}
                  </span>
                </div>
              </div>
            </div>
            <div className="open-auditable-proof open-auditable-proof-audit">
              <div {...stylex.props(styles.proof)}>
                <LuShieldCheck size={18} aria-hidden="true" {...stylex.props(styles.proofIcon)} />
                <div>
                  <span {...stylex.props(styles.proofTitle)}>{t("openAuditable.auditTitle", "Auditable client")}</span>
                  <span {...stylex.props(styles.proofText)}>
                    {t("openAuditable.auditText", "Inspect how the client reads files, invokes tools, and talks to model providers.")}
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
