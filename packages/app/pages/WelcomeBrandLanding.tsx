import { useCallback, useId, useMemo, useRef, useState } from "react";
import { NavLink, useSearchParams } from "app/routing";
import { LuDownload } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import TabsNav from "render/web/ui/TabsNav";
import WelcomeOrchestrationDiagramLazy from "./WelcomeOrchestrationDiagram.lazy";
import type { OrchestrationDiagramTab } from "./WelcomeOrchestrationDiagram";
import { readOrchestrationTabFromSearch } from "./welcomeOrchestrationTabState";

import "./WelcomeBrandLanding.css";
import "./WelcomeSection.css";
import "./WelcomeSection.orchestration.css";

type Principle = { title: string; description: string; proof: string };

const NS = "welcomeSection.brandLanding";

const WelcomeBrandLanding = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const orchestrationTabsId = useId();
  const orchestrationPanelId = useId();
  const panelTitleRef = useRef<HTMLHeadingElement | null>(null);

  const principles = t(`${NS}.principles`, { returnObjects: true }) as Principle[];
  const contrasts = t(`${NS}.contrasts`, { returnObjects: true }) as string[];
  const systemItems = t(`${NS}.systemItems`, { returnObjects: true }) as string[];
  const youItems = t(`${NS}.youItems`, { returnObjects: true }) as string[];

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
            {t(`${NS}.title`)}
          </h1>
          <p className="wbl-description">{t(`${NS}.description`)}</p>
          <p className="wbl-continuity">{t(`${NS}.continuity`)}</p>

          <div className="wbl-actions">
            <NavLink to="/signup" className="wbl-btn wbl-btn-primary">
              {t(`${NS}.primaryCta`)}
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
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="wbl-principles" aria-label="How Nolo works with you">
        <div className="wbl-shell">
          <div className="wbl-principles-grid">
            {principles.map((principle, index) => (
              <article key={principle.title} className="wbl-principle">
                <span className="wbl-principle-index">0{index + 1}</span>
                <div className="wbl-principle-proof">{principle.proof}</div>
                <h2>{principle.title}</h2>
                <p>{principle.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="wbl-balance">
        <div className="wbl-shell wbl-balance-layout">
          <div className="wbl-balance-copy">
            <div className="wbl-section-kicker">{t(`${NS}.balanceKicker`)}</div>
            <h2>{t(`${NS}.balanceTitle`)}</h2>
            <p>{t(`${NS}.balanceDescription`)}</p>
          </div>
          <div className="wbl-balance-columns">
            <div className="wbl-balance-column">
              <h3>{t(`${NS}.systemLabel`)}</h3>
              <ul>
                {systemItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="wbl-balance-column wbl-balance-column-human">
              <h3>{t(`${NS}.youLabel`)}</h3>
              <ul>
                {youItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default WelcomeBrandLanding;
