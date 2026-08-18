import { describe, expect, it } from "bun:test";
import { normalizeHost } from "./normalizeHost";

describe("normalizeHost pure seam", () => {
  it("returns empty for nullish/blank input", () => {
    expect(normalizeHost(undefined)).toBe("");
    expect(normalizeHost(null)).toBe("");
    expect(normalizeHost("")).toBe("");
    expect(normalizeHost("   ")).toBe("");
  });

  it("lowercases and strips port / path", () => {
    expect(normalizeHost("Nolo.Chat")).toBe("nolo.chat");
    expect(normalizeHost("us.nolo.chat:443")).toBe("us.nolo.chat");
    expect(normalizeHost("example.com/path")).toBe("example.com");
    expect(normalizeHost("Example.COM:8080/foo")).toBe("example.com");
  });

  it("unwraps IPv6 bracket hosts without keeping the port suffix", () => {
    expect(normalizeHost("[::1]")).toBe("::1");
    expect(normalizeHost("[::1]:38123")).toBe("::1");
    expect(normalizeHost("  [::FFFF:127.0.0.1]  ")).toBe("::ffff:127.0.0.1");
  });

  it("preserves plain hostnames and loopback literals", () => {
    expect(normalizeHost("localhost")).toBe("localhost");
    expect(normalizeHost("127.0.0.1")).toBe("127.0.0.1");
    expect(normalizeHost("app.example.co.uk")).toBe("app.example.co.uk");
  });
});
