import { describe, expect, it } from "bun:test";
import { resolveLegacySettingsRedirectPath } from "./legacySettingsPath";

describe("resolveLegacySettingsRedirectPath", () => {
  it("maps legacy settings URLs to canonical settings URLs", () => {
    expect(
      resolveLegacySettingsRedirectPath(
        new URL("https://nolo.test/setting/security?tab=password#section"),
      ),
    ).toBe("/settings/security?tab=password#section");
  });

  it("does not redirect canonical or unrelated URLs", () => {
    expect(resolveLegacySettingsRedirectPath(new URL("https://nolo.test/settings/security"))).toBeNull();
    expect(resolveLegacySettingsRedirectPath(new URL("https://nolo.test/settingish/security"))).toBeNull();
  });
});
