import { useCallback, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import TabsNav from "render/web/ui/TabsNav";
import WelcomeOrchestrationDiagramLazy from "./WelcomeOrchestrationDiagram.lazy";
import type { OrchestrationDiagramTab } from "./WelcomeOrchestrationDiagram";
import { readOrchestrationTabFromSearch, writeOrchestrationTabToUrl } from "./welcomeOrchestrationTabState";

import "./WelcomeSection.css";
import "./WelcomeSection.orchestration.css";

type Step = { title: string; desc: string };
type VisibleTab = Exclude<OrchestrationDiagramTab, "video">;
const VISIBLE_TABS: VisibleTab[] = ["coding", "brainstorm", "consensus"];

const EXAMPLE_KEYS: Record<VisibleTab, string> = {
  coding: "welcomeSection.showcase",
  brainstorm: "welcomeSection.showcaseBrainstorm",
  consensus: "welcomeSection.showcaseConsensus",
};

/**
 * Tabbed, animated orchestration diagrams (coding delivery / parallel
 * brainstorm / consensus). Shared by the guest home; the diagram itself lives
 * in WelcomeOrchestrationDiagram. Desktop shows the animated SVG; mobile shows
 * a compact outcome-first route instead of a tall vertical flow.
 */
const OrchestrationShowcase = ({ className = "" }: { className?: string }) => {
  const { t } = useTranslation();
  const tabsId = useId();
  const panelId = useId();
  const panelTitleRef = useRef<HTMLHeadingElement | null>(null);

  const [tab, setTab] = useState<VisibleTab>(() => {
    if (typeof window === "undefined") return "coding";
    const fromUrl = readOrchestrationTabFromSearch(window.location.search);
    return fromUrl && fromUrl !== "video" ? fromUrl : "coding";
  });

  const tabs = useMemo(
    () => VISIBLE_TABS.map((id) => ({ id, label: t(`welcomeSection.orchestration.tabs.${id}`) })),
    [t],
  );

  const exampleKey = EXAMPLE_KEYS[tab];
  const title = t(`${exampleKey}.title`);
  const steps = t(`${exampleKey}.mobileSteps`, { returnObjects: true }) as Step[];
  const routeSteps = steps.filter((_, index, all) => {
    if (all.length <= 3) return true;
    const middle = Math.floor((all.length - 1) / 2);
    return index === 0 || index === middle || index === all.length - 1;
  });

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

  const handleTabChange = useCallback(
    (tabId: string | number) => {
      const next = tabId as VisibleTab;
      setTab(next);
      // Keep ?demo= shareable without a router navigation: going through the
      // router re-rendered the whole layout on every switch (~100ms jank).
      writeOrchestrationTabToUrl(next);
      queueMicrotask(() => panelTitleRef.current?.focus({ preventScroll: true }));
    },
    [],
  );

  return (
    <div className={`orch-showcase ${className}`.trim()}>
      <TabsNav
        tabs={tabs}
        activeTab={tab}
        onChange={handleTabChange}
        className="ws-orchestration-tabs"
        id={tabsId}
        panelId={panelId}
        activeTabId={`${panelId}-tab-${tab}`}
      />
      <div
        className="ws-orchestration-panel orch-showcase-panel"
        role="tabpanel"
        id={panelId}
        aria-labelledby={`${panelId}-tab-${tab}`}
      >
        <div className="ws-orchestration-tab-body">
          {/* Captions stack too: switching is an opacity change, not a remount. */}
          <div className="orch-showcase-copy-stack">
            {VISIBLE_TABS.map((id) => {
              const key = EXAMPLE_KEYS[id];
              const active = id === tab;
              return (
                <div
                  key={id}
                  className={`orch-showcase-copy${active ? " is-active" : ""}`}
                  aria-hidden={active ? undefined : true}
                >
                  <div className="ws-workflow-desc ws-workflow-desc--lead">
                    <h3
                      ref={active ? panelTitleRef : undefined}
                      tabIndex={active ? -1 : undefined}
                      className="ws-orchestration-panel-title"
                    >
                      {t(`${key}.title`)}
                    </h3>
                    <p className="ws-workflow-desc-text">{t(`${key}.desc`)}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {/* All diagrams stay mounted and cross-fade. Remounting the SVG and
              nodes on every switch caused a visible ~100ms hitch. */}
          <div className="ws-orchestration-stage orch-showcase-stack">
            {VISIBLE_TABS.map((id) => (
              <div
                key={id}
                className={`orch-showcase-layer${id === tab ? " is-active" : ""}`}
                aria-hidden={id === tab ? undefined : true}
              >
                <WelcomeOrchestrationDiagramLazy
                  tab={id}
                  t={t}
                  videoAgentLabels={videoAgentLabels}
                  consensusOutputLabels={consensusOutputLabels}
                />
              </div>
            ))}
          </div>
          <ol className="orch-showcase-route" aria-label={title}>
            {routeSteps.map((step, index) => (
              <li key={`${tab}-${step.title}`}>
                <span>{index + 1}</span>
                <strong>{step.title}</strong>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
};

export default OrchestrationShowcase;
