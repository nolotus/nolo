import { describe, expect, it } from "bun:test";
import {
  createPlatformHostSet,
  DEFAULT_PLATFORM_HOSTS,
  isPlatformHost,
  STATIC_PLATFORM_HOSTS,
} from "./platformHost";

describe("isPlatformHost pure seam", () => {
  it("returns false for nullish/blank input", () => {
    expect(isPlatformHost(undefined)).toBe(false);
    expect(isPlatformHost(null)).toBe(false);
    expect(isPlatformHost("")).toBe(false);
    expect(isPlatformHost("   ")).toBe(false);
  });

  it("matches static apex and loopback hosts after normalizeHost", () => {
    expect(isPlatformHost("nolo.chat")).toBe(true);
    expect(isPlatformHost("us.nolo.chat")).toBe(true);
    expect(isPlatformHost("localhost")).toBe(true);
    expect(isPlatformHost("127.0.0.1")).toBe(true);
    // Host headers carry bracketed IPv6; normalizeHost unwraps to "::1" which
    // is in the closed set. Bare "::1" collapses under colon-split and is not
    // a Host-header shape, so it stays non-matching.
    expect(isPlatformHost("[::1]")).toBe(true);
    expect(isPlatformHost("[::1]:38123")).toBe(true);
    expect(isPlatformHost("Nolo.Chat")).toBe(true);
    expect(isPlatformHost("us.nolo.chat:443")).toBe(true);
    expect(isPlatformHost("  localhost  ")).toBe(true);
    expect(STATIC_PLATFORM_HOSTS).toContain("::1");
  });

  it("matches any *.nolo.chat subdomain even when not in the closed set", () => {
    expect(isPlatformHost("app.nolo.chat")).toBe(true);
    expect(isPlatformHost("preview-slot.us.nolo.chat")).toBe(true);
    expect(isPlatformHost("APP.Nolo.Chat")).toBe(true);
  });

  it("rejects unrelated hosts under the default allowlist", () => {
    expect(isPlatformHost("example.com")).toBe(false);
    expect(isPlatformHost("nolo.chat.evil.example")).toBe(false);
    expect(isPlatformHost("notnolo.chat")).toBe(false);
    expect(isPlatformHost("192.168.1.1")).toBe(false);
  });

  it("honors deployment extra hosts via createPlatformHostSet", () => {
    const hosts = createPlatformHostSet("Custom.Deploy.Example:443");
    expect(hosts.has("custom.deploy.example")).toBe(true);
    expect(isPlatformHost("custom.deploy.example", hosts)).toBe(true);
    expect(isPlatformHost("custom.deploy.example", DEFAULT_PLATFORM_HOSTS)).toBe(
      false,
    );
    // blank extra does not widen the set
    expect(createPlatformHostSet("   ").size).toBe(DEFAULT_PLATFORM_HOSTS.size);
  });
});
