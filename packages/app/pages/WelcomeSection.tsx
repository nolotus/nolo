import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { NavLink, useSearchParams } from "app/routing";
import { LuDownload } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import TabsNav from "render/web/ui/TabsNav";
import { useScrollReveal } from "app/hooks/useScrollReveal";
import WelcomeOrchestrationDiagramLazy from "./WelcomeOrchestrationDiagram.lazy";
import type { OrchestrationDiagramTab } from "./WelcomeOrchestrationDiagram";
import WelcomeFaqAccordion from "./WelcomeFaqAccordion";
import { readOrchestrationTabFromSearch } from "./welcomeOrchestrationTabState";
import "./home-motion.css";
import "./WelcomeSection.css";
import "./WelcomeSection.hero.css";
import "./WelcomeSection.orchestration.css";

const WelcomeSection = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const orchestrationTabsId = useId();
  const orchestrationPanelId = useId();
  const panelTitleRef = useRef<HTMLHeadingElement | null>(null);

  const orchestrationReveal = useScrollReveal();
  const faqReveal = useScrollReveal();
  const finalCtaReveal = useScrollReveal();

  const [orchestrationTab, setOrchestrationTab] = useState<OrchestrationDiagramTab>(() => {
    if (typeof window === "undefined") return "coding";
    return readOrchestrationTabFromSearch(window.location.search) ?? "coding";
  });

  useEffect(() => {
    const tabFromUrl = readOrchestrationTabFromSearch(searchParams.toString());
    if (tabFromUrl) {
      setOrchestrationTab(tabFromUrl);
    }
  }, [searchParams]);

  const orchestrationTabs = useMemo(
    () => [
      { id: "coding" as const, label: t("welcomeSection.orchestration.tabs.coding") },
      { id: "brainstorm" as const, label: t("welcomeSection.orchestration.tabs.brainstorm") },
      { id: "consensus" as const, label: t("welcomeSection.orchestration.tabs.consensus") },
      { id: "video" as const, label: t("welcomeSection.orchestration.tabs.video") },
    ],
    [t],
  );

  const handleOrchestrationTabChange = useCallback(
    (tabId: string | number) => {
      const nextTab = tabId as OrchestrationDiagramTab;
      setOrchestrationTab(nextTab);
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.set("demo", nextTab);
          return next;
        },
        { replace: true },
      );
      queueMicrotask(() => {
        panelTitleRef.current?.focus({ preventScroll: true });
      });
    },
    [setSearchParams],
  );

  const heroHighlights = [
    t("welcomeSection.highlights.customize"),
    t("welcomeSection.highlights.orchestrate"),
  ];
  const codingMobileSteps = t("welcomeSection.showcase.mobileSteps", {
    returnObjects: true,
  }) as Array<{ title: string; desc: string }>;
  const brainstormMobileSteps = t("welcomeSection.showcaseBrainstorm.mobileSteps", {
    returnObjects: true,
  }) as Array<{ title: string; desc: string }>;
  const consensusMobileSteps = t("welcomeSection.showcaseConsensus.mobileSteps", {
    returnObjects: true,
  }) as Array<{ title: string; desc: string }>;
  const consensusOutputLabels = t("welcomeSection.showcaseConsensus.outputLabels", {
    returnObjects: true,
  }) as { consensus: string; disagreements: string; nextStep: string };
  const videoMobileSteps = t("welcomeSection.showcaseVideo.mobileSteps", {
    returnObjects: true,
  }) as Array<{ title: string; desc: string }>;
  const videoAgentLabels = t("welcomeSection.showcaseVideo.agentLabels", {
    returnObjects: true,
  }) as {
    orchestrator: string;
    script: string;
    storyboard: string;
    visual: string;
    editor: string;
    deliver: string;
  };
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
      question: t("welcomeSection.faq.entry.question"),
      answer: t("welcomeSection.faq.entry.answer"),
    },
    {
      question: t("welcomeSection.faq.orchestration.question"),
      answer: t("welcomeSection.faq.orchestration.answer"),
    },
  ];
  const activeMobileSteps =
    orchestrationTab === "coding"
      ? codingMobileSteps
      : orchestrationTab === "brainstorm"
        ? brainstormMobileSteps
        : orchestrationTab === "consensus"
          ? consensusMobileSteps
          : videoMobileSteps;
  const activeExampleTitle =
    orchestrationTab === "coding"
      ? t("welcomeSection.showcase.title")
      : orchestrationTab === "brainstorm"
        ? t("welcomeSection.showcaseBrainstorm.title")
        : orchestrationTab === "consensus"
          ? t("welcomeSection.showcaseConsensus.title")
          : t("welcomeSection.showcaseVideo.title");
  const activeExampleLabel =
    orchestrationTab === "coding"
      ? t("welcomeSection.showcase.exampleLabel")
      : orchestrationTab === "brainstorm"
        ? t("welcomeSection.showcaseBrainstorm.exampleLabel")
        : orchestrationTab === "consensus"
          ? t("welcomeSection.showcaseConsensus.exampleLabel")
          : t("welcomeSection.showcaseVideo.exampleLabel");
  const activeExampleDesc =
    orchestrationTab === "coding"
      ? t("welcomeSection.showcase.desc")
      : orchestrationTab === "brainstorm"
        ? t("welcomeSection.showcaseBrainstorm.desc")
        : orchestrationTab === "consensus"
          ? t("welcomeSection.showcaseConsensus.desc")
          : t("welcomeSection.showcaseVideo.desc");

  return (
    <section className="ws-page">
      <div className="ws-container">
        <div className="ws-hero">
          <div className="ws-hero-mountain-art" aria-hidden="true">
            {/* Day Celestial: Sun (Standalone HTML 1:1 CSS Square Viewport - 100% Round Circle in all Browsers) */}
            <svg viewBox="0 0 48 48" className="ws-hero-sun ws-celestial-sun">
              <circle cx="24" cy="24" r="14" fill="#fa8c16" />
              <line x1="24" y1="0" x2="24" y2="4" stroke="#faad14" strokeWidth="2" strokeLinecap="round" />
              <line x1="24" y1="44" x2="24" y2="48" stroke="#faad14" strokeWidth="2" strokeLinecap="round" />
              <line x1="0" y1="24" x2="4" y2="24" stroke="#faad14" strokeWidth="2" strokeLinecap="round" />
              <line x1="44" y1="24" x2="48" y2="24" stroke="#faad14" strokeWidth="2" strokeLinecap="round" />
            </svg>

            {/* Night Celestial: Moon (Standalone HTML 1:1 CSS Square Viewport) */}
            <svg viewBox="0 0 50 50" className="ws-hero-moon ws-celestial-moon">
              <path d="M 25,8 A 18,18 0 1,0 35,36 A 22,22 0 1,1 25,8 Z" fill="#e6f7ff" opacity="0.95" />
            </svg>

            {/* Mountain Background SVG */}
            <svg viewBox="0 0 1200 320" preserveAspectRatio="none" className="ws-mountain-svg">
              <defs>
                <linearGradient id="wsMtnGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="color-mix(in srgb, var(--primary, #1677ff) 22%, transparent)" />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
                <linearGradient id="wsMtnGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="color-mix(in srgb, var(--primary, #1677ff) 14%, transparent)" />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
                <linearGradient id="wsMtnPeak" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="color-mix(in srgb, #36cfc9 35%, transparent)" />
                  <stop offset="100%" stopColor="color-mix(in srgb, var(--primary, #1677ff) 12%, transparent)" />
                </linearGradient>
              </defs>

              {/* Back Mountain Left */}
              <polygon points="120,320 340,140 560,320" fill="url(#wsMtnGrad2)" stroke="color-mix(in srgb, var(--primary) 20%, transparent)" strokeWidth="1" opacity="0.65" />
              <polygon points="340,140 440,220 560,320" fill="url(#wsMtnGrad2)" opacity="0.45" />

              {/* Main Mountain Center Peak */}
              <polygon points="320,320 600,60 880,320" fill="url(#wsMtnGrad1)" stroke="color-mix(in srgb, var(--primary) 35%, transparent)" strokeWidth="1.2" />
              <polygon points="600,60 720,170 880,320" fill="url(#wsMtnGrad2)" opacity="0.75" />
              <polygon points="600,60 655,115 540,135" fill="url(#wsMtnPeak)" opacity="0.9" />

              {/* Back Mountain Right */}
              <polygon points="720,320 940,130 1140,320" fill="url(#wsMtnGrad2)" stroke="color-mix(in srgb, var(--primary) 22%, transparent)" strokeWidth="1" opacity="0.6" />
              <polygon points="940,130 1030,210 1140,320" fill="url(#wsMtnGrad2)" opacity="0.4" />

              {/* Geometric Pine Trees (Left & Right Foothills Accent - Softened & Shifted Outward) */}
              <g className="ws-geometric-trees" fill="color-mix(in srgb, #36cfc9 18%, transparent)" stroke="color-mix(in srgb, #36cfc9 35%, transparent)" strokeWidth="0.8" opacity="0.75">
                {/* Left Foothill Trees (Shifted Left 35px) */}
                <line x1="175" y1="275" x2="175" y2="319" stroke="color-mix(in srgb, var(--primary) 30%, transparent)" strokeWidth="1.2" />
                <polygon points="175,248 163,272 187,272" />
                <polygon points="175,258 159,284 191,284" />
                <polygon points="175,268 155,296 195,296" />

                <line x1="201" y1="260" x2="201" y2="319" stroke="color-mix(in srgb, var(--primary) 30%, transparent)" strokeWidth="1.2" />
                <polygon points="201,228 187,254 215,254" />
                <polygon points="201,240 183,268 219,268" />
                <polygon points="201,252 179,282 223,282" />

                <line x1="223" y1="285" x2="223" y2="319" stroke="color-mix(in srgb, var(--primary) 30%, transparent)" strokeWidth="1.2" />
                <polygon points="223,265 213,285 233,285" />
                <polygon points="223,275 209,298 237,298" />

                {/* Right Foothill Trees (Shifted Right 35px) */}
                <line x1="990" y1="255" x2="990" y2="319" stroke="color-mix(in srgb, var(--primary) 30%, transparent)" strokeWidth="1.2" />
                <polygon points="990,222 976,248 1004,248" />
                <polygon points="990,234 972,262 1008,262" />
                <polygon points="990,246 968,276 1012,276" />

                <line x1="1017" y1="270" x2="1017" y2="319" stroke="color-mix(in srgb, var(--primary) 30%, transparent)" strokeWidth="1.2" />
                <polygon points="1017,242 1005,266 1029,266" />
                <polygon points="1017,252 1001,278 1033,278" />
                <polygon points="1017,262 997,290 1037,290" />

                <line x1="1041" y1="286" x2="1041" y2="319" stroke="color-mix(in srgb, var(--primary) 30%, transparent)" strokeWidth="1.2" />
                <polygon points="1041,266 1031,286 1051,286" />
                <polygon points="1041,276 1027,299 1055,299" />
              </g>

              {/* Horizon Line */}
              <line x1="0" y1="319" x2="1200" y2="319" stroke="color-mix(in srgb, var(--primary) 25%, transparent)" strokeWidth="1" />
            </svg>
          </div>
          <h1 className="ws-hero-title">
            <span className="ws-gradient-text">{t("welcomeSection.heroTitle")}</span>
          </h1>
          <ul className="ws-hero-highlights" aria-label={t("welcomeSection.highlightsLabel")}>
            {heroHighlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="ws-cta-main">
            <NavLink to="/signup" className="ws-cta-btn ws-cta-primary">
              {t("welcomeSection.ctaButton")}
            </NavLink>
            <NavLink to="/downloads" className="ws-cta-btn ws-cta-download">
              <LuDownload size={16} aria-hidden="true" />
              <span>{t("downloadClient", "下载客户端")}</span>
            </NavLink>
          </div>
        </div>

        <div className="ws-orchestration-section">
          <div
            ref={orchestrationReveal.ref}
            className={`ws-orchestration-head ${orchestrationReveal.className}`}
          >
            <div className="ws-section-kicker">{t("welcomeSection.orchestration.kicker")}</div>
            <h2 className="ws-workflow-desc-title">{t("welcomeSection.orchestration.title")}</h2>
            <p className="ws-workflow-desc-text">{t("welcomeSection.orchestration.desc")}</p>
          </div>

          <TabsNav
            tabs={orchestrationTabs}
            activeTab={orchestrationTab}
            onChange={handleOrchestrationTabChange}
            className="ws-orchestration-tabs"
            id={orchestrationTabsId}
            panelId={orchestrationPanelId}
          />

          <div
            className="ws-orchestration-panel"
            role="tabpanel"
            id={orchestrationPanelId}
            aria-labelledby={orchestrationTabsId}
          >
            <div key={orchestrationTab} className="ws-orchestration-tab-body">
              <p className="ws-orchestration-example-label">{activeExampleLabel}</p>
              <div className="ws-workflow-desc ws-workflow-desc--lead">
                <h3
                  ref={panelTitleRef}
                  tabIndex={-1}
                  className="ws-orchestration-panel-title"
                >
                  {activeExampleTitle}
                </h3>
                <p className="ws-workflow-desc-text">{activeExampleDesc}</p>
              </div>

              <div className="ws-orchestration-stage">
                <WelcomeOrchestrationDiagramLazy
                  tab={orchestrationTab}
                  t={t}
                  videoAgentLabels={videoAgentLabels}
                  consensusOutputLabels={consensusOutputLabels}
                />
              </div>

              <ol className="wf-mobile-steps" aria-label={activeExampleTitle}>
                {activeMobileSteps.map((step, index) => (
                  <li key={`${orchestrationTab}-${step.title}`} className="wf-mobile-step">
                    <span className="wf-mobile-step-index">{index + 1}</span>
                    <div className="wf-mobile-step-copy">
                      <h3>{step.title}</h3>
                      <p>{step.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <p className="ws-orchestration-footnote">{t("welcomeSection.orchestration.footnote")}</p>
            </div>
          </div>
        </div>

        <div className={`ws-builder-bridge ws-section--editorial ${orchestrationReveal.className}`}>
          <div className="ws-builder-bridge-lead">
            <div className="ws-section-kicker">{t("welcomeSection.builder.badge")}</div>
            <h2 className="ws-builder-bridge-title">{t("welcomeSection.builder.title")}</h2>
            <p className="ws-builder-bridge-desc">{t("welcomeSection.builder.desc")}</p>
            <NavLink to="/create/agent" className="ws-cta-btn ws-cta-primary ws-builder-bridge-cta">
              {t("welcomeSection.builder.cta")}
            </NavLink>
          </div>
          <div className="ws-builder-bridge-caps">
            {(t("welcomeSection.builder.capabilities", { returnObjects: true }) as Array<{ title: string; desc: string }>).map((cap) => (
              <div key={cap.title} className="ws-builder-bridge-cap">
                <h3>{cap.title}</h3>
                <p>{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={`ws-deliverables ws-section--editorial ${orchestrationReveal.className}`}>
          <div className="ws-deliverables-head">
            <div className="ws-section-kicker">{t("welcomeSection.output.badge")}</div>
            <h2 className="ws-deliverables-title">{t("welcomeSection.output.title")}</h2>
            <p className="ws-deliverables-desc">{t("welcomeSection.output.desc")}</p>
          </div>
          <div className="ws-deliverables-grid">
            {(t("welcomeSection.output.types", { returnObjects: true }) as Array<{ label: string; example: string }>).map((type) => (
              <div key={type.label} className="ws-deliverable-card">
                <span className="ws-deliverable-label">{type.label}</span>
                <span className="ws-deliverable-example">{type.example}</span>
              </div>
            ))}
          </div>
        </div>

        <section
          ref={faqReveal.ref}
          className={`ws-faq-section ws-section--editorial ${faqReveal.className}`}
          aria-labelledby="ws-faq-title"
        >
          <div className="ws-faq-head">
            <div className="ws-section-kicker">{t("welcomeSection.faq.kicker")}</div>
            <h2 id="ws-faq-title" className="ws-section-title">
              {t("welcomeSection.faq.title")}
            </h2>
            <p className="ws-section-desc">{t("welcomeSection.faq.description")}</p>
          </div>
          <WelcomeFaqAccordion items={faqItems} />
        </section>

        <div
          ref={finalCtaReveal.ref}
          className={`ws-bottom-cta ws-final-cta ${finalCtaReveal.className}`}
        >
          <div className="ws-bottom-cta-inner">
            <div className="ws-section-kicker">{t("welcomeSection.finalCta.kicker")}</div>
            <h2 className="ws-bottom-cta-title">{t("welcomeSection.finalCta.title")}</h2>
            <p className="ws-bottom-cta-desc">{t("welcomeSection.finalCta.description")}</p>
            <div className="ws-final-cta-actions">
              <NavLink to="/signup" className="ws-cta-btn ws-cta-primary ws-cta-lg">
                {t("welcomeSection.finalCta.primary")}
              </NavLink>
              <NavLink to="/downloads" className="ws-cta-btn ws-cta-download ws-cta-lg">
                <LuDownload size={18} aria-hidden="true" />
                <span>{t("downloadClient", "下载客户端")}</span>
              </NavLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default React.memo(WelcomeSection);