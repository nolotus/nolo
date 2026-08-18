import { afterEach, describe, expect, it } from "bun:test";
import {
  cardIconViewTransitionName,
  cardSurfaceViewTransitionName,
  cardTitleViewTransitionName,
  cardViewTransitionStyles,
  enableNextRouteViewTransition,
  isAgentDetailPath,
  isAgentPlazaPath,
  prefersReducedMotion,
  QUICK_CHAT_COMPOSER_VT_NAME,
  resetPrefersReducedMotionCacheForTests,
  sanitizeViewTransitionKey,
  shouldAutoRouteViewTransition,
  viewTransitionStyle,
} from "./viewTransitions";

afterEach(() => {
  resetPrefersReducedMotionCacheForTests();
  if (typeof document !== "undefined") {
    delete document.documentElement.dataset.noloRouteViewTransition;
  }
});

describe("View Transition naming helpers", () => {
  it("keeps card icon and title names stable for clean keys", () => {
    expect(QUICK_CHAT_COMPOSER_VT_NAME).toBe("quick-chat-composer");
    expect(cardIconViewTransitionName("agent-123")).toBe("card-icon-agent-123");
    expect(cardTitleViewTransitionName("agent-123")).toBe("card-title-agent-123");
    expect(cardSurfaceViewTransitionName("agent-123")).toBe(
      "card-surface-agent-123"
    );
  });

  it("detects plaza ↔ agent detail pairs for reverse Back VT", () => {
    expect(isAgentDetailPath("/agent-pub-01ABC")).toBe(true);
    expect(isAgentPlazaPath("/explore")).toBe(true);
    expect(isAgentPlazaPath("/")).toBe(true);
    expect(shouldAutoRouteViewTransition("/explore", "/agent-pub-01ABC")).toBe(
      true
    );
    expect(shouldAutoRouteViewTransition("/agent-pub-01ABC", "/explore")).toBe(
      true
    );
    expect(shouldAutoRouteViewTransition("/pricing", "/explore")).toBe(false);
  });

  it("sanitizes keys to CSS custom-ident safe fragments", () => {
    expect(sanitizeViewTransitionKey("dialog/user:1")).toBe("dialog-user-1");
    expect(cardIconViewTransitionName("dialog/user:1")).toBe(
      "card-icon-dialog-user-1"
    );
    expect(cardTitleViewTransitionName("page user 1")).toBe(
      "card-title-page-user-1"
    );
  });

  it("returns empty name (no style) for empty keys", () => {
    expect(sanitizeViewTransitionKey("")).toBe("");
    expect(cardIconViewTransitionName("")).toBe("");
    expect(cardTitleViewTransitionName("   ")).toBe("");
    expect(viewTransitionStyle(cardIconViewTransitionName(""))).toBeUndefined();
  });

  it("builds a React style object only when a name exists", () => {
    expect(viewTransitionStyle("card-icon-agent-123")).toEqual({
      viewTransitionName: "card-icon-agent-123",
    });
    expect(viewTransitionStyle(null)).toBeUndefined();
    expect(viewTransitionStyle("")).toBeUndefined();
  });

  it("honors enabled:false so inactive/selection rows skip participation", () => {
    expect(
      viewTransitionStyle("card-icon-agent-123", { enabled: false })
    ).toBeUndefined();
    expect(cardViewTransitionStyles("agent-123", { enabled: false })).toEqual(
      {}
    );
  });

  it("returns matching icon/title styles for the same content key", () => {
    const styles = cardViewTransitionStyles("page-user-a-1");
    expect(styles.icon).toEqual({
      viewTransitionName: "card-icon-page-user-a-1",
    });
    expect(styles.title).toEqual({
      viewTransitionName: "card-title-page-user-a-1",
    });
  });

  it("omits styles when prefers-reduced-motion is active", () => {
    const g = globalThis as typeof globalThis & {
      window?: Window & typeof globalThis;
      matchMedia?: typeof matchMedia;
    };
    const previousWindow = g.window;
    const mockMatchMedia = ((query: string) =>
      ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() {
          return false;
        },
      })) as typeof matchMedia;

    g.window = {
      matchMedia: mockMatchMedia,
    } as Window & typeof globalThis;

    resetPrefersReducedMotionCacheForTests();
    expect(prefersReducedMotion()).toBe(true);
    expect(viewTransitionStyle("card-icon-agent-123")).toBeUndefined();
    expect(cardViewTransitionStyles("agent-123")).toEqual({});

    if (previousWindow === undefined) {
      delete (g as any).window;
    } else {
      g.window = previousWindow;
    }
    resetPrefersReducedMotionCacheForTests();
  });

  it("opts the next SPA route update into startViewTransition when supported", () => {
    if (typeof document === "undefined") return;

    const doc = document as Document & {
      startViewTransition?: any;
    };
    const previous = doc.startViewTransition;
    doc.startViewTransition = () => ({});

    enableNextRouteViewTransition();
    // Flag stays set until the router clears it on transition.finished —
    // clearing on microtask would drop scoped VT CSS mid-morph.
    expect(document.documentElement.dataset.noloRouteViewTransition).toBe("1");

    if (previous === undefined) {
      delete (doc as any).startViewTransition;
    } else {
      doc.startViewTransition = previous;
    }
  });
});
