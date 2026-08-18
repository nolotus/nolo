export type OrchestrationDemoTab = "coding" | "brainstorm" | "consensus" | "video";

const VALID_DEMO_TABS = new Set<OrchestrationDemoTab>([
  "coding",
  "brainstorm",
  "consensus",
  "video",
]);

export function isOrchestrationDemoTab(value: string | null | undefined): value is OrchestrationDemoTab {
  return !!value && VALID_DEMO_TABS.has(value as OrchestrationDemoTab);
}

export function readOrchestrationTabFromSearch(search: string): OrchestrationDemoTab | null {
  const demo = new URLSearchParams(search).get("demo");
  return isOrchestrationDemoTab(demo) ? demo : null;
}

export function writeOrchestrationTabToUrl(tab: OrchestrationDemoTab) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("demo", tab);
  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}