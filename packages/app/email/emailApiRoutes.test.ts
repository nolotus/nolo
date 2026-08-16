import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";
import { authRoutes } from "auth/routes";
import {
  EMAIL_ADMIN_ENDPOINTS,
  USER_EMAIL_PREFERENCE_ENDPOINTS,
} from "./emailApiRoutes";

describe("email frontend wiring", () => {
  it("email API route constants should map to auth routes", () => {
    expect(EMAIL_ADMIN_ENDPOINTS.report).toBe(authRoutes.users.emailReport);
    expect(EMAIL_ADMIN_ENDPOINTS.retryRun).toBe(authRoutes.users.emailRetryRun);
    expect(EMAIL_ADMIN_ENDPOINTS.replayFailures).toBe(
      authRoutes.users.emailReplayFailures
    );
    expect(EMAIL_ADMIN_ENDPOINTS.configUpdate).toBe(authRoutes.users.emailConfigUpdate);
    expect(EMAIL_ADMIN_ENDPOINTS.sendEmail).toBe(authRoutes.users.sendEmail);
    expect(USER_EMAIL_PREFERENCE_ENDPOINTS.get).toBe(authRoutes.users.emailPreferencesGet);
    expect(USER_EMAIL_PREFERENCE_ENDPOINTS.update).toBe(
      authRoutes.users.emailPreferencesUpdate
    );
  });

  it("web routes should expose email admin alias and profile paths", async () => {
    const [webRoutes, settingRoutes, lifeRoutes, adminPages] = await Promise.all([
      readFile("packages/app/web/routes.tsx", "utf8"),
      readFile("packages/app/settings/routes.tsx", "utf8"),
      readFile("packages/life/routes.tsx", "utf8"),
      readFile("packages/app/admin/adminPages.ts", "utf8"),
    ]);

    expect(webRoutes).toContain('path: "admin/email"');
    expect(webRoutes).toContain('path: "dev/email-e2e"');
    expect(webRoutes).toContain("settingRoutes");
    expect(settingRoutes).toContain("SettingRoutePaths.SETTING_ACCOUNT");
    expect(adminPages).toContain('email: "/life/users/email"');
    expect(adminPages).toContain('providerHealth: "/life/users/provider-health"');
    expect(lifeRoutes).toContain("ADMIN_PAGE_PATHS.users");
    expect(lifeRoutes).toContain("ADMIN_PAGE_PATHS.email");
    expect(lifeRoutes).toContain("ADMIN_PAGE_PATHS.providerHealth");
  });
});
