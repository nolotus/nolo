import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const homeSource = readFileSync(join(import.meta.dir, "Home.tsx"), "utf8");
const homeCss = readFileSync(join(import.meta.dir, "Home.css"), "utf8");
const homeStylesSource = readFileSync(join(import.meta.dir, "HomeStyles.ts"), "utf8");
const welcomeSource = readFileSync(join(import.meta.dir, "WelcomeSection.tsx"), "utf8");
const diagramSource = readFileSync(join(import.meta.dir, "WelcomeOrchestrationDiagram.tsx"), "utf8");
const welcomeCss = [
  "WelcomeSection.css",
  "WelcomeSection.hero.css",
  "WelcomeSection.orchestration.css",
]
  .map((file) => readFileSync(join(import.meta.dir, file), "utf8"))
  .join("\n");
const homeMotionCss = readFileSync(join(import.meta.dir, "home-motion.css"), "utf8");
const tabStateSource = readFileSync(join(import.meta.dir, "welcomeOrchestrationTabState.ts"), "utf8");
const publicAgentsPreviewSource = readFileSync(
  join(import.meta.dir, "..", "..", "ai", "agent", "web", "PublicAgentsPreview.tsx"),
  "utf8"
);

describe("Home source contract", () => {
  it("renders the guest welcome section before mount to avoid CLS", () => {
    expect(homeSource).not.toContain("home-auth-placeholder");
    // 布局根经 withLiteralClass 保留 hook 类名（home-motion.css 依赖 .home-layout）。
    expect(homeSource).toContain('`home-layout ${showAuthedHome ? "home-layout--authed" : "home-layout--guest"}`');
    expect(homeSource).toContain("showAuthedHome ? (");
    expect(homeSource).toContain("<WelcomeSection />");
    expect(homeSource).not.toContain("<WelcomeSection />\n            )}\n          </section>");
  });

  it("routes desktop first-run to Agent-first onboarding without changing public WelcomeSection", () => {
    expect(homeSource).toContain('import { getIsDesktopApp } from "app/utils/env"');
    expect(homeSource).toContain("import DesktopAgentOnboarding from \"./DesktopAgentOnboarding\"");
    expect(homeSource).toContain("showDesktopOnboarding");
    expect(homeSource).toContain("const isDesktopApp = getIsDesktopApp();");
    expect(homeSource).toContain("isDesktopApp && !showAuthedHome && !onboardingDismissed");
    expect(homeSource).toContain(
      "<DesktopAgentOnboarding onDismiss={handleDismissOnboarding} />"
    );
    expect(homeSource).toContain("showDesktopOnboarding ? (");
    // Device-local durable dismiss via shared local-first helper (not session-only).
    expect(homeSource).toContain(
      'from "app/localFirst/onboardingDismissed"'
    );
    expect(homeSource).toContain("readLocalFirstOnboardingDismissed");
    expect(homeSource).toContain("writeLocalFirstOnboardingDismissed");
    expect(homeSource).toContain(
      "readLocalFirstOnboardingDismissed(window.localStorage)"
    );
    expect(homeSource).toContain(
      "writeLocalFirstOnboardingDismissed(window.localStorage, true)"
    );
    // Desktop never falls back to the public marketing page; only non-desktop guests do.
    expect(homeSource).toContain("isDesktopApp ? null : (\n                <WelcomeSection />\n              )}");
    // Hard ban: do not rewrite WelcomeSection marketing entry from Home
    expect(homeSource).not.toContain("WelcomeSection marketing");
  });

  it("keeps the guest welcome hero proof and conversion surfaces wired", () => {
    expect(welcomeSource).toContain('className="ws-page"');
    expect(welcomeSource).toContain('className="ws-hero-highlights"');
    expect(welcomeSource).toContain("welcomeSection.highlights.customize");
    expect(welcomeSource).toContain("welcomeSection.highlights.orchestrate");
    expect(welcomeSource).toContain("welcomeSection.heroTitle");
    expect(welcomeSource).not.toContain("ws-proof-bar");
    expect(welcomeSource).not.toContain("<KimiMono size={18} />");
    expect(welcomeSource).toContain("ws-bottom-cta ws-final-cta");
    expect(welcomeSource).toContain("welcomeSection.finalCta.primary");
    expect(welcomeSource).not.toContain("welcomeSection.finalCta.secondary");
    expect(welcomeSource).toContain("welcomeSection.output.types");
    expect(welcomeSource).not.toContain('className="ws-output-section"');
    expect(welcomeSource).toContain('className="ws-deliverables');
    expect(welcomeSource).toContain("ws-builder-bridge");
    expect(welcomeSource).toContain("welcomeSection.builder.capabilities");
    expect(welcomeSource).toContain("welcomeSection.builder.cta");
    expect(welcomeCss).toContain(".ws-hero-highlights");
    expect(welcomeCss).toContain(".wf-mobile-steps");
    expect(welcomeCss).toContain(".wf-stage-mobile");
    expect(welcomeCss).toContain(".ws-reveal");
    expect(welcomeCss).toContain(".ws-gradient-text");
    expect(welcomeCss).toContain("[data-theme=\"dark\"] .ws-gradient-text");
    expect(welcomeCss).toContain("background-clip: text");
    expect(welcomeCss).toContain(".ws-faq-accordion");
    expect(welcomeCss).toContain("content-visibility: auto");
    expect(homeMotionCss).toContain("--home-motion-duration");
  });

  it("keeps guest welcome orchestration examples wired", () => {
    expect(welcomeSource).not.toContain('className="ws-cards-section"');
    expect(welcomeSource).not.toContain("welcomeSection.cards.create.title");
    expect(welcomeSource).not.toContain("ws-bloom-container");
    expect(welcomeSource).not.toContain("ws-builder-section");
    expect(welcomeSource).not.toContain('usePageArt("home")');
    expect(welcomeSource).not.toContain('className="ws-hero-wash"');
    expect(welcomeSource).toContain("WelcomeOrchestrationDiagramLazy");
    expect(welcomeSource).toContain("WelcomeFaqAccordion");
    expect(welcomeSource).toContain("setSearchParams");
    expect(welcomeSource).toContain('next.set("demo", nextTab)');
    expect(welcomeSource).toContain('import "./home-motion.css"');
    expect(tabStateSource).toContain('url.searchParams.set("demo", tab)');
    expect(welcomeSource).not.toContain("ws-card-context");
    expect(welcomeSource).not.toContain("WELCOME_ORCHESTRATOR_AGENT_KEYS");
    expect(welcomeSource).not.toContain("ws-card-council");
    expect(welcomeSource).toContain('className="ws-orchestration-section"');
    expect(welcomeSource).toContain('import TabsNav from "render/web/ui/TabsNav"');
    expect(welcomeSource).toContain('className="ws-orchestration-tabs"');
    expect(welcomeSource).toContain("orchestrationTabs");
    expect(welcomeSource).not.toContain("ws-orchestration-tab is-active");
    expect(welcomeSource).toContain("welcomeSection.orchestration.tabs.coding");
    expect(welcomeSource).toContain("welcomeSection.orchestration.tabs.brainstorm");
    expect(welcomeSource).toContain("welcomeSection.orchestration.tabs.consensus");
    expect(welcomeSource).toContain("welcomeSection.orchestration.tabs.video");
    expect(welcomeSource).toContain("welcomeSection.showcaseVideo.mobileSteps");
    expect(welcomeSource).toContain("welcomeSection.showcaseVideo.agentLabels");
    expect(welcomeSource).toContain("welcomeSection.showcaseBrainstorm.mobileSteps");
    expect(welcomeSource).toContain("welcomeSection.showcaseConsensus.mobileSteps");
    expect(welcomeSource).toContain("welcomeSection.faq.orchestration.question");
    expect(welcomeSource).toContain('className="ws-orchestration-tab-body"');
    expect(welcomeSource).toContain('className="ws-orchestration-stage"');
    expect(welcomeSource).toContain("panelId={orchestrationPanelId}");
    expect(diagramSource).toContain('stageModifier: "video"');
    expect(diagramSource).toContain('stageModifier: "brainstorm"');
    expect(diagramSource).toContain('stageModifier: "consensus"');
    expect(welcomeCss).toContain(".ws-section--editorial");
    expect(welcomeCss).toContain(".ws-orchestration-tabs");
    expect(welcomeCss).toContain('[data-theme="dark"] .ws-orchestration-tabs .tabs::after');
    expect(welcomeCss).toContain(".ws-orchestration-tab-body");
    expect(welcomeCss).toContain(".ws-orchestration-stage");
    expect(welcomeCss).toContain(".ws-orchestration-brief");
    expect(welcomeCss).toContain(".wf-stage-tech--brainstorm");
    expect(welcomeCss).toContain(".wf-stage-tech--consensus");
    expect(welcomeCss).toContain(".wf-stage-tech--video");
    expect(welcomeCss).toContain("@keyframes flow-orch-dispatch");
    expect(welcomeCss).not.toContain(".ws-output-section");
  });

  it("keeps guest hero CTAs to start, client download, and public-agent browse", () => {
    expect(welcomeSource).toContain('className="ws-cta-main"');
    expect(welcomeSource).toContain('to="/signup"');
    expect(welcomeSource).toContain('t("downloadClient", "下载客户端")');
    expect(welcomeSource).not.toContain("welcomeSection.secondaryPricing");
    expect(welcomeSource).toContain('to="/downloads"');
    expect(welcomeSource).not.toContain('className="ws-proof-models"');
    expect(welcomeSource).not.toContain('to="/pricing"');
  });

  it("keeps below-the-fold community panes out of the initial home bundle", () => {
    expect(homeSource).toContain('const PublicAgentsPreview = lazy(() => import("ai/agent/web/PublicAgentsPreview"))');
    expect(homeSource).not.toContain('import("ai/agent/web/PublicAgents")');
    expect(homeSource).toContain('const ShareCommunityPreview = lazy(() => import("./ShareCommunityPreview"))');
    expect(homeSource).toContain("<HomePaneSkeleton />");
    expect(homeCss).toContain(".activity-pane");
    expect(homeCss).toContain("home-activity-pane-in");
    expect(homeStylesSource).toContain("homeSkeleton:");
    expect(homeStylesSource).toContain("homePlazaBridge:");
    expect(homeStylesSource).toContain("homePlazaBridgeKicker:");
    expect(homeSource).toContain('id="ai-plaza-section"');
    expect(homeStylesSource).toContain("scrollMarginTop");
    expect(homeSource).toContain('import "./home-motion.css"');
    expect(welcomeCss).toContain(".wf-diagram-skeleton");
    expect(welcomeCss).toContain(".wf-stage-mobile-canvas");
    expect(welcomeCss).toContain(".wf-node-tech--mobile");
  });

  it("reads SSR public agents from the module store hook, not Redux", () => {
    // Wave5: agentSlice.pubAgents 剥叶为 publicAgentsSSRStore + ALS。
    expect(homeSource).toContain(
      'import { useSSRPublicAgents } from "ai/agent/publicAgentsSSRStore"'
    );
    expect(homeSource).toContain("const homePublicAgents = useSSRPublicAgents();");
    expect(homeSource).not.toContain("selectSSRPublicAgents");
    expect(homeSource).not.toContain('from "ai/agent/agentSlice"');
  });

  it("gives the logged-in quick chat a dedicated primary action surface", () => {
    const quickChatCss = readFileSync(join(import.meta.dir, "QuickChat.css"), "utf8");

    expect(homeSource).toContain('"home-primary-chat"');
    expect(homeSource).toContain('<QuickChat surface="home-primary" isEmptyState={isEmptyState} />');
    // Global Home must remain on home-primary, not the Space Home compact surface.
    expect(homeSource).not.toContain('surface="space-home-compact"');
    expect(homeCss).toContain(".home-primary-chat");
    expect(homeCss).toContain("home-surface-in");
    expect(homeStylesSource).toContain("homePrimaryChat:");
    expect(homeStylesSource).toContain("homePrimaryChatInShell:");
    expect(homeStylesSource).toContain('backgroundColor: "transparent"');
    expect(homeStylesSource).toContain('boxShadow: "none"');
    expect(quickChatCss).not.toContain("--quick-chat-primary-shadow");
    expect(quickChatCss).toContain("/* Home primary keeps the shell clean; focus supplies the affordance. */");
    expect(quickChatCss).toContain(".quick-chat-container[data-surface=\"home-primary\"]");
  });
  it("keeps logged-in hero focused on quick chat without home action cards", () => {
    expect(homeSource).not.toContain("HomeActions");
    expect(homeSource).not.toContain("actions-section");
    expect(homeCss).not.toContain(".actions-section");
  });

  it("anchors bottom chat shell to the viewport bottom using flex layout and sticky fallback", () => {
    expect(homeStylesSource).toContain("homeLayoutAuthed:");
    expect(homeStylesSource).toContain("homeBottomChatShell:");
    expect(homeStylesSource).toContain('marginTop: "auto"');
    expect(homeStylesSource).toContain('position: "sticky"');
  });

  it("shows a one-time customize tip for home widgets and drops the edit done callback", () => {
    expect(homeSource).toContain("home-widgets-customize-tip-v1");
    expect(homeSource).toContain("home-widgets-tip");
    expect(homeSource).toContain("dismissWidgetsTip");
    expect(homeSource).not.toContain("onDone");
    expect(homeCss).toContain(".home-widgets-tip");
  });

  it("refreshes the SSR public-agent preview on the client", () => {
    expect(publicAgentsPreviewSource).toContain('import { usePublicAgents } from "ai/agent/hooks/usePublicAgents"');
    expect(publicAgentsPreviewSource).toContain("initialData: data");
    expect(publicAgentsPreviewSource).toContain('reloadMode: "catalog"');
    expect(publicAgentsPreviewSource).toContain("summary: true");
  });
});
