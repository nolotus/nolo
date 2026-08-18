import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("privacy policy route source contract", () => {
  it("registers the lazy privacy policy page route", () => {
    const source = readFileSync(join(import.meta.dir, "routes.tsx"), "utf8");
    expect(source).toContain('const PrivacyPolicyPage = lazy(() => import("app/pages/PrivacyPolicyPage"))');
    expect(source).toContain('path: "privacy"');
    expect(source).toContain('withSuspense(<PrivacyPolicyPage />, "隐私政策")');
  });

  it("registers the lazy terms of service page route", () => {
    const source = readFileSync(join(import.meta.dir, "routes.tsx"), "utf8");
    expect(source).toContain('const TermsOfServicePage = lazy(() => import("app/pages/TermsOfServicePage"))');
    expect(source).toContain('path: "terms"');
    expect(source).toContain('withSuspense(<TermsOfServicePage />, "服务条款")');
  });
});
