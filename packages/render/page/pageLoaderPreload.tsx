import React, { Suspense, use } from "react";
import { useLocation, useParams } from "app/routing";
import { getQuickChatFirstMessageText } from "chat/dialog/dialogPageRenderMode";
import DialogEntrySkeleton from "./DialogEntrySkeleton";

type PageModule = { default: React.ComponentType };

export function createPreloadablePage(importPage: () => Promise<PageModule>) {
  let ready: PageModule["default"] | undefined;
  let pending: Promise<PageModule> | undefined;
  const preload = () => {
    pending ??= importPage().then((module) => {
      ready = module.default;
      return module;
    }).catch((error) => {
      pending = undefined;
      throw error;
    });
    return pending;
  };
  function Page() {
    // Always render the same component type, whether the import was already
    // warm or this render had to suspend for it.
    const Content = ready ?? use(preload()).default;
    return <Content />;
  }
  return { preload, Page, isReady: () => ready !== undefined };
}

const pageLoader = createPreloadablePage(() => import("./PageLoader"));
export const preloadPageLoader = pageLoader.preload;

export const prewarmPageLoader = () => {
  void preloadPageLoader().catch(() => {});
};

export async function waitForPageLoader(budgetMs = 200) {
  if (pageLoader.isReady()) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      preloadPageLoader().catch(() => {}),
      new Promise<void>((resolve) => { timer = setTimeout(resolve, budgetMs); }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export default function PreloadedPageLoader() {
  const { pageKey } = useParams<"pageKey">();
  const { state } = useLocation();
  // Avoid React.lazy's first-render suspension if the tier-two import is ready.
  const PageLoader = pageLoader.Page;
  const content = <PageLoader />;
  if (pageKey?.startsWith("dialog-") && getQuickChatFirstMessageText(state)) {
    // A slow bundle must not keep a submitted composer disabled indefinitely.
    return <Suspense fallback={<DialogEntrySkeleton />}>{content}</Suspense>;
  }
  return content;
}
