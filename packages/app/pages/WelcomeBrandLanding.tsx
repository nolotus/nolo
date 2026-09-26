import { useCallback, useId, useMemo, useRef, useState } from "react";
import { NavLink, useSearchParams } from "app/routing";
import { LuCheck, LuDownload, LuMinus } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import TabsNav from "render/web/ui/TabsNav";
import WelcomeOrchestrationDiagramLazy from "./WelcomeOrchestrationDiagram.lazy";
import type { OrchestrationDiagramTab } from "./WelcomeOrchestrationDiagram";
import { readOrchestrationTabFromSearch } from "./welcomeOrchestrationTabState";

import "./WelcomeBrandLanding.css";
import "./WelcomeBrandLanding.mobile.css";
import "./WelcomeBrandLanding.story.css";
import "./WelcomeSection.css";
import "./WelcomeSection.orchestration.css";

const NS = "welcomeSection.brandLanding";
const HERO_NS = "homeLandingHero";
const WHY_NS = "homeLandingWhy";
const RECEIPT_NS = "homeLandingReceipt";

const WelcomeBrandLanding = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const orchestrationTabsId = useId();
  const orchestrationPanelId = useId();
  const panelTitleRef = useRef<HTMLHeadingElement | null>(null);

  const contrasts = t(`${NS}.contrasts`, { returnObjects: true }) as string[];
  const singleAiItems = t(`${WHY_NS}.singleItems`, { returnObjects: true }) as string[];
  const noloItems = t(`${WHY_NS}.noloItems`, { returnObjects: true }) as string[];

  const [orchestrationTab, setOrchestrationTab] = useState<OrchestrationDiagramTab>(() => {
    if (typeof window === "undefined") return "coding";
    return readOrchestrationTabFromSearch(window.location.search) ?? "coding";
  });

  const orchestrationTabs = useMemo(
    () => [
      { id: "coding" as const, label: t("welcomeSection.orchestration.tabs.coding") },
      { id: "brainstorm" as const, label: t("welcomeSection.orchestration.tabs.brainstorm") },
      { id: "consensus" as const, label: t("welcomeSection.orchestration.tabs.consensus") },
      { id: "video" as const, label: t("welcomeSection.orchestration.tabs.video") },
    ],
    [t],
  );

  const codingMobileSteps = t("welcomeSection.showcase.mobileSteps", {
    returnObjects: true,
  }) as Array<{ title: string; desc: string }>;
  const brainstormMobileSteps = t("welcomeSection.showcaseBrainstorm.mobileSteps", {
    returnObjects: true,
  }) as Array<{ title: string; desc: string }>;
  const consensusMobileSteps = t("welcomeSection.showcaseConsensus.mobileSteps", {
    returnObjects: true,
  }) as Array<{ title: string; desc: string }>;
  const videoMobileSteps = t("welcomeSection.showcaseVideo.mobileSteps", {
    returnObjects: true,
  }) as Array<{ title: string; desc: string }>;
  const consensusOutputLabels = t("welcomeSection.showcaseConsensus.outputLabels", {
    returnObjects: true,
  }) as { consensus: string; disagreements: string; nextStep: string };
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

  const mobileProofSteps = activeMobileSteps.filter((_, index, steps) => {
    if (steps.length <= 3) return true;
    const middle = Math.floor((steps.length - 1) / 2);
    return index === 0 || index === middle || index === steps.length - 1;
  });
  const executionSummary = mobileProofSteps.slice(0, 2).map((step) => step.title).join(" · ");
  const reviewSummary = mobileProofSteps.at(-1)?.title ?? t(`${RECEIPT_NS}.review`);

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
      queueMicrotask(() => panelTitleRef.current?.focus({ preventScroll: true }));
    },
    [setSearchParams],
  );

  return (
    <div className="welcome-brand-landing">
      <section className="wbl-hero" aria-labelledby="wbl-title">
        <div className="wbl-shell">
          <div className="wbl-kicker">{t(`${NS}.kicker`)}</div>
          <h1 id="wbl-title" className="wbl-title">
            {t(`${HERO_NS}.title`)}
          </h1>
          <p className="wbl-description">{t(`${HERO_NS}.description`)}</p>
          <p className="wbl-continuity">{t(`${NS}.continuity`)}</p>

          <div className="wbl-actions">
            <NavLink to="/signup" className="wbl-btn wbl-btn-primary">
              {t(`${HERO_NS}.primaryCta`)}
            </NavLink>
            <NavLink to="/downloads" className="wbl-btn wbl-btn-secondary">
              <LuDownload size={16} aria-hidden="true" />
              <span>{t(`${NS}.secondaryCta`)}</span>
            </NavLink>
          </div>

          <ul className="wbl-contrasts" aria-label={t(`${NS}.contrastsLabel`)}>
            {contrasts.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="wbl-product-proof" aria-labelledby="wbl-proof-title">
        <div className="wbl-shell">
          <header className="wbl-product-proof-head">
            <div className="wbl-section-kicker">{t(`${NS}.proofKicker`)}</div>
            <h2 id="wbl-proof-title">{t("welcomeSection.orchestration.title")}</h2>
            <p>{t("welcomeSection.orchestration.desc")}</p>
          </header>

          <div className="wbl-orchestration-shell">
            <TabsNav
              tabs={orchestrationTabs}
              activeTab={orchestrationTab}
              onChange={handleOrchestrationTabChange}
              className="ws-orchestration-tabs"
              id={orchestrationTabsId}
              panelId={orchestrationPanelId}
              activeTabId={`${orchestrationPanelId}-tab-${orchestrationTab}`}
            />

            <div
              className="ws-orchestration-panel wbl-orchestration-panel"
              role="tabpanel"
              id={orchestrationPanelId}
              aria-labelledby={`${orchestrationPanelId}-tab-${orchestrationTab}`}
            >
              <div key={orchestrationTab} className="ws-orchestration-tab-body">
                <p className="ws-orchestration-example-label">{activeExampleLabel}</p>
                <div className="ws-workflow-desc ws-workflow-desc--lead">
                  <h3 ref={panelTitleRef} tabIndex={-1} className="ws-orchestration-panel-title">
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

                <div className="wbl-mobile-proof" aria-label={activeExampleTitle}>
                  <div className="wbl-mobile-proof-task">
                    <span>{activeExampleLabel}</span>
                    <h3>{activeExampleTitle}</h3>
                    <p>{activeExampleDesc}</p>
                  </div>
                  <div className="wbl-mobile-proof-route">
                    {mobileProofSteps.map((step, index) => (
                      <div key={`${orchestrationTab}-${step.title}`} className="wbl-mobile-proof-step">
                        <span>{index + 1}</span>
                        <strong>{step.title}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="wbl-receipt" aria-labelledby="wbl-receipt-title">
        <div className="wbl-shell wbl-receipt-shell">
          <header className="wbl-receipt-head">
            <div className="wbl-section-kicker">{t(`${RECEIPT_NS}.kicker`)}</div>
            <h2 id="wbl-receipt-title">{t(`${RECEIPT_NS}.title`)}</h2>
          </header>
          <div className="wbl-receipt-grid">
            <div className="wbl-receipt-item">
              <span>{t(`${RECEIPT_NS}.goal`)}</span>
              <strong>{activeExampleTitle}</strong>
            </div>
            <div className="wbl-receipt-item">
              <span>{t(`${RECEIPT_NS}.execution`)}</span>
              <strong>{executionSummary}</strong>
            </div>
            <div className="wbl-receipt-item">
              <span>{t(`${RECEIPT_NS}.review`)}</span>
              <strong>{reviewSummary}</strong>
            </div>
            <div className="wbl-receipt-item wbl-receipt-result">
              <span>{t(`${RECEIPT_NS}.result`)}</span>
              <strong>{t(`${RECEIPT_NS}.resultValue`)}</strong>
            </div>
          </div>
          <p className="wbl-receipt-note">{t(`${RECEIPT_NS}.note`)}</p>
        </div>
      </section>

      <section className="wbl-why" aria-labelledby="wbl-why-title">
        <div className="wbl-shell wbl-why-layout">
          <header className="wbl-why-copy">
            <div className="wbl-section-kicker">{t(`${WHY_NS}.kicker`)}</div>
            <h2 id="wbl-why-title">{t(`${WHY_NS}.title`)}</h2>
            <p>{t(`${WHY_NS}.description`)}</p>
          </header>

          <div className="wbl-compare" aria-label={t(`${WHY_NS}.title`)}>
            <article className="wbl-compare-card wbl-compare-card-single">
              <div className="wbl-compare-label">{t(`${WHY_NS}.singleLabel`)}</div>
              <ul>
                {singleAiItems.map((item) => (
                  <li key={item}>
                    <LuMinus size={15} aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="wbl-compare-card wbl-compare-card-nolo">
              <div className="wbl-compare-label">{t(`${WHY_NS}.noloLabel`)}</div>
              <ul>
                {noloItems.map((item) => (
                  <li key={item}>
                    <LuCheck size={15} aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
};

export default WelcomeBrandLanding;
