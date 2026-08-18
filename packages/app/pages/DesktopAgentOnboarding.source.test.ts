import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(import.meta.dir, "DesktopAgentOnboarding.tsx"),
  "utf8",
);
const css = readFileSync(
  join(import.meta.dir, "DesktopAgentOnboarding.css"),
  "utf8",
);

describe("DesktopAgentOnboarding source contract", () => {
  it("offers four cards: signup / login / membership / byo + skip", () => {
    expect(source).toContain("CREATE_LOCAL_AGENT");
    expect(source).toContain('to="/signup"');
    expect(source).toContain('to="/login"');
    expect(source).toContain("path=membership");
    expect(source).toContain("path=byo");
    expect(source).not.toContain("path=free");
    expect(source).not.toContain("path=pure_api");
    expect(source).toContain('data-testid="desktop-onboarding-signup"');
    expect(source).toContain('data-testid="desktop-onboarding-login"');
    expect(source).toContain('data-testid="desktop-onboarding-path-membership"');
    expect(source).toContain('data-testid="desktop-onboarding-path-byo"');
    expect(source).toContain('data-testid="desktop-onboarding-skip"');
    expect(source).toContain("注册即用（送额度）");
    expect(source).toContain("已有 Nolo 账号 · 登录");
    expect(source).toContain("我在用某家 AI 会员/订阅");
    expect(source).toContain("我有 API Key / 本地模型");
    expect(source).toContain("怎么开始？");
  });

  it("dismiss reason enum is skip | login | signup | path-byo | path-membership", () => {
    expect(source).toContain('"skip"');
    expect(source).toContain('"login"');
    expect(source).toContain('"signup"');
    expect(source).toContain('"path-byo"');
    expect(source).toContain('"path-membership"');
    expect(source).not.toContain("path-free");
    expect(source).not.toContain("path-pure_api");
    expect(source).toContain("DesktopOnboardingDismissReason");
    expect(source).toContain("onDismiss");
    expect(source).toContain("desktop-agent-onboarding__description");
    expect(source).toContain("desktop-agent-onboarding__option-hint");
    expect(source).toContain("desktop-agent-onboarding__group-label");
    expect(source).not.toContain("desktop-agent-onboarding__bullets");
    expect(source).not.toContain("desktop-agent-onboarding__badge");
  });

  it("uses compact option list layout with group labels", () => {
    expect(css).toContain(".desktop-agent-onboarding__panel");
    expect(css).toContain(".desktop-agent-onboarding__options");
    expect(css).toContain(".desktop-agent-onboarding__option");
    expect(css).toContain(".desktop-agent-onboarding__group-label");
    expect(css).not.toContain(".desktop-agent-onboarding__sections");
    expect(css).not.toContain(".desktop-agent-onboarding__cta-row");
  });

  it("does not import or render public marketing welcome surfaces", () => {
    expect(source).not.toContain('from "./WelcomeSection"');
    expect(source).not.toContain("ws-page");
    expect(source).not.toContain("welcomeSection.");
  });
});
