import { describe, expect, it } from "bun:test";
import {
  canPathHostChatSidebarHome,
  shouldRenderChatSidebar,
  shouldShowTopbarHomeButton,
} from "./mainLayoutSidebar";

describe("main layout sidebar visibility", () => {
  it("keeps chat sidebar hidden until mount on all-view routes", () => {
    expect(
      shouldRenderChatSidebar({
        isLoggedIn: true,
        hasMounted: false,
        useAllViewSidebar: true,
        isLifeRoute: false,
        isDesktopApp: false,
      })
    ).toBe(false);
  });

  it("shows all-view routes after mount for logged-in users", () => {
    expect(
      shouldRenderChatSidebar({
        isLoggedIn: true,
        hasMounted: true,
        useAllViewSidebar: true,
        isLifeRoute: false,
        isDesktopApp: false,
      })
    ).toBe(true);
  });

  it("keeps life routes on the dedicated life sidebar", () => {
    expect(
      shouldRenderChatSidebar({
        isLoggedIn: true,
        hasMounted: true,
        useAllViewSidebar: false,
        isLifeRoute: true,
        isDesktopApp: false,
      })
    ).toBe(false);
  });

  it("keeps dialog routes hidden until mount to avoid auth hydration mismatch", () => {
    expect(
      shouldRenderChatSidebar({
        isLoggedIn: true,
        hasMounted: false,
        useAllViewSidebar: false,
        isLifeRoute: false,
        isDesktopApp: false,
      })
    ).toBe(false);
  });

  it("shows dialog routes after mount for logged-in users", () => {
    expect(
      shouldRenderChatSidebar({
        isLoggedIn: true,
        hasMounted: true,
        useAllViewSidebar: false,
        isLifeRoute: false,
        isDesktopApp: false,
      })
    ).toBe(true);
  });

  it("still hides the sidebar for logged-out users on web", () => {
    expect(
      shouldRenderChatSidebar({
        isLoggedIn: false,
        hasMounted: true,
        useAllViewSidebar: false,
        isLifeRoute: false,
        isDesktopApp: false,
      })
    ).toBe(false);
  });

  it("shows the sidebar for logged-out users on desktop (local-first)", () => {
    expect(
      shouldRenderChatSidebar({
        isLoggedIn: false,
        hasMounted: true,
        useAllViewSidebar: true,
        isLifeRoute: false,
        isDesktopApp: true,
      })
    ).toBe(true);
  });

  it("hides the sidebar on profile routes for logged-in users", () => {
    expect(
      shouldRenderChatSidebar({
        isLoggedIn: true,
        hasMounted: true,
        useAllViewSidebar: false,
        isLifeRoute: false,
        pathname: "/profile/0e95801d90",
        isDesktopApp: false,
      })
    ).toBe(false);
  });

  it("hides the sidebar on community share routes for logged-in users", () => {
    expect(
      shouldRenderChatSidebar({
        isLoggedIn: true,
        hasMounted: true,
        useAllViewSidebar: false,
        isLifeRoute: false,
        pathname: "/share/community",
        isDesktopApp: false,
      })
    ).toBe(false);
  });

  it("keeps the sidebar on explore routes so the plaza nav row stays in place", () => {
    expect(
      shouldRenderChatSidebar({
        isLoggedIn: true,
        hasMounted: true,
        useAllViewSidebar: false,
        isLifeRoute: false,
        pathname: "/explore",
        isDesktopApp: false,
      })
    ).toBe(true);
  });

  it("still hides life routes for logged-out desktop users", () => {
    expect(
      shouldRenderChatSidebar({
        isLoggedIn: false,
        hasMounted: true,
        useAllViewSidebar: false,
        isLifeRoute: true,
        isDesktopApp: true,
      })
    ).toBe(false);
  });
});

describe("canPathHostChatSidebarHome", () => {
  it("is true for workspace / space / content paths", () => {
    expect(canPathHostChatSidebarHome("/")).toBe(true);
    expect(canPathHostChatSidebarHome("/favorites")).toBe(true);
    expect(canPathHostChatSidebarHome("/space/abc")).toBe(true);
  });

  it("is false for life and other no-chat-sidebar paths", () => {
    expect(canPathHostChatSidebarHome("/life")).toBe(false);
    expect(canPathHostChatSidebarHome("/life/usage")).toBe(false);
    expect(canPathHostChatSidebarHome("/profile")).toBe(false);
    expect(canPathHostChatSidebarHome("/recharge")).toBe(false);
    expect(canPathHostChatSidebarHome("/share/community")).toBe(false);
  });
});

describe("shouldShowTopbarHomeButton", () => {
  // Helper retained for path classification; TopBar currently always shows Home.
  it("classifies life vs workspace paths after mount", () => {
    expect(
      shouldShowTopbarHomeButton({ pathname: "/life", hasMounted: false }),
    ).toBe(false);
    expect(
      shouldShowTopbarHomeButton({ pathname: "/life", hasMounted: true }),
    ).toBe(true);
    expect(
      shouldShowTopbarHomeButton({ pathname: "/", hasMounted: true }),
    ).toBe(false);
  });
});
