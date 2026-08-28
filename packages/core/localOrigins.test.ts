import { describe, expect, it } from "bun:test";
import {
  isLocalServerUrl,
  isLoopbackHostname,
  isLoopbackUrl,
  LOCAL_SERVER_URL_PATTERN,
  LOOPBACK_HOSTNAMES,
  normalizeOrigin,
} from "./localOrigins";

describe("isLoopbackHostname pure seam", () => {
  it("accepts canonical loopback hostnames case-insensitively", () => {
    expect(isLoopbackHostname("127.0.0.1")).toBe(true);
    expect(isLoopbackHostname("localhost")).toBe(true);
    expect(isLoopbackHostname("LOCALHOST")).toBe(true);
    expect(isLoopbackHostname("::1")).toBe(true);
    expect(isLoopbackHostname("[::1]")).toBe(true);
    expect(isLoopbackHostname("  ::1  ")).toBe(true);
  });

  it("rejects non-loopback and non-string hosts", () => {
    expect(isLoopbackHostname("nolo.chat")).toBe(false);
    expect(isLoopbackHostname("nolotus.local")).toBe(false);
    expect(isLoopbackHostname("")).toBe(false);
    expect(isLoopbackHostname("   ")).toBe(false);
    expect(isLoopbackHostname(null)).toBe(false);
    expect(isLoopbackHostname(undefined)).toBe(false);
    expect(isLoopbackHostname(42)).toBe(false);
  });

  it("keeps the shared hostname set aligned with the pure helper", () => {
    for (const host of LOOPBACK_HOSTNAMES) {
      expect(isLoopbackHostname(host)).toBe(true);
    }
  });
});

describe("isLoopbackUrl pure seam", () => {
  it("detects loopback http/https origins", () => {
    expect(isLoopbackUrl("http://127.0.0.1:38123")).toBe(true);
    expect(isLoopbackUrl("http://localhost:8080/v1")).toBe(true);
    expect(isLoopbackUrl("http://[::1]:8080")).toBe(true);
  });

  it("rejects remote, empty, and invalid URLs", () => {
    expect(isLoopbackUrl("https://api.openai.com/v1")).toBe(false);
    expect(isLoopbackUrl("")).toBe(false);
    expect(isLoopbackUrl("   ")).toBe(false);
    expect(isLoopbackUrl("not-a-url")).toBe(false);
    expect(isLoopbackUrl(null)).toBe(false);
    expect(isLoopbackUrl(undefined)).toBe(false);
  });
});

describe("normalizeOrigin", () => {
  it("trims trailing slashes", () => {
    expect(normalizeOrigin(" http://127.0.0.1:38123/ ")).toBe(
      "http://127.0.0.1:38123",
    );
  });
});

describe("isLocalServerUrl pure seam", () => {
  it("detects bare LAN, localhost, and nolotus.local origins", () => {
    expect(isLocalServerUrl("http://127.0.0.1:38123")).toBe(true);
    expect(isLocalServerUrl("http://localhost:8080")).toBe(true);
    expect(isLocalServerUrl("https://LOCALHOST")).toBe(true);
    expect(isLocalServerUrl("http://192.168.1.10:3000")).toBe(true);
    expect(isLocalServerUrl("http://10.0.0.5")).toBe(true);
    expect(isLocalServerUrl("http://nolotus.local")).toBe(true);
    expect(isLocalServerUrl("  http://127.0.0.1:38123  ")).toBe(true);
  });

  it("rejects remote, path-bearing, and non-string values", () => {
    expect(isLocalServerUrl("https://nolo.chat")).toBe(false);
    expect(isLocalServerUrl("https://us.nolo.chat")).toBe(false);
    expect(isLocalServerUrl("http://localhost:8080/v1")).toBe(false);
    expect(isLocalServerUrl("http://[::1]:8080")).toBe(false);
    expect(isLocalServerUrl("")).toBe(false);
    expect(isLocalServerUrl("   ")).toBe(false);
    expect(isLocalServerUrl(null)).toBe(false);
    expect(isLocalServerUrl(undefined)).toBe(false);
    expect(isLocalServerUrl(42)).toBe(false);
  });

  it("keeps the shared regex aligned with the pure helper", () => {
    expect(LOCAL_SERVER_URL_PATTERN.test("http://127.0.0.1:38123")).toBe(true);
    expect(LOCAL_SERVER_URL_PATTERN.test("https://nolo.chat")).toBe(false);
  });
});
